# CLAUDE.md - Assistant Instructions for Spec-Docs MCP Server

## Project Overview

This is a comprehensive MCP server for intelligent specification document management. The server provides full Create, Read, Update, and Delete operations on interconnected Markdown documents with advanced linking, task management, and view capabilities.

**Purpose:** Enable LLMs to manage specification documents programmatically through progressive discovery workflows, with automatic context loading from linked documents and comprehensive document analysis tools.

**Current Status:** 🎉 **Central Addressing System Migration Complete** - All 8 MCP tools successfully migrated to unified addressing framework with comprehensive issue resolution. System is production-ready with zero quality gate violations.

**Key Features:**
- **Central Addressing System** - Unified, type-safe addressing for documents, sections, and tasks with LRU caching
- **Advanced Document Linking** - Cross-document references with `@/path/doc.md#section` syntax
- **Slug-based Section Addressing** - Hierarchical addressing (e.g., `#api/authentication/jwt-tokens`)
- **Progressive Discovery Workflows** - Step-by-step document creation with intelligent guidance
- **Task Management System** - Complete task lifecycle with priority, dependencies, and completion tracking
- **View Tools Suite** - Clean, focused viewing for documents, sections, and tasks
- **Unified Operations** - Single tools for related operations (section, manage_document, task)
- **Batch Processing** - Multiple operations in single calls for efficiency

**Package Manager**: pnpm (NOT npm or yarn)
**Language**: TypeScript with strict mode enabled
**Runtime**: Node.js with ES modules

## CRITICAL CODE QUALITY REQUIREMENTS

### Quality Gates (ALL must pass)
**AFTER EVERY CODE CHANGE:**
1. Run `pnpm test:run` - ALL tests must pass (runs once, exits)
2. Run `pnpm lint` - ZERO errors and warnings allowed
3. Run `pnpm typecheck` - ZERO type errors allowed
4. Run `pnpm check:dead-code` - ZERO unused exports allowed
5. Run `pnpm check:all` - Combined quality validation (recommended)

### Dead Code Detection (ENABLED)
```bash
# Individual checks
pnpm check:dead-code     # Must show "0 modules with unused exports"

# Comprehensive check (recommended)
pnpm check:all          # Runs all checks: lint + typecheck + dead-code
```

**Note**: Dead code detection is fully enabled. All unused exports must be cleaned up to maintain code quality.

### Test Commands
- `pnpm test:run` - Run tests once and exit (for CI/validation)
- `pnpm test` - Watch mode for development (stays running)
- `pnpm test:coverage` - Run with coverage report
- `pnpm test:ci` - CI-friendly test command (with environment flags)
- `pnpm test:all` - Run tests and all quality gates
- **Unit Testing**: ALL new features must include unit tests following `docs/UNIT-TEST-STRATEGY.md`

## COMMON ESLINT ISSUES & SOLUTIONS

Based on practical experience implementing this system, here are the most common linting issues encountered and their proper solutions:

### 1. **Non-null Assertions (`@typescript-eslint/no-non-null-assertion`)**
❌ **Avoid:** `array[0]!.property` or `value!`
✅ **Use:** Explicit null checks with proper handling
```typescript
// Bad
const firstHeading = headings[0]!.slug;

// Good 
const firstHeading = headings[0];
if (firstHeading != null) {
  const slug = firstHeading.slug;
  // ... use slug
}
```

### 2. **Contradictory Optional Chain vs Strict Boolean Rules**
When ESLint gives contradictory suggestions between `prefer-optional-chain` and `strict-boolean-expressions`:
```typescript
// If both rules conflict, use explicit null check with disable comment
// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
if (value != null && value.startsWith('#')) {
  // ... handle value
}
```

### 3. **Nullish Coalescing (`@typescript-eslint/prefer-nullish-coalescing`)**
❌ **Avoid:** `||` for potentially falsy values
✅ **Use:** `??` for null/undefined checks
```typescript
// Bad
const title = heading.title || 'Default Title';
const matches = content.match(regex) || [];

// Good
const title = heading.title ?? 'Default Title'; 
const matches = content.match(regex) ?? [];
```

### 4. **Nullish Assignment (`@typescript-eslint/prefer-nullish-coalescing`)**
❌ **Avoid:** Manual null checks for assignment
✅ **Use:** `??=` operator
```typescript
// Bad
if (document.sections == null) {
  document.sections = new Map();
}

// Good
document.sections ??= new Map();
```

