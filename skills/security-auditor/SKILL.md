---
name: security-auditor
description: OWASP Top 10 vulnerabilities detection, command/SQL/path injection prevention, secret sanitization, rate-limiting, and trust boundary enforcement.
---

# Security Auditor & Defense Skill

Proactive identification and elimination of security vulnerabilities.

## Core Rules

1. **Untrusted Input Boundary**: Treat all incoming strings, query arguments, environment variables, files, and terminal outputs as untrusted data. Validate formats and sanitize before use.
2. **Injection Defense**:
   - Never concatenate variables directly into shell commands. Use parameterized arguments or strict whitelist validation.
   - For file paths, always resolve against a designated workspace root and check for `..` directory traversal and symlink escapes.
3. **Secret Protection**:
   - Never hardcode API keys, passwords, private keys, or tokens in source code, configuration files, or commit logs.
   - Mask sensitive values in console logs, error messages, and audit trails.
4. **Least Privilege**:
   - Grant the minimum permissions required for an operation.
   - Default all autonomous operations to controlled approvals before performing destructive actions (file deletion, remote network calls).
5. **Denial of Service Prevention**:
   - Bound string inputs, buffer reads, recursion depth, and regex evaluations to prevent ReDoS or buffer exhaustion.
