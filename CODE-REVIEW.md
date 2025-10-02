# Code Review - AI-Prompt-Guide MCP Server

## Overview

This document defines the code review process for systematic quality assurance of the AI-Prompt-Guide MCP Server codebase. Reviews focus on **functional correctness**, **code readability**, **maintainability**, and **consistency** to ensure the codebase is accessible to all developers.

## Review Scope

- **Primary Focus**: `/src` directory - all TypeScript source files
- **Core Areas**: Functional issues, readability, technical debt, complexity, consistency
- **Out of Scope**: Documentation files, build configs (unless affecting functionality)

## Review Categories

1. **Architecture & Design Patterns** - Design consistency, SOLID principles, separation of concerns
2. **Code Complexity & Readability** - Cyclomatic complexity, function size, naming, clarity
3. **Anti-patterns & Code Smells** - DRY violations, code smells, refactoring opportunities
4. **Core Infrastructure** - Document cache, sections, addressing system, utilities
5. **MCP Tools Layer** - Tool implementations, consistency across tools, error handling
6. **Integration & Response Formatting** - ToolIntegration class, response consistency
7. **Test Quality** - Test coverage, clarity, maintainability, missing edge cases
8. **Error Handling & Resilience** - Error scenarios, boundary conditions, input validation
9. **Performance & Optimization** - Bottlenecks, memory usage, inefficient patterns
10. **Code Consistency** - Naming conventions, patterns, style uniformity

## Review Agent Instructions

### Before Starting Review
1. **Read this document** to understand scope and severity levels
2. **Review your assigned category** and focus areas
3. **Avoid duplication** - check if issue overlaps with other categories
4. **Use consistent reporting format** and severity levels

### Review Process
1. **Stay in your assigned category** - avoid overlapping with other agents
2. **Examine all files** in `/src` relevant to your category
3. **Look for patterns** - issues that appear across multiple files
4. **Consider developer impact** - how does this affect someone working on the code?
5. **Focus on actionable findings** - provide specific, implementable recommendations

### Reporting Standards

#### Severity Levels
- **🔴 CRITICAL**: Functional bugs, data corruption risk, security vulnerabilities, breaking changes
- **🟡 MAJOR**: Significant technical debt, poor readability, design flaws affecting maintainability
- **🟢 MINOR**: Inconsistencies, minor complexity issues, small refactoring opportunities
- **📝 SUGGESTION**: Best practice recommendations, nice-to-have improvements

#### Finding Format
```markdown
### [SEVERITY] Issue Title - File:Line

**Description**: Clear description of the issue
**Impact**: How this affects the codebase/users/performance
**Recommendation**: Specific actionable fix
**Files Affected**: List of files with this pattern
**Related**: Reference to related findings (if any)
```

#### Evidence Requirements
- **Code snippets** showing the issue
- **Line numbers** for easy location
- **Context** about why this is problematic
- **Specific recommendations** with examples where helpful

### Quality Standards

#### Code Readability
- **Function Complexity**: Keep cyclomatic complexity < 10
- **Function Length**: Prefer functions < 50 lines for readability
- **Clear Naming**: Use descriptive, consistent names across codebase
- **Consistent Patterns**: Similar problems solved similarly
- **Comments**: Complex logic explained, not obvious code

#### Maintainability
- **DRY Principle**: Avoid code duplication across files
- **Single Responsibility**: Each function/class has one clear purpose
- **Testability**: Code structure allows easy unit testing
- **Error Handling**: Consistent error patterns across modules
- **Type Safety**: Explicit typing, minimal use of `any`

#### Performance & Efficiency
- **Algorithm Complexity**: Avoid O(n²) where O(n) suffices
- **Memory Usage**: No obvious memory leaks or inefficient structures
- **Async Patterns**: Proper async/await, no unnecessary promises
- **Caching**: Appropriate caching without over-engineering

### Files in Scope

