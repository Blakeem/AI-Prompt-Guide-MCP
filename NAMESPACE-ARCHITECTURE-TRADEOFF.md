# Namespace Architecture Tradeoff Analysis

## Problem Statement
Need to support both `docs/` and `coordinator/` folders under `.ai-prompt-guide` root with physical isolation while maintaining clean tool interfaces.

## Constraints
1. **Physical Separation**: `coordinator/` must NOT be inside `docs/`
2. **Security**: Path traversal prevention still required
3. **Clean Interface**: Minimize breaking changes to existing tools
4. **Type Safety**: Compile-time guarantees where possible
5. **Maintainability**: Clear, predictable path resolution

---

## Option 1: Document Path Prefix (Explicit Folders in Paths)

### Description
All logical paths explicitly include the folder prefix. DocumentManager root: `.ai-prompt-guide`

**Paths:**
- Regular docs: `/docs/api/auth.md` → `.ai-prompt-guide/docs/api/auth.md`
- Coordinator: `/coordinator/active.md` → `.ai-prompt-guide/coordinator/active.md`

### Pros
- **Explicit & Clear**: Path tells you exactly where the file is
- **No Ambiguity**: No need to guess or infer folder context
- **Simple Validation**: Check path prefix (`startsWith('/docs/')` or `startsWith('/coordinator/')`)
- **Type-Safe**: Path contains all information needed
- **No API Changes**: Just path format changes

### Cons
- **Breaking Change**: All existing paths need `/docs/` prefix added
- **Migration Required**: Update all test data and examples
- **Path Redundancy**: `/docs/` appears in every regular document path
- **User Friction**: Users must remember to include folder prefix

### Effort/Complexity
**Large** - Requires updating all paths throughout codebase and tests

### Evidence
- Similar to URL paths with namespaces (e.g., `/api/v1/users`, `/admin/users`)
- Used by many REST APIs for namespace separation

---

## Option 2: Namespace Resolver Pattern (Automatic Prefix Resolution)

### Description
DocumentManager has built-in namespace resolver that automatically maps logical paths to physical folders based on prefix detection.

**Configuration:**
```typescript
const NAMESPACE_MAP = {
  '/coordinator/': 'coordinator',  // Maps to .ai-prompt-guide/coordinator
  // Everything else: 'docs' (default)
};
```

**Paths:**
- Regular docs: `/api/auth.md` → `.ai-prompt-guide/docs/api/auth.md` (default)
- Coordinator: `/coordinator/active.md` → `.ai-prompt-guide/coordinator/active.md` (mapped)

### Pros
- **Backward Compatible**: Most paths remain unchanged (`/api/auth.md`)
- **Convention-Based**: Coordinator prefix triggers special handling
- **Clean Paths**: No redundant `/docs/` prefix for most documents
- **Centralized Logic**: Path resolution in one place
- **Extensible**: Easy to add new namespaces later

### Cons
- **Implicit Behavior**: Path resolution logic hidden from callers
- **Magic**: `/api/auth.md` → `docs/api/auth.md` is not obvious
- **Debugging Complexity**: Need to trace through resolver to understand mapping
- **Mixed Patterns**: Some paths have folder prefix, others don't

### Effort/Complexity
**Medium** - Add resolver to DocumentManager, update validation logic

### Evidence
- Similar to module resolution in Node.js (implicit path resolution)
- Used by many frameworks (Next.js pages, Express routing)

---

## Option 3: Context Parameter (Folder Override on Tool Calls)

### Description
DocumentManager defaults to `docs/` folder. Tools can override via context parameter.

**API:**
```typescript
// Regular tools (default to docs)
await manager.getDocument('/api/auth.md');
// → .ai-prompt-guide/docs/api/auth.md

// Coordinator tools (explicit override)
await manager.getDocument('/active.md', { folder: 'coordinator' });
// → .ai-prompt-guide/coordinator/active.md
```

### Pros
- **Explicit When Needed**: Only coordinator tools need extra parameter
- **Backward Compatible**: Regular tools unchanged
- **Type-Safe**: TypeScript enforces valid folder names
- **Clear Intent**: Context parameter makes folder usage obvious

### Cons
- **API Change**: Every DocumentManager method needs optional parameter
- **Boilerplate**: Coordinator tools must pass context everywhere
- **Easy to Forget**: Missing context parameter causes silent errors
- **Inconsistent Paths**: Same logical path means different things in different contexts

### Effort/Complexity
**Large** - Update all DocumentManager methods, all coordinator tool calls

### Evidence
- Similar to database context pattern (connection override)
- Used in multi-tenant systems

---

## Option 4: Separate Manager Instances (Two Managers)

### Description
Create two separate DocumentManager instances with different roots.

**Setup:**
```typescript
const docsManager = new DocumentManager('.ai-prompt-guide/docs');
const coordinatorManager = new DocumentManager('.ai-prompt-guide/coordinator');
```

**Usage:**
- Regular tools use `docsManager`
- Coordinator tools use `coordinatorManager`

### Pros
- **Complete Isolation**: Physically separate managers
- **Simple Paths**: `/active.md` for coordinator, `/api/auth.md` for docs
- **No Cross-Contamination**: Can't accidentally access wrong folder
- **Independent**: Each manager configured independently

