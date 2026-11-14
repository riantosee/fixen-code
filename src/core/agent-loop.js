'use strict';

const ContextManager = require('./context');
const ReasoningEngine = require('./reasoning');

class AgentLoop {
  constructor({
    provider,
    toolRegistry,
    analyzer,
    planningEngine,
    sessionStore,
    checkpointManager = null,
    skillManager = null,
    options = {}
  }) {
    this.provider = provider;
    this.tools = toolRegistry;
    this.analyzer = analyzer;
    this.planning = planningEngine;
    this.session = sessionStore;
    this.checkpointManager = checkpointManager;
    this.skillManager = skillManager;
    this.reasoning = new ReasoningEngine();

    this.maxIterations = options.maxIterations || 25;
    this.mode = options.mode || 'auto';
    this.callbacks = {
      onStatus: options.onStatus || (() => {}),
      onToolStart: options.onToolStart || (() => {}),
      onToolEnd: options.onToolEnd || (() => {}),
      onMessage: options.onMessage || (() => {}),
      onPlan: options.onPlan || (() => {})
    };

    this.cancelled = false;
    this.history = [];
    this.consecutiveFailures = 0;
    this.recentToolSignatures = [];
  }

  cancel() {
    this.cancelled = true;
    if (this.checkpointManager && this.session) {
      this.checkpointManager.markInterrupted(this.session.getCurrentSession().id, 'Cancelled by user');
    }
  }

  isLooping(toolName, args) {
    const signature = `${toolName}:${JSON.stringify(args)}`;
    this.recentToolSignatures.push(signature);
    if (this.recentToolSignatures.length > 5) {
      this.recentToolSignatures.shift();
    }
    if (this.recentToolSignatures.length >= 3) {
      const last3 = this.recentToolSignatures.slice(-3);
      if (last3[0] === last3[1] && last3[1] === last3[2]) {
        return true;
      }
    }
    return false;
  }

  buildSystemPrompt(projectSummary) {
    const sections = [
      'You are FIXEN CODE, an advanced autonomous AI software engineering agent.',
      'Brand tagline: "Build Anything. Fix Everything."',
      '',
      'You solve software development tasks autonomously by inspecting the workspace, planning,',
      'modifying code, executing terminal commands, running tests, fixing errors, and verifying results.',
      '',
      'CORE RULES:',
      '1. NEVER claim a task is completed or succeeded without verifying it (run tests or inspect output).',
      '2. Read files first to understand structure before editing.',
      '3. When using edit_file, the target text must match the existing file character-by-character, including indentation.',
      '4. Prefer writing clean, minimal, working code (Shortest Working Diff).',
      '5. Respect workspace boundaries. All paths must be relative to the workspace.',
      '6. If a command or tool fails, diagnose the error and correct it.',
      '7. Be concise and report the exact files modified and verification results.',
      '',
      projectSummary
    ];

    if (this.skillManager) {
      const skillsPrompt = this.skillManager.getSkillsPrompt();
      if (skillsPrompt) {
        sections.push('', skillsPrompt);
      }
    }

    return sections.join('\n');
  }

  saveCheckpoint(iteration, task, plan, modifiedFiles, context) {
    if (!this.checkpointManager || !this.session) return;
    try {
      const sessionId = this.session.getCurrentSession().id;
      this.checkpointManager.saveCheckpoint(sessionId, {
        task,
        status: 'RUNNING',
        mode: this.mode,
        currentIteration: iteration,
        maxIterations: this.maxIterations,
        plan,
        modifiedFiles: Array.from(modifiedFiles),
        recentMessages: context ? context.messages.slice(-6) : []
      });
    } catch {}
  }