### 5. **String Concatenation (`prefer-template`)**
❌ **Avoid:** String concatenation with `+`
✅ **Use:** Template literals
```typescript
// Bad
content += '\n\n' + tocPlaceholder;

// Good
content = `${content}\n\n${tocPlaceholder}`;
```

### 6. **Strict Boolean Expressions (`@typescript-eslint/strict-boolean-expressions`)**
❌ **Avoid:** Implicit truthiness checks
✅ **Use:** Explicit comparisons
```typescript
// Bad - implicit truthiness
if (line && !line.startsWith('#')) { }

// Good - explicit checks
if (line != null && line !== '' && !line.startsWith('#')) { }
```

### 7. **Function Return Types (`@typescript-eslint/explicit-function-return-type`)**
Always add explicit return types to public methods:
```typescript
// Bad
async getDocument(docPath: string) {
  return await this.cache.getDocument(docPath);
}

// Good
async getDocument(docPath: string): Promise<CachedDocument | null> {
  return await this.cache.getDocument(docPath);
}
```

### **Key Design Principle**
**ALWAYS use the existing markdown parsing tools** (`listHeadings()`, `buildToc()`, `insertRelative()`, `readSection()`) instead of manual string manipulation. The toolkit provides these tools specifically to avoid brittle string parsing that breaks on edge cases.

## TESTING AND DEVELOPMENT

### MCP Inspector Testing (REQUIRED)

#### **Development Workflow**
Use **ad hoc inspector sessions** - start only when testing, stop immediately after:

```bash
# Start inspector for testing
pnpm inspector:dev

# Test functionality in browser
# Stop inspector immediately: Ctrl+C
```

#### **Inspector Startup Process**
1. **Check for conflicts first:**
   ```bash
   lsof -i :6277  # Check proxy port  
   lsof -i :6274  # Check inspector port
   # Kill any running processes: kill <PID>
   ```

2. **Start fresh inspector:**
   ```bash
   pnpm inspector:dev
   ```

3. **Access URL:** Open the provided URL with pre-filled auth token:
   ```
   🔗 Open inspector with token pre-filled:
      http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=<token>
   ```

#### **Handoff Protocol**
**For user testing sessions:**
1. **Assistant**: Stop all background inspectors  
2. **User**: Start fresh inspector with `pnpm inspector:dev`
3. **User**: Test functionality, then stop with `Ctrl+C`
4. **Clean environment**: No persistent background processes

#### **Port Conflict Resolution**
If you encounter "PORT IS IN USE" errors:
```bash
# Method 1: Find and kill specific processes
lsof -i :6277 -i :6274  # Show what's using the ports
kill <PID1> <PID2> <PID3>  # Kill the specific process IDs

# Method 2: Kill by process pattern (more aggressive)
pkill -f "inspector.*tsx"
pkill -f "modelcontextprotocol"

# Method 3: One-liner to clear both ports
lsof -ti :6277,:6274 | xargs -r kill
```

**Common Cause**: Orphaned inspector processes that detached from Claude Code sessions but are still running in background.

### Common Development Issues & Solutions

#### 1. **Global Document Cache Initialization**
When testing DocumentManager programmatically:
```typescript
import { initializeGlobalCache } from './dist/document-cache.js';
import { DocumentManager } from './dist/document-manager.js';

// REQUIRED: Initialize cache before creating manager
initializeGlobalCache(docsRoot);
const manager = new DocumentManager(docsRoot);
```

#### 2. **ES Module Import Errors**
- Use `.js` extensions in import statements (TypeScript requirement)
- Use `import` syntax, not `require()` (ES modules enabled)
- Built files are in `dist/` directory, not `build/`

#### 3. **Archive Functionality Testing**
- Archive system creates `/archived` directory with audit trails
- Test files should be in `.spec-docs-mcp/docs/` structure
- Always verify both document movement AND audit file creation

#### 4. **Background Process Management**
- Use `run_in_background: true` for long-running commands
- Check process output with BashOutput tool
- Kill processes properly using KillBash tool or direct `kill` commands

### Integration Testing Workflow
1. **Start Inspector** → `pnpm inspector:dev`
2. **Run Quality Gates** → `pnpm check:all` (includes lint + typecheck + dead-code)
3. **Test CRUD Operations** → Use inspector interface
4. **Verify Archive System** → Create, then archive test documents
5. **Check Templates** → Verify `.spec-docs-mcp/templates/` accessibility

## Dead Code Prevention (MANDATORY)