### Cons
- **Code Duplication**: Need to pass two managers everywhere
- **Dependency Injection**: Tools need to know which manager to use
- **Memory Overhead**: Two caches, two watchers, two everything
- **Coordination Issues**: Cross-manager operations are complex

### Effort/Complexity
**Large** - Refactor all tool signatures, session management, server setup

### Evidence
- Microservices pattern (separate instances per domain)
- Used when domains are truly independent

---

## Evaluation Criteria

| Criteria | Weight | Option 1 (Explicit Prefix) | Option 2 (Resolver) | Option 3 (Context) | Option 4 (Two Managers) |
|----------|--------|----------------------------|---------------------|-------------------|------------------------|
| **Clarity** | 5 | 5 (explicit) | 3 (implicit) | 4 (explicit context) | 5 (separate) |
| **Backward Compat** | 4 | 1 (breaks paths) | 4 (most unchanged) | 4 (most unchanged) | 2 (refactor needed) |
| **Type Safety** | 4 | 5 (compile-time) | 4 (runtime check) | 5 (compile-time) | 5 (compile-time) |
| **Maintainability** | 5 | 4 (predictable) | 3 (resolver complexity) | 3 (context tracking) | 3 (duplication) |
| **Simplicity** | 4 | 5 (straightforward) | 3 (hidden logic) | 3 (parameter tracking) | 2 (two systems) |
| **Migration Effort** | 3 | 2 (large migration) | 4 (small migration) | 2 (API changes) | 1 (major refactor) |
| **Extensibility** | 3 | 4 (add prefixes) | 5 (add mappings) | 4 (add folders) | 3 (add managers) |

### Weighted Scores
- **Option 1**: (5×5 + 1×4 + 5×4 + 4×5 + 5×4 + 2×3 + 4×3) = **110 / 132 = 83%**
- **Option 2**: (3×5 + 4×4 + 4×4 + 3×5 + 3×4 + 4×3 + 5×3) = **103 / 132 = 78%**
- **Option 3**: (4×5 + 4×4 + 5×4 + 3×5 + 3×4 + 2×3 + 4×3) = **105 / 132 = 80%**
- **Option 4**: (5×5 + 2×4 + 5×4 + 3×5 + 2×4 + 1×3 + 3×3) = **91 / 132 = 69%**

---

## Recommendation: Option 2 (Namespace Resolver Pattern)

### Why Not Option 1 (Winner by Score)?
While Option 1 scored highest, the **large migration effort** outweighs the clarity benefit. Adding `/docs/` to thousands of test paths provides little practical value since most documents ARE in docs folder.

### Why Option 2?
1. **Pragmatic Balance**: Backward compatible for 95% of paths (regular docs)
2. **Natural Convention**: `/coordinator/` prefix clearly indicates special handling
3. **Minimal Changes**: Only coordinator tools and validation logic need updates
4. **Extensible**: Easy to add `/archived/`, `/templates/` namespaces later
5. **Industry Pattern**: Matches conventions in Next.js, Express, etc.

### Implementation Strategy

**Step 1: Update DocumentManager Root**
```typescript
// config.ts - Change root to parent directory
docsBasePath: resolve(projectRoot, '.ai-prompt-guide')  // Not /docs
```

**Step 2: Add Namespace Resolver**
```typescript
// document-manager.ts
import { FOLDER_NAMES, isCoordinatorNamespace } from './shared/namespace-constants.js';

private resolvePhysicalPath(logicalPath: string): string {
  const folder = isCoordinatorNamespace(logicalPath)
    ? FOLDER_NAMES.COORDINATOR
    : FOLDER_NAMES.DOCS;

  // Strip namespace prefix if present
  const relativePath = logicalPath.startsWith('/coordinator/')
    ? logicalPath.slice('/coordinator/'.length)
    : logicalPath;

  return join(this.docsRoot, folder, relativePath);
}
```

**Step 3: Update Validation**
```typescript
// task-validation.ts
export function validateSubagentTaskAccess(documentPath: string) {
  if (isCoordinatorNamespace(documentPath)) {
    throw new AddressingError(
      'Subagent tools cannot access coordinator namespace',
      'INVALID_NAMESPACE_FOR_SUBAGENT'
    );
  }
}

export function validateCoordinatorTaskAccess(documentPath: string) {
  if (!isCoordinatorNamespace(documentPath)) {
    throw new AddressingError(
      'Coordinator tools only work with /coordinator/ namespace',
      'INVALID_COORDINATOR_PATH'
    );
  }
}
```

**Step 4: Update Archive Paths**
```typescript
// Use ARCHIVE_FOLDERS.DOCS and ARCHIVE_FOLDERS.COORDINATOR
archivePath = `/${FOLDER_NAMES.ARCHIVED}/${ARCHIVE_FOLDERS.DOCS}/...`
```

### Disqualified: Options 3 & 4
- **Option 3**: Context parameter adds complexity without enough benefit
- **Option 4**: Two managers is over-engineering for namespace separation

---

## Next Steps
1. Implement namespace resolver in DocumentManager
2. Update validation logic (remove `/docs/` requirement)
3. Update coordinator tools to use `/coordinator/` prefix
4. Update archive paths to use constants
5. Revert test changes (remove nested `docs/docs/` structure)
6. Run tests and fix failures
