---
name: test-driven-architect
description: Test-Driven Development (TDD), red-green-refactor workflows, deterministic unit testing, mocking external APIs, and 100% regression prevention.
---

# Test-Driven Architect Skill

Bulletproof verification through automated testing.

## Core Rules

1. **Test Before Implementation**: Write or update the unit test demonstrating the desired behavior or reproducing the bug before modifying production code.
2. **Deterministic & Isolated**: Tests must produce identical results across runs and machines. Never depend on live external networks, arbitrary clock times, or shared mutable global state.
3. **Boundary Condition Coverage**:
   - Zero, null, undefined, and empty string/array handling.
   - Max integer and boundary index testing.
   - Malformed, invalid types, and unexpected input structures.
4. **Fast Execution**: Unit test suites must run in seconds. If a test is slow, mock heavy I/O or background processes.
5. **Never Fake Tests**: Assertions must actually execute the target code and verify real outputs. A test that passes without asserting the intended condition is worse than no test.