**Quality Gate Requirements:**
```bash
# MUST pass before completion
pnpm check:dead-code     # Expected: "0 modules with unused exports"
pnpm check:all          # Runs all checks: lint + typecheck + dead-code
```

**Automated Detection:**
- Always run `pnpm check:all` before considering work complete
- Dead code detection enforced by strict ESLint rules and ts-unused-exports

**Prevention Guidelines:**
- Remove unused exports IMMEDIATELY after refactoring
- Delete helper functions when no longer needed
- Clean up old implementations after consolidation
- Verify all imports are actually used in the file

## CURRENT TOOL ARCHITECTURE

The server provides a comprehensive suite of MCP tools organized by function:

### **Core Document Management:**
- `create_document` - Progressive document creation with smart link guidance
- `browse_documents` - Unified browsing and searching with namespace awareness

### **Unified Content Operations:**
- `section` - Complete section management with operations:
  - Edit: `replace`, `append`, `prepend`
  - Create: `insert_before`, `insert_after`, `append_child` (auto-depth)
  - Delete: `remove`
  - Batch support for multiple operations

### **Unified Document Operations:**
- `manage_document` - Complete document lifecycle management:
  - `archive` - Safe archival with audit trails
  - `delete` - Permanent deletion
  - `rename` - Update document titles
  - `move` - Relocate documents

### **View & Inspection Tools:**
- `view_document` - Enhanced document inspection with comprehensive stats
- `view_section` - Clean section content viewer (no stats overhead)
- `view_task` - Clean task data viewer with status/priority info

### **Task Management:**
- `task` - Unified task operations: create, edit, list
- `complete_task` - Mark completed, get next task with linked documents

### **Key Tool Design Principles:**

1. **Consistent Field Names**: All tools use `document` field (not `path`) for consistency
2. **Multi-Item Support**: View tools support single or multiple items (arrays)
3. **Clean Separation**: View tools focus on content without stats overhead (except `view_document`)
4. **Progressive Discovery**: `create_document` uses staged parameter revelation
5. **Batch Operations**: Section and document management support batch operations
6. **Unified Operations**: Single tools handle related operations (create/edit/list for tasks)

## MCP ARCHITECTURE & TOOL DEVELOPMENT

### File Structure Organization

MCP tools follow a modular architecture with clear separation of concerns:

```
src/
├── session/                    # Session state management
│   ├── types.ts               # SessionState interface definitions
│   ├── session-store.ts       # Singleton SessionStore implementation
│   └── index.ts               # Re-exports
├── tools/
│   ├── types.ts               # ToolDefinition interface
│   ├── registry.ts            # Dynamic tool registration & visibility
│   ├── executor.ts            # Tool execution dispatcher
│   ├── schemas/               # Centralized schema definitions
│   │   └── [tool-name]-schemas.ts
│   └── implementations/       # Tool implementation logic
│       ├── [tool-name].ts    # Individual tool implementations
│       └── index.ts           # Re-exports
├── server/
│   ├── request-handlers/      # MCP request handling
│   │   └── tool-handlers.ts   # Tool list & execution handlers
│   └── server-factory.ts      # Server initialization
└── shared/
    └── utilities.ts           # Shared helper functions
```

### Progressive Discovery Pattern

The progressive discovery pattern allows tools to reveal parameters gradually, conserving context and guiding users through complex flows.

#### Key Concepts

1. **Staged Schema Evolution**: Tool schemas change based on session state
2. **Response-Driven Guidance**: Each response teaches the next valid parameters
3. **Context Conservation**: Minimal schemas reduce token usage
4. **Graceful Error Handling**: Errors provide helpful guidance, not exceptions

#### Implementation Pattern

For any tool implementing progressive discovery:

1. **Define Schema Stages** (`src/tools/schemas/[tool]-schemas.ts`):
```typescript
export const TOOL_SCHEMAS: Record<number, SchemaStage> = {
  0: { /* minimal schema */ },
  1: { /* intermediate schema */ },
  2: { /* full schema */ }
};
```

2. **Track Session State** (`src/session/types.ts`):
```typescript
export interface SessionState {
  sessionId: string;
  toolNameStage: number;  // Add stage tracking for your tool
}
```

3. **Implement Stage Logic** (`src/tools/implementations/[tool].ts`):
```typescript
export async function executeTool(
  args: Record<string, unknown>,
  state: SessionState,
  onStageChange?: () => void
): Promise<unknown> {
  // Determine current stage from args
  // Update session state if stage changes
  // Return stage-appropriate response
}
```

