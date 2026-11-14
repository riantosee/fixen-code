# FIXEN CODE

```
  ███████╗██╗██╗  ██╗███████╗███╗   ██╗
  ██╔════╝██║╚██╗██╔╝██╔════╝████╗  ██║
  █████╗  ██║ ╚███╔╝ █████╗  ██╔██╗ ██║
  ██╔══╝  ██║ ██╔██╗ ██╔══╝  ██║╚██╗██║
  ██║     ██║██╔╝ ██╗███████╗██║ ╚████║
  ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝

  Build Anything. Fix Everything.
```

[![npm version](https://img.shields.io/npm/v/fixen-code.svg)](https://www.npmjs.com/package/fixen-code)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-success.svg)](package.json)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Termux-blueviolet.svg)](#cross-platform-support)
[![Website](https://img.shields.io/badge/Website-Landing%20Page-cyan.svg)](https://riantosee.github.io/fixen-code/)

**[🌐 Live Landing Page & Interactive Demo →](https://riantosee.github.io/fixen-code/)**

**FIXEN CODE** is an autonomous AI software engineering agent designed for modern developers. It doesn't just chat about code—it **reads and understands your whole codebase, creates milestone plans, writes and edits files safely, executes terminal commands, runs tests, fixes errors, and verifies its work before claiming completion.**

Built with **Zero External Dependencies** using pure Node.js CommonJS. It delivers blazing-fast startup times and runs identically across **Windows**, **macOS**, **Linux**, and **Android (Termux)**.

---

## 🎯 What FIXEN CODE Does

Unlike traditional chat assistants that dump code snippets for you to copy and paste, FIXEN CODE acts as an autonomous pair programmer directly inside your terminal:

1. **Scans & Understands**: Recursively indexes your project tree, reads package manifests, detects frameworks and languages, and builds an architectural mental model.
2. **Plans First**: Breaks complex requests into logical milestones and presents a structured plan before modifying anything.
3. **Acts Safely**: Edits files using atomic operations, shows unified diff previews, creates automatic backups, and supports instant `/undo`.
4. **Executes & Observes**: Runs builds, linters, tests, and shell commands in your environment, capturing stdout and stderr.
5. **Reasons & Recovers**: If a command or test fails, FIXEN CODE diagnoses the root cause, self-corrects the code, and tries again.
6. **Verifies Work**: Never declares a task "done" without running existing tests or inspecting file integrity.
7. **Survives Crashes**: Automatically saves state checkpoints at every iteration. If interrupted by `Ctrl+C` or a network drop, you can resume right where it left off with `fixen resume`.

---

## 🔄 The Autonomous Agent Loop

```
           ┌─────────────────────────────┐
           │     User Task Request       │
           └──────────────┬──────────────┘
                          │
                          ▼
           ┌─────────────────────────────┐
           │      Inspect Workspace      │  (Language, framework, directory scan)
           └──────────────┬──────────────┘
                          │
                          ▼
           ┌─────────────────────────────┐
           │   Decompose & Create Plan   │  (Milestones & execution strategy)
           └──────────────┬──────────────┘
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
   [Plan Mode]                        [Auto / Code Mode]
   Outputs plan only                  Enters Execution Loop:
                                           │
                        ┌──────────────────┼──────────────────┐
                        │                  │                  │
                        ▼                  ▼                  ▼
                   Select Tool        Execute Tool      Observe Result
                 (File/Terminal)    (Atomic & Guarded)   (Stdout/Diffs)
                        │                  │                  │
                        └──────────────────┼──────────────────┘
                                           │
                                           ▼
                                ┌─────────────────────┐
                                │ Reason About Output │
                                └──────────┬──────────┘
                                           │
                          ┌────────────────┴────────────────┐
                          │ Need more work / Fix error?     │
                          ├─────────────────┬───────────────┤
                          │ YES             │ NO            │
                          ▼                 ▼               │
                    [Next Tool Call]   Verify Work          │
                                       (Run Tests)          │
                                            │               │
                                            ▼               ▼
                                    ┌─────────────────────────────┐
                                    │     Final Summary Card      │
                                    └─────────────────────────────┘
```

---

## 🚀 Key Features

### 1. Real-Time Token Streaming
Watch the agent think and draft in real-time. Powered by a native Server-Sent Events (SSE) parser, responses stream directly to your terminal with zero lag.

### 2. Atomic File Transactions & Rollbacks
Multi-file modifications are executed inside managed transactions. If an edit fails midway through, FIXEN CODE automatically rolls back all changed files to their exact previous state—preventing half-broken codebases.

### 3. Crash & Interruption Recovery
Every step is saved to atomic checkpoints under `.fixen/checkpoints/`. If your computer reboots, your terminal closes, or you press `Ctrl+C`, run `fixen resume` to pick up immediately without restarting from scratch.

### 4. Git Branch Checkpoints
Before executing complex multi-step tasks, FIXEN CODE can snapshot uncommitted changes onto temporary checkpoint branches (`fixen/checkpoint-*`), giving you a safety net to restore anytime.

### 5. Multi-Provider AI Architecture
- **Groq** *(Default)*: Ultra-low latency inference using `llama-3.3-70b-versatile` with automatic rate-limit backoff.
- **OpenAI**: First-class support for `gpt-4o` and OpenAI-compatible endpoints.
- **Google Gemini**: Support for `gemini-1.5-pro` and `gemini-1.5-flash`.
- **Ollama**: Run 100% offline with local models like `llama3`, `qwen2.5-coder`, or `mistral`.

### 6. 5-Tier Permission & Security Engine
- **Level 1 (Read Only)**: Allows codebase inspection, reading files, and asking questions. Zero file modifications or command execution.
- **Level 2 (Ask Before Changes)**: Prompts for your approval before writing, editing, or deleting files.
- **Level 3 (Ask Before Commands)**: File changes auto-approved; prompts before executing terminal commands.
- **Level 4 (Controlled Auto - Default)**: Autonomous safe file edits and read-only commands; asks for approval on deletions, sensitive files (`.env`, certificates, SSH keys), and destructive commands.
- **Level 5 (Full Auto)**: Unrestricted autonomous execution inside workspace boundaries (`--full-auto`).

### 7. 7 Native Engineering Skills
FIXEN CODE comes pre-loaded with specialized engineering skills that guide the AI's problem-solving behavior:
- 🪮 **Ponytail**: Lazy Senior Developer mode—enforces the shortest working diff, strict YAGNI, and zero unnecessary boilerplate.
- 🐞 **Deep Debugger**: Systematic root-cause debugging, stacktrace parsing, and regression prevention.
- ✨ **Motion Design**: Snappy UI animation standards, easing curves, and responsive transitions (150ms–350ms).
- 🛡️ **Security Auditor**: OWASP Top 10 mitigation, injection prevention, and credential sanitization.
- 🧪 **Test-Driven Architect**: TDD workflows, red-green-refactor cycles, and deterministic test authoring.
- 🔨 **Refactoring Master**: Clean architecture, monolith decomposition, and code smell eradication.
- 📐 **API Designer**: RESTful & RPC API design standards, uniform JSON envelopes, and status code best practices.

### 8. Automatic Update Notifications
Never miss an update. FIXEN CODE periodically checks the npm registry in the background. When a new version is released, it displays a non-intrusive update banner. Upgrading is as simple as running `fixen upgrade`.

---

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g fixen-code
```

### From Source (For Contributors)

```bash
git clone https://github.com/riantosee/fixen-code.git
cd fixen-code
npm link
```

Verify your installation:
```bash
fixen --version
fixen doctor
```

---

## ⚡ Quick Start

### 1. Configure Your API Key

FIXEN CODE uses **Groq** by default for lightning-fast responses:

```bash
# On Linux / macOS / Termux:
export GROQ_API_KEY="gsk_your_groq_api_key_here"

# On Windows (PowerShell):
$env:GROQ_API_KEY="gsk_your_groq_api_key_here"

# On Windows (CMD):
set GROQ_API_KEY=gsk_your_groq_api_key_here
```

*(You can also store it permanently via: `fixen config set providers.groq.apiKey <your-key>`)*

### 2. Verify Your Environment

Run the doctor command to ensure git, shells, and API keys are ready:

```bash
fixen doctor
```

### 3. Run Your First Task

Navigate to any software project and run:

```bash
# Direct task execution:
fixen "Find all unhandled promise rejections in src/ and fix them"

# Or launch the interactive terminal:
fixen
```

---

## 💻 Operating Modes

FIXEN CODE supports 5 operating modes tailored to different stages of development:

| Mode | Purpose | File Modifying? |
| :--- | :--- | :---: |
| **Auto** *(Default)* | Autonomously plans, edits files, executes tests, and verifies work. | Yes |
| **Plan** | Analyzes the task and produces a detailed step-by-step implementation plan. | No |
| **Code** | Implements changes but prompts for confirmation before every modification. | Prompted |
| **Ask** | Answers technical questions and explains codebase architecture without touching code. | No |
| **Review** | Audits the codebase for bugs, security vulnerabilities, and code quality. | No |

Switch modes anytime in the interactive REPL using `/auto`, `/plan`, `/code`, `/ask`, or `/review`.

---

## 💬 Interactive REPL & Slash Commands

Launch the interactive REPL by running `fixen` without arguments:

```
[AUTO] fixen> /help

FIXEN CODE Interactive Commands:
  /help       - Show available commands and options
  /auto       - Switch to Autonomous Mode (plan, code, test, verify)
  /ask        - Switch to Ask Mode (read-only questions & explanations)
  /plan       - Switch to Plan Mode (generate step-by-step plans)
  /code       - Switch to Code Mode (prompt before file modifications)
  /review     - Switch to Review Mode (security & code quality review)
  /workspace  - View project structure and file tree
  /status     - Show repository status & active configuration
  /skills     - List active engineering skills
  /resume     - Resume last interrupted session from checkpoint
  /upgrade    - Check and upgrade to the latest version from npm
  /diff       - View uncommitted git changes
  /undo       - Revert modifications made in the current session
  /clear      - Clear the terminal screen
  /exit       - Exit FIXEN CODE
```

---

## 🛠️ CLI Commands & Flags Reference

```bash
# Tasks & Interactive
fixen                          # Launch interactive REPL
fixen "task description"       # Execute an autonomous task directly
fixen chat                     # Start interactive REPL

# Specialized Workflows
fixen plan "task description"  # Generate an implementation plan only
fixen review [path]            # Run security, bug, and quality review
fixen resume [sessionId]       # Resume an interrupted or crashed session
fixen upgrade                  # Upgrade fixen-code to latest npm version

# Inspection & Configuration
fixen doctor                   # System and environment diagnosis
fixen config [get|set|list]    # Inspect or change persistent settings
fixen models                   # Display available providers and models
fixen skills [list|info]       # Inspect installed engineering skills
fixen init                     # Initialize .fixen configuration in current directory

# Global Flags
--provider <name>              # Switch provider on the fly (groq, openai, gemini, ollama)
--model <name>                 # Override model name
--full-auto                    # Allow autonomous execution without interactive prompts
--version, -v                  # Display version
--help, -h                     # Show help message
```

---

## 📱 Cross-Platform Support

FIXEN CODE is built from the ground up with portability in mind:

- **Windows 10 & 11**: Full PowerShell and CMD support with native exit-code handling and path separator normalization.
- **Linux**: Ubuntu, Debian, Fedora, Arch, CentOS (POSIX shell compatible).
- **macOS**: Apple Silicon & Intel (Zsh and Bash).
- **Android (Termux)**: Requires **zero native C++ build tools (`node-gyp`)**. Lightweight RAM and CPU footprint designed to run smoothly on mobile devices.

### Running on Android Termux

```bash
pkg update && pkg install nodejs git
npm install -g fixen-code
export GROQ_API_KEY="gsk_..."
fixen
```

---

## 🧪 Deterministic Test Suite

FIXEN CODE comes with a comprehensive, zero-dependency unit and integration test suite:

```bash
npm test
```

### All 20/20 Test Suites Passing:

- `platform.test.js`: OS, shell, and Termux platform detection.
- `security.test.js`: Path traversal bounds, symlink escapes, secret masking, permission gates.
- `file-tools.test.js`: Atomic file writes, backups, edit replacements, unified diffs.
- `terminal-tools.test.js`: Cross-platform command execution, exit codes, dangerous pattern detection.
- `git.test.js`: Git status, diff parsing, and checkpoint commits.
- `scanner.test.js`: Recursive directory scanning, `.gitignore` filtering, framework detection.
- `groq-provider.test.js`: Groq adapter, token tracking, retry and rate-limit backoff.
- `plugin.test.js`: Plugin registration, input schema validation, execution timeouts.
- `session.test.js`: Session persistence, modification history, rollback `/undo`.
- `checkpoint.test.js`: Atomic crash checkpoint saving, loading, and recovery.
- `skills.test.js`: YAML frontmatter parsing, dynamic skill injection into system prompt.
- `resume.test.js`: Resuming interrupted workflows from saved checkpoints.
- `update-notifier.test.js`: NPM registry version checks, semver comparison, alert formatting.
- `ui-box.test.js`: Unicode box rendering, summary card formatting, ANSI colors.
- `agent-loop.test.js`: Autonomous loop orchestration, cycle detection, verification gates.
- `integration.test.js`: End-to-end task execution (create file, run tests, edit code, verify).
- `stream-renderer.test.js`: Real-time token streaming output and newline preservation.
- `file-transaction.test.js`: Multi-file atomic batch operations and automated rollback on failure.
- `git-branching.test.js`: Temporary checkpoint branch creation, listing, restoration, and cleanup.
- `streaming-provider.test.js`: Server-Sent Events (SSE) stream parsing for tokens and tool calls.

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.

---

<div align="center">
  <b>FIXEN CODE</b> — <i>Build Anything. Fix Everything.</i>
</div>