  async run(userTask) {
    this.cancelled = false;
    this.consecutiveFailures = 0;
    this.recentToolSignatures = [];

    this.callbacks.onStatus('UNDERSTAND REQUEST', `Task: "${userTask}"`);

    // 1. Inspect workspace
    this.callbacks.onStatus('INSPECT WORKSPACE', 'Scanning project architecture...');
    const projectSummary = this.analyzer.getArchitectureSummary();

    // 2. Create Plan
    this.callbacks.onStatus('CREATE PLAN', 'Decomposing task into milestones...');
    const plan = await this.planning.createPlan(userTask, projectSummary);
    this.callbacks.onPlan(plan);
    if (this.session) {
      this.session.setPlan(plan.steps || []);
    }

    if (this.mode === 'plan') {
      return {
        status: 'COMPLETED',
        mode: 'plan',
        plan,
        summary: this.planning.formatPlanMarkdown(plan)
      };
    }

    // Initialize context
    const context = new ContextManager({
      maxContextTokens: 24000,
      systemPrompt: this.buildSystemPrompt(projectSummary)
    });

    const userPrompt = [
      `User Request: ${userTask}`,
      '',
      'Execution Plan:',
      this.planning.formatPlanMarkdown(plan),
      '',
      'Begin by executing the first step using the appropriate tool.'
    ].join('\n');

    context.addMessage('user', userPrompt);
    if (this.session) {
      this.session.addMessage('user', userPrompt);
    }

    const modifiedFiles = new Set();
    this.saveCheckpoint(0, userTask, plan, modifiedFiles, context);

    return this.executeLoop({
      task: userTask,
      plan,
      context,
      startIteration: 0,
      modifiedFiles
    });
  }

  async resume(checkpoint) {
    this.cancelled = false;
    this.consecutiveFailures = 0;
    this.recentToolSignatures = [];

    const task = checkpoint.task || 'Resumed Task';
    const plan = checkpoint.plan || { objective: task, steps: [] };
    const startIteration = checkpoint.currentIteration || 0;
    const modifiedFiles = new Set(checkpoint.modifiedFiles || []);

    this.callbacks.onStatus('RESUMING SESSION', `Resuming task "${task}" from iteration ${startIteration}...`);

    const projectSummary = this.analyzer.getArchitectureSummary();
    const context = new ContextManager({
      maxContextTokens: 24000,
      systemPrompt: this.buildSystemPrompt(projectSummary)
    });

    // Reconstruct resume context
    const resumePrompt = [
      `[SYSTEM: RESUMING PREVIOUS INTERRUPTED SESSION]`,
      `User Request: "${task}"`,
      `Interrupted at iteration: ${startIteration}/${this.maxIterations}`,
      `Previously modified files: ${modifiedFiles.size > 0 ? Array.from(modifiedFiles).join(', ') : 'None'}`,
      '',
      'Execution Plan:',
      this.planning.formatPlanMarkdown(plan),
      '',
      'Inspect the workspace state, continue with the remaining pending plan steps, and thoroughly verify all implementations before reporting completion.'
    ].join('\n');

    context.addMessage('user', resumePrompt);

    // Re-inject recent messages if available
    if (checkpoint.recentMessages && Array.isArray(checkpoint.recentMessages)) {
      for (const msg of checkpoint.recentMessages) {
        if (msg.role !== 'system') {
          context.addMessage(msg.role, msg.content, {
            tool_calls: msg.tool_calls,
            tool_call_id: msg.tool_call_id,
            name: msg.name
          });
        }
      }
    }

    if (this.session) {
      this.session.addMessage('system', `Resumed session from iteration ${startIteration}`);
    }

    return this.executeLoop({
      task,
      plan,
      context,
      startIteration,
      modifiedFiles
    });
  }