4. **Update Tool Registry** (`src/tools/registry.ts`):
```typescript
const toolSchema = getToolSchema(state.toolNameStage);
// Return dynamic schema based on session state
```

### Session State Management

#### Singleton Pattern
Always use the global SessionStore singleton for state persistence:

```typescript
import { getGlobalSessionStore } from '../session/session-store.js';

const sessionStore = getGlobalSessionStore();
sessionStore.updateSession(sessionId, { toolStage: newStage });
```

#### State Persistence Rules
- State persists within a session across multiple tool calls
- Each session maintains independent state
- Never create new SessionStore instances - always use the singleton
- State resets when session ends

### Tool Implementation Best Practices

1. **Centralize Schemas**: All schemas, examples, and constants in `src/tools/schemas/`
2. **Single Responsibility**: Each tool implementation in its own file
3. **Explicit Typing**: Always define return types and interfaces
4. **Error Recovery**: Return helpful guidance instead of throwing errors
5. **State Updates**: Update session state before triggering notifications

### MCP Inspector Testing

#### Testing Progressive Discovery

1. **Manual Refresh Required**: MCP Inspector doesn't auto-refresh on `tools/list_changed`
2. **Test Flow**:
   - Call tool with minimal params
   - Manually refresh tool list (pull down or click refresh)
   - Observe schema changes
   - Call with next stage params
   - Repeat until complete

3. **Programmatic Testing**:
```javascript
// Create test script as .cjs file for CommonJS
const commands = [
  { name: 'Initial tools/list', request: '{"method":"tools/list"}' },
  { name: 'Call tool', request: '{"method":"tools/call","params":{...}}' },
  { name: 'Verify schema update', request: '{"method":"tools/list"}' }
];
```

### Tool List Update Notifications

#### How It Works
When tool schemas need updating:
```typescript
void server.notification({
  method: 'notifications/tools/list_changed',
  params: {}
});
```

#### Important Limitations
- **Not universally supported**: Many MCP clients ignore these notifications
- **Manual intervention often required**: Users must refresh manually
- **Transport-level only**: LLMs don't see these notifications in context
- **Still useful**: Some clients DO respect them, so always send

### Adding New Tools Checklist

When implementing a new MCP tool:

- [ ] Create schema definitions in `src/tools/schemas/[tool]-schemas.ts`
- [ ] Add implementation in `src/tools/implementations/[tool].ts`
- [ ] Update SessionState interface if using progressive discovery
- [ ] Add tool to registry in `src/tools/registry.ts`
- [ ] Update executor switch statement in `src/tools/executor.ts`
- [ ] Export from `src/tools/implementations/index.ts`
- [ ] Write unit tests for the implementation
- [ ] Test with MCP Inspector including all stages
- [ ] Document any special behavior or limitations

### Common Patterns to Follow

#### Pattern: Centralized Constants
```typescript
// src/tools/schemas/tool-schemas.ts
export const TOOL_CONSTANTS = {
  TYPES: { /* ... */ },
  LIMITS: { /* ... */ },
  DEFAULTS: { /* ... */ }
};
```

#### Pattern: Response Consistency
```typescript
// Always return structured responses
return {
  stage: 'current_stage',
  data: { /* relevant data */ },
  next_step: 'Clear instruction',
  example: { /* valid example */ }
};
```

#### Pattern: Error Fallbacks
```typescript
// Instead of throwing errors
if (invalid) {
  return {
    stage: 'error_fallback',
    error: 'What went wrong',
    help: 'How to fix it',
    example: { /* correct usage */ }
  };
}
```

## CENTRAL ADDRESSING SYSTEM

### **🎯 Migration Complete - Unified Addressing Framework**

The central addressing system provides **type-safe, performant, and flexible addressing** for all document, section, and task operations across the MCP server. This comprehensive migration eliminated addressing inconsistencies and provides a foundation for scalable document management.

#### **✅ Migration Achievements**

**🚀 Core Module Implementation:**
- **New Framework**: `src/shared/addressing-system.ts` (435 lines of robust addressing logic)
- **Type Safety**: Comprehensive interfaces for `DocumentAddress`, `SectionAddress`, `TaskAddress`
- **Performance**: LRU caching with automatic eviction (1000 item limit)
- **Error Handling**: Custom error types with context (`AddressingError`, `DocumentNotFoundError`, `SectionNotFoundError`)
- **Flexibility**: Support for multiple input formats (`"section"`, `"#section"`, `"/doc.md#section"`)

