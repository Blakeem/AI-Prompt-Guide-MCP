
### 🔴 CRITICAL High Cyclomatic Complexity - sections.ts:74-134
**Description**: The `findTargetHierarchicalHeading` function has extremely high complexity with 15+ decision points across 60 lines. It contains deeply nested conditionals, multiple for loops, and complex disambiguation logic that makes it difficult to understand and modify.
**Impact**: Critical maintainability risk - debugging issues, adding features, or modifying path matching logic is error-prone
**Recommendation**: Refactor into smaller focused functions: `findCandidateSections()`, `validateHierarchicalPath()`, `matchDisambiguatedPath()`. Extract path matching strategies into separate methods.
**Files Affected**: src/sections.ts
**Related**: This function is called by core section reading logic throughout the system

### 🔴 CRITICAL God Object Anti-pattern - sections.ts:74-134
**Description**: The `findTargetHierarchicalHeading` function is a God Object containing all hierarchical matching logic - path parsing, candidate filtering, hierarchy building, disambiguation logic, and pattern matching all in one 60-line function with 15+ decision points
**Impact**: Single function handles too many responsibilities, making it impossible to test individual components, extremely difficult to debug, and violates Single Responsibility Principle at the function level
**Recommendation**: Decompose into focused functions: `parseHierarchicalPath()`, `findCandidateSections()`, `buildSectionHierarchy()`, `matchHierarchicalContext()`, `handleDisambiguation()`
**Files Affected**: src/sections.ts
**Related**: This compounds the complexity issues found by Agent-02

### 🔴 CRITICAL Incorrect Section Boundary Handling - sections.ts:627-632
**Description**: The `deleteSection` function incorrectly preserves the end boundary marker when deleting sections, which can result in data corruption when the end marker is actually the start of the next section that should remain.
**Impact**: Potential data loss - deleting a section may corrupt the structure of subsequent sections by leaving orphaned heading markers
**Recommendation**: Review boundary logic with AST analysis to ensure end markers are only preserved when they represent valid section boundaries, not when they're part of the content being removed
**Files Affected**: src/sections.ts
**Related**: This affects the `getSectionContentForRemoval` function which tries to match deletion behavior

### 🔴 CRITICAL Cache Invalidation Race Condition - document-cache.ts:282-306
**Description**: The `getSectionContent` dual-key caching (lines 291-298) creates cache inconsistencies when hierarchical and flat keys point to different content versions during cache invalidation
**Impact**: Stale cache data served to tools, incorrect section content returned after document updates
**Recommendation**: Implement atomic cache updates or use cache generations to ensure consistency between hierarchical and flat cache entries
**Files Affected**: src/document-cache.ts
**Related**: Affects all tools that use hierarchical addressing

### 🔴 CRITICAL MCP Error Handling Violation - section.ts:298-324, manage-document.ts:106-132
**Description**: Tools throw Error objects with JSON.stringify payloads instead of using proper MCP error responses. The MCP specification requires structured error objects, not JSON strings in error messages.
**Impact**: Breaks MCP client error handling, creates non-standard error responses that MCP clients cannot parse properly
**Recommendation**: Replace with proper MCP error structure: `throw new McpError(ErrorCode.InvalidParams, message, data)` or return error responses instead of throwing JSON strings
**Files Affected**: src/tools/implementations/section.ts, src/tools/implementations/manage-document.ts
**Related**: Violates MCP specification for error handling

### 🔴 CRITICAL Type Safety Violation in Error Formatting - addressing-system.ts:451
**Description**: The `formatHierarchicalError` method uses unsafe type assertion `error.context['slug'] as string` instead of proper type guards. This creates runtime type safety risks when error context doesn't match expected structure.
**Impact**: Potential runtime errors, type safety violations, unpredictable error formatting behavior
**Recommendation**: Implement proper type guards: `function hasSectionContext(context: unknown): context is { slug: string; documentPath: string }` and use before accessing context properties
**Files Affected**: src/shared/addressing-system.ts
**Related**: Agent-04 identified similar type safety concerns in other areas

### 🔴 CRITICAL Unhandled Concurrent Cache Invalidation - document-cache.ts:291-298
**Description**: Dual-key caching for hierarchical/flat sections creates race conditions when concurrent requests trigger cache invalidation. The cache sets both `slug` and `flatKey` without atomic operations, allowing inconsistent state when one write succeeds and another fails.
**Impact**: Cache corruption in production under load - tools may receive inconsistent section content, leading to data loss or incorrect operations
**Recommendation**: Implement atomic cache operations using cache generations or use database-style transactions: `beginCacheUpdate() -> updateBoth() -> commitCacheUpdate()` pattern
**Files Affected**: src/document-cache.ts
**Related**: Agent-04 identified similar cache invalidation race condition issues

