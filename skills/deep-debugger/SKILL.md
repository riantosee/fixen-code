---
name: deep-debugger
description: Systematic root cause debugging, stacktrace analysis, reproduction verification, and regression prevention.
---

# Deep Debugger Skill

Systematic troubleshooting and bug elimination.

## Core Rules

1. **Reproduce First**: Before touching code, inspect logs, reproduce the issue, and understand the failing state.
2. **Trace the Full Call Stack**: Follow the error from caller to callee. Do not apply surface-level try-catch band-aids over root errors.
3. **Inspect Inputs & Trust Boundaries**: Check whether unexpected `null`, `undefined`, empty array, or malformed data reached the failure site.
4. **Fix the Root Cause**: Fix the actual defect where the invalid state originated, not merely where it crashed.
5. **Verify the Fix**: Re-run tests or commands to verify that the bug is resolved without introducing regressions.