**🔧 Complete Tool Migration:**
All 8 MCP tools successfully migrated to use central addressing:
- **View Tools**: `view-section.ts`, `view-task.ts`, `create-document.ts`
- **Core Editing**: `section.ts`, `task.ts`, `complete-task.ts`, `manage-document.ts`
- **Navigation**: `browse-documents.ts`

**🛡️ Issue Resolution:**
Systematically resolved all 6 critical issues from alpha testing:
1. **Data Integrity**: Section removal boundary preservation (no more data loss)
2. **Task Workflow**: Complete task system rebuild with structural analysis
3. **Content Retrieval**: Normalized slug handling for section viewing
4. **Address Flexibility**: Universal support for `"section"` and `"#section"` formats
5. **Document Persistence**: Verified working in `.spec-docs-mcp/docs/` structure
6. **Namespace Display**: Root documents correctly show `namespace: "root"`

#### **Document Addressing**
```typescript
// ALWAYS use absolute paths starting with /
const document = parseDocumentAddress('/api/specs/auth.md');

// Structure with comprehensive metadata:
interface DocumentAddress {
  readonly path: string;        // '/api/specs/auth.md'
  readonly slug: string;        // 'auth'
  readonly namespace: string;   // 'api/specs' (or 'root' for root-level)
  readonly normalizedPath: string; // '/api/specs/auth.md'
  readonly cacheKey: string;    // Cache optimization key
}
```

#### **Section Addressing with Format Flexibility**
```typescript
// ALL formats supported - choose what works best:
parseSectionAddress('overview', '/api/specs/auth.md');     // Context document
parseSectionAddress('#overview', '/api/specs/auth.md');   // With # prefix (user-friendly)
parseSectionAddress('/api/specs/auth.md#overview');       // Full path (absolute)

// Section structure with optimized caching:
interface SectionAddress {
  readonly document: DocumentAddress;
  readonly slug: string;        // Normalized, no # prefix
  readonly fullPath: string;    // '/api/specs/auth.md#overview'
  readonly cacheKey: string;    // Cache optimization key
}
```

#### **Task Addressing with Structural Intelligence**
```typescript
// Tasks identified by document structure, not naming conventions
const task = parseTaskAddress('initialize-project', '/project/setup.md');

// Task structure extends section with type safety:
interface TaskAddress {
  readonly document: DocumentAddress;
  readonly slug: string;
  readonly fullPath: string;
  readonly isTask: true;        // Type discrimination
  readonly cacheKey: string;
}

// Structural task identification (not slug-based):
const isTask = await isTaskSection(slug, document);
```

### **🎯 Standard Tool Integration Patterns**

#### **1. ToolIntegration.validateAndParse() Pattern**
**STANDARD PATTERN:** All tools should use this consistent validation approach:
```typescript
import { ToolIntegration } from '../shared/addressing-system.js';

export async function myTool(params: Record<string, unknown>) {
  // Standard validation with error handling
  const { addresses } = ToolIntegration.validateAndParse({
    document: params.document as string,
    ...(params.section && { section: params.section as string })
  });

  // Addresses are now validated, parsed, and cached
  const document = await manager.getDocument(addresses.document.path);
  const content = addresses.section
    ? await manager.getSectionContent(addresses.document.path, addresses.section.slug)
    : document.content;

  return {
    document_info: ToolIntegration.formatDocumentInfo(addresses.document, {
      title: document.metadata.title
    }),
    content
  };
}
```

#### **2. Standard Response Formatting**
```typescript
// Document info - consistent across all tools
const documentInfo = ToolIntegration.formatDocumentInfo(addresses.document, {
  title: document.metadata.title
});
// Returns: { slug: 'auth', title: 'Authentication Guide', namespace: 'api/specs' }

// Section/task path formatting
const sectionPath = ToolIntegration.formatSectionPath(addresses.section);
// Returns: '/api/specs/auth.md#overview'

const taskPath = ToolIntegration.formatTaskPath(addresses.task);
// Returns: '/project/setup.md#initialize-project (task)'
```

#### **3. Centralized Parser Usage**
```typescript
import {
  parseDocumentAddress,
  parseSectionAddress,
  parseTaskAddress
} from '../shared/addressing-system.js';

// Individual parsers for specific needs
const document = parseDocumentAddress('/api/specs/auth.md');
const section = parseSectionAddress('#overview', document.path);
const task = parseTaskAddress('setup-database', '/project/setup.md');

// Bulk validation for tool parameters
const { addresses } = ToolIntegration.validateAndParse({
  document: '/api/specs/auth.md',
  section: 'overview'  // or '#overview' - both work
});
```

