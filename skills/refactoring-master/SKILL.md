---
name: refactoring-master
description: Clean code refactoring patterns, reducing cognitive complexity, decomposing monoliths, eliminating code smells, and improving maintainability without breaking contracts.
---

# Refactoring Master Skill

Transforming messy codebases into clean, readable, maintainable software.

## Core Rules

1. **Preserve External Behavior**: Refactoring changes internal structure without altering external observable behavior. All existing tests must pass before and after the refactoring.
2. **Small Incremental Steps**: Never rewrite an entire module in one giant commit. Make small, testable transformations (extract function, rename variable, inline temp, decompose conditional).
3. **Decompose High Complexity**:
   - Split functions longer than 30-40 lines into cohesive sub-functions.
   - Flatten nested `if-else` pyramids using guard clauses and early returns.
4. **Single Responsibility**: Each module, class, or function should do one thing well. Extract helper utilities into dedicated modules rather than bloating core business logic.
5. **Delete Dead Code**: If code is unused or commented out, delete it. Version control remembers history; dead code only breeds confusion.