#### Core Application Files
- `src/index.ts` - Main entry point
- `src/config.ts` - Configuration management
- `src/document-cache.ts` - Document caching with LRU eviction
- `src/sections.ts` - Section parsing and hierarchical matching
- `src/document-manager.ts` - Document lifecycle management

#### Server Infrastructure
- `src/server/server-factory.ts` - MCP server creation
- `src/server/request-handlers/*.ts` - Tool and prompt handlers
- `src/server/middleware/*.ts` - Error handling, logging, sessions
- `src/server/dependencies.ts` - Dependency injection

#### MCP Tool Implementations (Primary Focus)
- `src/tools/implementations/section.ts` - Section CRUD operations
- `src/tools/implementations/task.ts` - Task management
- `src/tools/implementations/complete-task.ts` - Task completion
- `src/tools/implementations/view-document.ts` - Document viewing
- `src/tools/implementations/view-section.ts` - Section viewing
- `src/tools/implementations/view-task.ts` - Task viewing
- `src/tools/implementations/manage-document.ts` - Document operations
- `src/tools/implementations/browse-documents.ts` - Document browsing
- `src/tools/implementations/create-document.ts` - Progressive creation

#### Shared Utilities & Infrastructure
- `src/shared/addressing-system.ts` - Typed address system (Document/Section/Task)
- `src/shared/validation-utils.ts` - Parameter validation utilities
- `src/shared/slug-utils.ts` - Slug normalization and path handling
- `src/shared/section-operations.ts` - Section operation helpers
- `src/shared/reference-*.ts` - Reference extraction and loading
- `src/shared/link-*.ts` - Link analysis and validation
- `src/shared/task-*.ts` - Task utilities
- `src/shared/document-analysis*.ts` - Document analysis and suggestions

#### Browse Subsystem
- `src/tools/browse/*.ts` - Search, analysis, classification engines

#### Test Files (All test files in scope for Test Quality review)
- `src/**/*.test.ts` - Unit tests
- `src/**/__tests__/**/*.test.ts` - Integration and specialized tests

### Out of Scope
- `package.json`, `tsconfig.json`, build configs (unless affecting code quality)
- `dist/` directory and build output
- `.github/` workflows (unless directly related to code quality)
- Third-party dependencies (node_modules)

## Review Assignment Matrix

| # | Category | Focus Areas | Key Questions |
|---|----------|-------------|---------------|
| 1 | **Architecture & Design** | Design patterns, SOLID principles, separation of concerns | Are design patterns used consistently? Is code modular? |
| 2 | **Complexity & Readability** | Function size, nesting, naming, clarity | Can new developers understand this quickly? |
| 3 | **Anti-patterns & Smells** | DRY violations, code smells, refactoring needs | Is code duplicated? Obvious code smells? |
| 4 | **Core Infrastructure** | Cache, sections, addressing, document management | Are core systems well-designed and bug-free? |
| 5 | **MCP Tools Layer** | Tool implementations, consistency, patterns | Do tools follow consistent patterns? |
| 6 | **Integration & Formatting** | ToolIntegration, response consistency | Are responses formatted consistently? |
| 7 | **Test Quality** | Coverage, clarity, edge cases, maintainability | Are tests comprehensive? Do they cover edge cases? |
| 8 | **Error Handling** | Error scenarios, validation, resilience | Are errors handled gracefully? Validation complete? |
| 9 | **Performance** | Bottlenecks, inefficiencies, memory usage | Are there obvious performance issues? |
| 10 | **Code Consistency** | Naming, patterns, style uniformity | Are conventions followed consistently? |

## Success Criteria

A successful code review will:
- ✅ **Identify functional bugs** that could cause incorrect behavior
- ✅ **Highlight readability issues** that make code hard to understand or modify
- ✅ **Find technical debt** that increases maintenance burden
- ✅ **Catch inconsistencies** in patterns, naming, and conventions
- ✅ **Spot performance issues** that could impact system responsiveness
- ✅ **Verify test coverage** for critical functionality and edge cases

---

## Review Findings

*Agents should append findings below in their assigned category section*
*Use the standard finding format with severity, description, impact, and recommendations*