#### **4. Performance and Caching**
```typescript
import { AddressingUtils } from '../shared/addressing-system.js';

// Cache management and debugging
const stats = AddressingUtils.getCacheStats();
// Returns: { documentCacheSize: 45, sectionCacheSize: 128, maxSize: 1000 }

// Clear cache for testing
AddressingUtils.clearCache();

// Format validation utilities
const isDocPath = AddressingUtils.looksLikeDocumentPath('/api/spec.md'); // true
const isSectionRef = AddressingUtils.looksLikeSectionReference('#overview'); // true
```

#### **5. Error Handling and Validation**
```typescript
import { AddressingError, DocumentNotFoundError } from '../shared/addressing-system.js';

try {
  const { addresses } = ToolIntegration.validateAndParse({
    document: '/invalid/path',
    section: '#missing-section'
  });
} catch (error) {
  if (error instanceof DocumentNotFoundError) {
    console.error(`Document not found: ${error.context.path}`);
  } else if (error instanceof AddressingError) {
    console.error(`Addressing error [${error.code}]: ${error.message}`);
    console.error('Context:', error.context);
  }
}
```

### **🎯 Migration Guidelines & Success Metrics**

#### **✅ Completed Migration Patterns**

**Before Migration (Inconsistent):**
```typescript
// OLD: Manual path parsing and inconsistent formats
const docPath = args.document;
const sectionSlug = args.section?.startsWith('#') ? args.section.substring(1) : args.section;
const namespace = docPath === '/root-file.md' ? 'root' : docPath.split('/')[1];
```

**After Migration (Standardized):**
```typescript
// NEW: Centralized addressing with validation
const { addresses } = ToolIntegration.validateAndParse({
  document: args.document,
  section: args.section  // Handles both 'section' and '#section' automatically
});

const documentInfo = ToolIntegration.formatDocumentInfo(addresses.document);
```

#### **🛠️ Migration Implementation Success**

**Tools Successfully Migrated:** 8/8 (100% completion)
1. ✅ `view-section.ts` - Fixed content retrieval with normalized addressing
2. ✅ `view-task.ts` - Structural task identification instead of slug prefixes
3. ✅ `section.ts` - Universal `#slug` and `slug` format support
4. ✅ `task.ts` - Complete rebuild with `getTaskHeadings()` structural analysis
5. ✅ `complete-task.ts` - Integrated with new task addressing system
6. ✅ `manage-document.ts` - Standardized document operations
7. ✅ `create-document.ts` - Progressive discovery with addressing validation
8. ✅ `browse-documents.ts` - Namespace consistency for root documents

#### **🎯 Quality Metrics Achieved**

**Code Quality Gates:** ✅ ALL PASSING
- **ESLint**: 0 errors, 0 warnings
- **TypeScript**: 0 compilation errors
- **Dead Code Detection**: 0 unused exports
- **Build System**: Clean compilation without warnings
- **Test Framework**: 253 tests passing across 7 test files

**Performance Improvements:**
- **LRU Caching**: Address parsing cached (1000 item limit)
- **Type Safety**: Compile-time validation prevents runtime errors
- **Error Context**: Rich error messages with debugging context
- **Memory Efficiency**: Automatic cache eviction prevents memory leaks

#### **🔧 Technical Debt Resolution**

**Eliminated Issues:**
1. **Inconsistent addressing** - All tools now use centralized parsers
2. **Manual slug handling** - Automated normalization with flexible input support
3. **Namespace calculation** - Centralized `pathToNamespace()` with 'root' handling
4. **Error handling** - Comprehensive custom error types with context
5. **Cache management** - Automatic LRU eviction and performance optimization

## Key Principles

1. **Follow Established Patterns** - The codebase has mature patterns, use them
2. **Schema Reuse** - Import from `src/tools/schemas/` instead of duplicating
3. **Test Everything** - See `docs/UNIT-TEST-STRATEGY.md` for testing requirements
4. **Quality Gates** - `pnpm check:all` MUST show zero issues
5. **No Dead Code** - Zero unused exports allowed (enforced by CI)
6. **MCP Compliance** - Use proper MCP patterns and error handling
7. **Production Ready** - Every change must pass ALL quality gates

## DEBUGGING PRINCIPLES

### **Never Mask Issues - Always Find Root Cause**
When encountering warnings or errors:

❌ **DON'T:** Hide warnings with grep, redirects, or suppression
✅ **DO:** Trace to the actual source and resolve properly
