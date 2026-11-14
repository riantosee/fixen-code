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

**FIXEN CODE** (`fixen-code`) is an autonomous AI software engineering agent for developers. Powered initially by **Groq** (with `llama-3.3-70b-versatile`) and OpenAI-compatible architectures, FIXEN CODE understands entire codebases, creates step-by-step implementation plans, modifies multiple files with unified diff previews, executes terminal commands safely, runs tests, fixes errors, and verifies its work before claiming completion.

Zero compiled dependencies. Pure Node.js CommonJS. Blazing fast startup across **Windows**, **Linux**, **macOS**, and **Android Termux**.

---

## 🌟 Key Highlights

- **Real Autonomous Agent Loop**: Inspect workspace → Create plan → Select tool → Execute tool → Observe result → Reason → Verify implementation.
- **Initial AI Provider: Groq**: Lightning-fast inference using `llama-3.3-70b-versatile`, with full tool calling, token usage tracking, and automatic retry with exponential backoff on rate limits.
- **Multi-Provider Architecture**: Built-in support for **Groq**, **OpenAI**, **Google Gemini**, and local **Ollama**.
- **Codebase Intelligence**: Recursive project scanning, language and framework detection, package manifest analysis, entry-point detection, and file tree generation.
- **Safe File Operations**: Atomic writes (`.tmp` + rename), automatic file backups (`.fixen/backups/`) before overwrite/deletion, unified diff previews, and full `/undo` capability.
- **Enterprise-Grade Security & Permissions**:
  - 5 Permission Levels (Read-Only to Full Auto).
  - Path traversal and workspace boundary enforcement.
  - Symlink escape validation.
  - Dangerous shell command pattern detection (`rm -rf /`, `rmdir /s /q C:\`, etc.).
  - Automatic API key and credential masking in logs and output.
- **Cross-Platform First**:
  - **Windows 10/11**: PowerShell and CMD support with accurate exit code forwarding.
  - **Linux & macOS**: POSIX shell.
  - **Android Termux**: Zero native C++ compilation addons, low memory footprint, compact screen adaptation.

---

## 🚀 Installation & Setup

### Requirements
- Node.js `>= 18.0.0` (Node 20+ recommended)
- Git (optional, recommended for version control)

### 1. Global Installation / Linking
```bash
# Clone the repository
git clone https://github.com/your-org/fixen-code.git
cd fixen-code

# Link globally so 'fixen' is in your PATH
npm link
```

Or run directly without linking:
```bash
node bin/fixen.js --help
```

---

## 📱 Platform Guides

### Windows (PowerShell / CMD)
```powershell
# Set your Groq API Key
$env:GROQ_API_KEY="gsk_your_groq_api_key_here"

# Run Fixen Code doctor to verify setup
fixen doctor

# Start interactive session
fixen
```

### Android Termux
Fixen Code is engineered from the ground up to require **zero native C++ build addons** (`node-gyp`), making it 100% compatible with Android Termux!

```bash
# In Termux:
pkg update && pkg install nodejs git

# Set your Groq API Key
export GROQ_API_KEY="gsk_your_groq_api_key_here"

# Clone & run
cd ~
git clone https://github.com/your-org/fixen-code.git
cd fixen-code
npm link

# Test installation
fixen doctor

# Start Fixen Code
fixen
```

---

## 💻 CLI Usage

```bash
# Start interactive REPL
fixen

# Autonomous task execution
fixen "Add unit tests for user authentication and verify they pass"

# Planning Mode (plans without modifying files)
fixen plan "Refactor database connection pooling"

# Code Review Mode (audits security and bugs)
fixen review

# System Doctor (checks Node, Git, API keys, shell)
fixen doctor

# AI Model Selection
fixen models

# Project Configuration
fixen config list
fixen config set provider groq
fixen config set model llama-3.3-70b-versatile
fixen config set permissionLevel 4

# Initialize FIXEN in current project
fixen init
```

---

## 🕹️ Interactive REPL Slash Commands

Inside `fixen`:
| Command | Description |
|---|---|
| `/help` | Display list of interactive commands |
| `/auto` | Switch to Autonomous Mode (plan, edit, test, verify) |
| `/ask` | Switch to Ask Mode (read-only codebase analysis) |
| `/plan [task]` | Switch to Plan Mode or generate implementation plan |
| `/code` | Switch to Code Mode (asks before file edits) |
| `/review` | Switch to Review Mode (security and quality audit) |
| `/workspace` | Display project tree and structure |
| `/status` | View repository status and active permission level |
| `/diff` | Inspect uncommitted git changes |
| `/undo` | Roll back file modifications made in the session |
| `/clear` | Clear terminal screen |
| `/exit` | Exit Fixen Code |

---

## 🔒 Security & Permissions

Fixen Code enforces 5 clear permission levels:
1. **Level 1 — Read Only**: No file writes, no file deletes, no command execution.
2. **Level 2 — Ask Before Changes**: File writes and commands require interactive user approval.
3. **Level 3 — Ask Before Commands**: File edits within workspace auto-approved; all commands require confirmation.
4. **Level 4 — Controlled Auto** *(Default)*: Safe file edits and safe read-only commands auto-approved; deletions, sensitive files (`.env`, `*.pem`, `id_rsa`), and dangerous commands require user approval.
5. **Level 5 — Full Auto**: Unrestricted autonomous execution inside workspace boundary. Explicit opt-in only via `--full-auto`.

---

## 🧪 Automated Testing

Fixen Code comes with a comprehensive, deterministic unit and integration test suite:

```bash
npm test
```

### Included Tests:
- `platform.test.js`: OS, Termux, shell, and terminal dimension detection.
- `security.test.js`: Path traversal bounds checking, symlink protection, secret masking, permission levels.
- `file-tools.test.js`: Atomic file writes, backups, edit string replacement, search, inspect, unified diffs.
- `terminal-tools.test.js`: Cross-platform command execution, exit codes, timeouts, dangerous pattern detection.
- `git.test.js`: Git status, diff, checkpoint creation, and non-repo handling.
- `scanner.test.js`: Recursive project scanning, `.gitignore` filtering, language and framework detection.
- `groq-provider.test.js`: Groq API adapter, token tracking, retry handling.
- `plugin.test.js`: Plugin registration, input schema, execution timeouts.
- `session.test.js`: Conversation persistence, file modification logging, rollback/undo.
- `agent-loop.test.js`: Scripted autonomous loop, loop detection, reasoning recovery, verification.
- `integration.test.js`: End-to-end task execution (create file, execute test command, edit code, verify).

---

## 🗺️ Roadmap & Milestones

- [x] **V0.1 — Core Foundation** *(Completed)*
  - Modular CLI with ASCII banner.
  - Groq provider implementation (`llama-3.3-70b-versatile`).
  - Autonomous Agent Loop (Understand → Inspect → Plan → Tool → Observe → Reason → Verify).
  - Cross-platform Terminal Execution (Windows PowerShell/CMD, Linux, macOS, Termux).
  - Safe File System Engine with Atomic Writes & Backups.
  - Security & Permission Engine (5 levels, Path Guard, Secret Guard).
  - Codebase Intelligence (Scanner, Detector, Analyzer).
  - Git Manager & Session Undo.
  - Extensible Plugin System.
  - 100% Passing Test Suite.
- [ ] **V0.2 — Advanced Reliability**
  - Streaming LLM token responses in CLI.
  - Enhanced multi-file semantic search.
  - Git stash branching checkpoints.
- [ ] **V0.3 — Engineering Automation**
  - Automated test generation and regression detection.
  - Auto-debugger workflows with stacktrace parsing.
- [ ] **V0.4 — Extensibility & MCP**
  - Model Context Protocol (MCP) server support.
  - Browser automation tooling.
- [ ] **V0.5 — Multi-Agent Orchestration**
  - Planner, Researcher, Coder, and Reviewer subagents.

---

## 📜 License
MIT License. Built for developers by the FIXEN CODE Team.