### 🔴 CRITICAL Missing Resource Cleanup in Promise.all Failures - Multiple tool implementations
**Description**: Tools use `Promise.all()` for concurrent operations but lack error handling cleanup when partial failures occur. If one operation in Promise.all fails, successful operations may leave resources in inconsistent states without cleanup.
**Impact**: Resource leaks and data corruption - partial document updates, orphaned cache entries, and incomplete transaction states under error conditions
**Recommendation**: Replace Promise.all with Promise.allSettled for non-critical operations, or implement proper cleanup: `try { await Promise.all(...) } catch { await cleanup(); throw; }`
**Files Affected**: src/tools/implementations/task.ts:393, src/tools/implementations/view-task.ts:89+130, src/tools/implementations/view-section.ts:89+130, src/tools/implementations/complete-task.ts:269
**Related**: Concurrent operation patterns that lack error recovery

### 🔴 CRITICAL Insufficient Hierarchical Path Validation - sections.ts:196-200
**Description**: Hierarchical path validation only checks for obvious cases (`//`, leading/trailing `/`) but doesn't validate path depth limits, prevents path traversal attacks (`../`), or handle malformed Unicode characters in slugs.
**Impact**: Security vulnerability and system instability - path traversal attacks, denial of service through deeply nested paths, and crashes from malformed input
**Recommendation**: Implement comprehensive path validation: max depth limits, normalize Unicode input, prevent path traversal, validate against whitelist of allowed characters
**Files Affected**: src/sections.ts
**Related**: Input validation gaps that affect security and stability

### 🔴 CRITICAL Inefficient LRU Cache Implementation - addressing-system.ts:61-64, 76-79
**Description**: The AddressCache LRU implementation uses `keys().next().value` which doesn't guarantee true LRU order in JavaScript Maps. Map iteration order is insertion order, not access order, causing potential memory leaks and poor cache efficiency under load.
**Impact**: Cache can exceed maxSize limits leading to unbounded memory growth, poor cache hit rates due to evicting wrong entries, performance degradation in production under sustained load
**Recommendation**: Implement proper LRU with access tracking: maintain separate access order list or use dedicated LRU library like `lru-cache`. Alternative: add `touch()` method that re-inserts entries to maintain true access order.
**Files Affected**: src/shared/addressing-system.ts
**Related**: Agent-04 identified memory leak potential, Agent-08 noted unguarded array access

### 🔴 CRITICAL Missing JSDoc Coverage in Core Functions - sections.ts:74-134, 245-304
**Description**: Critical functions like `findTargetHierarchicalHeading` and `readSection` completely lack JSDoc documentation despite their complexity and central importance. These functions have no parameter documentation, return value descriptions, or usage examples.
**Impact**: Developers cannot understand function purpose, parameters, or expected behavior without reading implementation code, severely hampering maintainability and onboarding
**Recommendation**: Add comprehensive JSDoc for all public functions: `@param {string} targetPath - Hierarchical path to match`, `@returns {Heading | null} - Found heading or null`, `@example findTargetHierarchicalHeading('api/auth/jwt', headings)`
**Files Affected**: src/sections.ts, src/document-cache.ts, src/document-manager.ts
**Related**: Compounds the complexity issues identified by Agent-02

### 🔴 CRITICAL Inadequate API Documentation for Tool Implementations - All tools in src/tools/implementations/*.ts
**Description**: MCP tool implementations lack proper function-level documentation explaining their purpose, parameters, return values, and hierarchical addressing integration patterns. Only basic file headers exist.
**Impact**: Tool behavior is opaque to developers and MCP clients, integration patterns unclear, no examples of hierarchical addressing usage
**Recommendation**: Add comprehensive JSDoc to all tool exports: purpose, parameter descriptions, return value schemas, hierarchical addressing examples, error conditions
**Files Affected**: src/tools/implementations/section.ts, src/tools/implementations/view-document.ts, src/tools/implementations/task.ts, and 5 other tool files
**Related**: Agent-05 noted inconsistent tool patterns that documentation could clarify

### 🔴 CRITICAL Test Performance Regression - sections.hierarchical.test.ts:234
**Description**: The performance test "should not significantly slow down flat addressing" consistently fails, taking ~1216ms vs expected <1000ms threshold. This indicates actual performance regression in hierarchical addressing that affects production readiness.
**Impact**: Hierarchical addressing introduces measurable performance degradation that violates established performance requirements
**Recommendation**: Either fix the underlying performance issue in sections.ts or adjust performance expectations based on complexity trade-offs. Current failure blocks deployment.
**Files Affected**: src/sections.hierarchical.test.ts
**Related**: Agent-04 identified performance issues in core infrastructure

### 🔴 CRITICAL Unreliable Test Infrastructure - section.integration.test.ts
**Description**: Integration tests consistently produce unhandled rejection errors for missing test files (/home/blake/Development/Spec-Docs-MCP/.spec-docs-mcp/test-integration/integration-test.md), indicating fundamental infrastructure issues with test setup/teardown.
**Impact**: Unhandled errors mask real test failures and create false confidence in test results
**Recommendation**: Fix test directory creation and cleanup logic to prevent file not found errors during async operations
**Files Affected**: src/tools/__tests__/section.integration.test.ts
**Related**: Test isolation and cleanup issues