  async executeLoop({ task, plan, context, startIteration, modifiedFiles }) {
    const toolSchemas = this.tools.getToolsSchema();
    let iteration = startIteration;
    let verified = false;
    let finalAssistantResponse = '';

    while (iteration < this.maxIterations) {
      if (this.cancelled) {
        this.callbacks.onStatus('CANCELLED', 'Operation was cancelled by user.');
        if (this.checkpointManager && this.session) {
          this.checkpointManager.markInterrupted(this.session.getCurrentSession().id, 'User cancelled');
        }
        return { status: 'CANCELLED', modifiedFiles: Array.from(modifiedFiles) };
      }

      iteration++;
      this.callbacks.onStatus('REASONING', `Iteration ${iteration}/${this.maxIterations}...`);

      // Compact context if needed
      context.compactIfNeeded();

      // Save checkpoint at start of iteration
      this.saveCheckpoint(iteration, task, plan, modifiedFiles, context);

      let response;
      try {
        response = await this.provider.chat({
          messages: context.getMessagesForProvider(),
          tools: toolSchemas,
          temperature: 0.1
        });
      } catch (err) {
        this.callbacks.onStatus('PROVIDER_ERROR', err.message);
        if (this.checkpointManager && this.session) {
          this.checkpointManager.markInterrupted(this.session.getCurrentSession().id, `Provider error: ${err.message}`);
        }
        return {
          status: 'ERROR',
          error: `Provider error: ${err.message}`,
          iterations: iteration,
          modifiedFiles: Array.from(modifiedFiles)
        };
      }

      if (response.content) {
        finalAssistantResponse = response.content;
        this.callbacks.onMessage('assistant', response.content);
      }

      // If no tool calls, model considers task finished
      if (!response.toolCalls || response.toolCalls.length === 0) {
        if (modifiedFiles.size > 0 && !verified && iteration < this.maxIterations - 1) {
          context.addMessage('assistant', response.content || 'I have completed the changes.');
          context.addMessage('user', 'Please verify your work by running existing tests or inspecting the modified files to ensure there are no syntax errors or regressions before completing.');
          verified = true;
          continue;
        }

        this.callbacks.onStatus('FINAL REPORT', 'Task completed.');
        if (this.checkpointManager && this.session) {
          this.checkpointManager.markCompleted(this.session.getCurrentSession().id);
        }

        return {
          status: 'SUCCESS',
          summary: response.content || 'Task completed successfully.',
          iterations: iteration,
          modifiedFiles: Array.from(modifiedFiles),
          verified
        };
      }

      // Model requested tool calls
      context.addMessage('assistant', response.content || '', {
        tool_calls: response.toolCalls
      });

      for (const call of response.toolCalls) {
        if (this.cancelled) break;

        const toolName = call.function.name;
        let args = {};
        try {
          args = typeof call.function.arguments === 'string'
            ? JSON.parse(call.function.arguments)
            : call.function.arguments;
        } catch (err) {
          args = {};
        }

        // Loop detection
        if (this.isLooping(toolName, args)) {
          const loopError = `Loop detected: tool '${toolName}' was called 3 times in a row with identical arguments. Please adjust your approach.`;
          this.callbacks.onStatus('LOOP_WARNING', loopError);
          context.addMessage('tool', JSON.stringify({ success: false, error: loopError }), {
            tool_call_id: call.id,
            name: toolName
          });
          continue;
        }

        this.callbacks.onToolStart(toolName, args);

        const executionResult = await this.tools.execute(toolName, args);
        this.callbacks.onToolEnd(toolName, executionResult);

        // Track modified files
        if (toolName === 'write_file' || toolName === 'edit_file') {
          if (args.path) modifiedFiles.add(args.path);
          if (this.session) {
            this.session.recordFileModification(
              args.path,
              executionResult.result ? executionResult.result.backup : null,
              toolName === 'write_file' ? 'write' : 'edit'
            );
          }
          this.saveCheckpoint(iteration, task, plan, modifiedFiles, context);
        }

        // Analyze result with reasoning engine
        const analysis = this.reasoning.analyzeToolResult(toolName, executionResult.result, executionResult.error);

        if (!analysis.success) {
          this.consecutiveFailures++;
          if (this.consecutiveFailures >= 5) {
            if (this.checkpointManager && this.session) {
              this.checkpointManager.markInterrupted(this.session.getCurrentSession().id, `Stuck: ${analysis.message}`);
            }
            return {
              status: 'STUCK',
              error: `Agent got stuck after 5 consecutive tool failures. Last error: ${analysis.message}`,
              iterations: iteration,
              modifiedFiles: Array.from(modifiedFiles)
            };
          }
        } else {
          this.consecutiveFailures = 0;
        }

        const observationPayload = {
          success: executionResult.success,
          output: executionResult.result || null,
          error: executionResult.error || null,
          analysis: analysis.isError ? analysis.recommendation : undefined
        };

        const observationString = JSON.stringify(observationPayload);
        context.addMessage('tool', observationString, {
          tool_call_id: call.id,
          name: toolName
        });

        if (this.session) {
          this.session.addMessage('tool', observationString, {
            toolName,
            toolCallId: call.id
          });
        }
      }
    }

    if (this.checkpointManager && this.session) {
      this.checkpointManager.markInterrupted(this.session.getCurrentSession().id, 'Max iterations reached');
    }

    return {
      status: 'MAX_ITERATIONS',
      summary: finalAssistantResponse || 'Reached maximum allowed iterations.',
      iterations: iteration,
      modifiedFiles: Array.from(modifiedFiles),
      verified
    };
  }
}

module.exports = AgentLoop;
