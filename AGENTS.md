# CLAUDE.md - Assistant Instructions for AI-Prompt-Guide MCP Server

## Project Overview

This is a comprehensive MCP server for intelligent AI prompt and guide document management. The server provides full Create, Read, Update, and Delete operations on interconnected Markdown documents with advanced linking, task management, and view capabilities.

**Purpose:** Enable LLMs to manage AI prompt guides and documentation programmatically through progressive discovery workflows, with automatic context loading from linked documents and comprehensive document analysis tools.

**Current Status:** Production-ready system with unified addressing framework and comprehensive quality gates.

**Key Features:**
- **Central Addressing System** - Unified, type-safe addressing for documents, sections, and tasks with LRU caching
- **Unified Reference Extraction** - Single source of truth for @reference pattern extraction across all tools
- **Hierarchical Document Loading** - Recursive reference loading with configurable depth and cycle detection
- **Advanced Document Linking** - Cross-document references with `@/path/doc.md#section` syntax in task and section content
- **Flat Section Addressing** - Unique slug addressing with automatic duplicate handling (e.g., `#overview`, `#tasks-1`)
- **Progressive Discovery Workflows** - 2-stage document creation (discovery → creation) for blank documents
- **Task Management System** - Complete task lifecycle with @references in content body for context loading
- **View Tools Suite** - Clean, focused viewing for documents, sections, and tasks
- **Unified Operations** - Single tools for related operations (section for content editing, task for task management)
- **Document Lifecycle Tools** - Focused tools for document operations (edit, delete, move)

**Package Manager**: pnpm (NOT npm or yarn)
**Language**: TypeScript with strict mode enabled
**Runtime**: Node.js with ES modules

## CONTEXT ENGINEERING & RESPONSE EFFICIENCY

**Critical Principle: Respect Context as a Precious Resource**

This project serves as MCP tooling for AI agents - every response consumes limited context. Practice excellent context engineering:

### Response Guidelines

**DO:**
- ✅ Provide minimal, actionable hints (e.g., "Use section tool with append_child on the slug")
- ✅ Return only required information in tool responses
- ✅ Use concise field names and values
- ✅ Reference information already present instead of duplicating it
- ✅ Provide exactly what's needed for the next step, nothing more

**DON'T:**
- ❌ Repeat information already in the response (e.g., don't echo back the slug value in instructions)
- ❌ Include verbose examples unless absolutely necessary
- ❌ Add explanatory text that could be inferred from field names
- ❌ Return large objects when a simple string suffices
- ❌ Duplicate data across multiple response fields

### Examples

**Good - Concise & Efficient:**
```json
{
  "success": true,
  "document": "/docs/api/auth.md",
  "slug": "auth",
  "next_step": "Use section tool with append_child on the slug"
}
```

**Bad - Wasteful & Redundant:**
```json
{
  "success": true,
  "document": "/docs/api/auth.md",
  "slug": "auth",
  "next_steps": {
    "description": "To add your first section to this newly created document",
    "action": "Use the section tool",
    "operation": "append_child",
    "target": "auth",
    "example": {
      "document": "/docs/api/auth.md",
      "operations": [{
        "section": "auth",
        "operation": "append_child",
        "title": "Your Section Title",
        "content": "Your content here"
      }]
    }
  }
}
```

**Context Savings:** The good example uses ~100 characters vs ~400+ in the bad example - a 75% reduction while providing the same actionable information.

### Implementation Pattern

When designing tool responses:
1. **Identify essential information** - What must the user know?
2. **Remove redundancy** - Is this already available elsewhere in the response?
3. **Use references** - Point to data instead of duplicating it
4. **Prefer hints over examples** - A brief hint is often sufficient
5. **Validate necessity** - Could this field be removed without losing functionality?

This principle applies to:
- Tool response objects
- Error messages
- Logging output
- Schema descriptions
- Documentation examples

**Remember:** Context efficiency isn't about being terse - it's about being precise and respectful of limited resources.

## CONFIGURATION

### Reference Extraction Depth
Control hierarchical reference loading depth with environment variable:

```bash
# .env or environment
REFERENCE_EXTRACTION_DEPTH=3  # Default: 3, Range: 1-5
```

**Configuration Details:**
- **Default**: 3 levels deep
- **Range**: 1-5 (validated, out-of-range values default to 3)
- **Purpose**: Controls how deep the system traverses @references when loading linked content
- **Use Cases**:
  - `1`: Direct references only (no recursive loading)
  - `3`: Balanced depth for most workflows (recommended)
  - `5`: Maximum depth for complex documentation trees

**Example Usage:**
```typescript
import { loadConfig } from './config.js';

const config = loadConfig();
const maxDepth = config.referenceExtractionDepth; // 1-5, default 3
```

## CRITICAL CODE QUALITY REQUIREMENTS

### Quality Gates (ALL must pass)
**AFTER EVERY CODE CHANGE:**
1. Run `pnpm test:run` - ALL tests must pass (runs once, exits)
2. Run `pnpm lint` - ZERO errors and warnings allowed
3. Run `pnpm typecheck` - ZERO type errors allowed
4. Run `pnpm check:dead-code` - ZERO unused exports allowed
5. Run `pnpm check:all` - Combined quality validation (recommended)
6. Test with MCP Inspector - `pnpm build && npx @modelcontextprotocol/inspector node dist/index.js`

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

## ERROR HANDLING STANDARDS

### Error Handling Consistency

All errors in the codebase follow a standardized pattern with **code**, **context**, and **version** information:

```typescript
function createError(message: string, code: string, context?: Record<string, unknown>): SpecDocsError {
  const error = new Error(message) as SpecDocsError;
  return Object.assign(error, {
    code,
    context: { ...context, version: packageJson.version }
  });
}
```

**Error Severity Classification:**
- **CRITICAL**: Operation cannot continue, throw error (e.g., path traversal, resource exhaustion)
- **IMPORTANT**: Log error, return error result (e.g., cache invalidation failure)
- **OPTIONAL**: Log warning, use fallback (e.g., configuration loading failure)

**Security Event Logging:**
All security violations are logged using `SecurityAuditLogger` for audit trail:
```typescript
import { SecurityAuditLogger } from './utils/security-audit-logger.js';

const securityAuditLogger = new SecurityAuditLogger();
securityAuditLogger.logSecurityViolation({
  type: 'PATH_TRAVERSAL',
  operation: 'read',
  attemptedPath: filePath,
  resolvedPath: relative(docsBasePath, resolvedPath),
  timestamp: new Date().toISOString()
});
```

### Resource Management Patterns

**Session Cleanup:**
- TTL: 24 hours
- LRU eviction at 1000 sessions
- Periodic cleanup every hour

**Cache Management:**
- Global heading limit: 100,000 total headings
- Document limit enforced via LRU eviction
- Automatic cleanup in destroy() methods

**File Watcher Recovery:**
- Error count tracking with exponential backoff
- Automatic fallback to polling mode after 3 failures
- 30-second polling interval for cache consistency

**Reference Loading Protection:**
- Maximum 1000 total nodes across all branches
- 30-second timeout for entire operation
- Cycle detection prevents exponential growth

## COMMON ESLINT ISSUES & SOLUTIONS

Based on practical experience implementing this system, here are the most common linting issues encountered and their proper solutions:

### 1. **Non-null Assertions (`@typescript-eslint/no-non-null-assertion`)**
Use explicit null checks with proper handling:
```typescript
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
Use `??` for null/undefined checks:
```typescript
const title = heading.title ?? 'Default Title';
const matches = content.match(regex) ?? [];
```

### 4. **Nullish Assignment (`@typescript-eslint/prefer-nullish-coalescing`)**
Use `??=` operator for conditional assignment:
```typescript
document.sections ??= new Map();
```

### 5. **String Concatenation (`prefer-template`)**
Use template literals:
```typescript
content = `${content}\n\n${tocPlaceholder}`;
```

### 6. **Strict Boolean Expressions (`@typescript-eslint/strict-boolean-expressions`)**
Use explicit comparisons:
```typescript
if (line != null && line !== '' && !line.startsWith('#')) { }
```

### 7. **Function Return Types (`@typescript-eslint/explicit-function-return-type`)**
Always add explicit return types to public methods:
```typescript
async getDocument(docPath: string): Promise<CachedDocument | null> {
  return await this.cache.getDocument(docPath);
}
```

### **Key Design Principles**

#### **Centralized Path Resolution with VirtualPathResolver**
**ALWAYS use VirtualPathResolver** for converting virtual document paths to absolute filesystem paths. This is the single source of truth for path resolution.

**Core Pattern:**
```typescript
// ✅ Correct - use VirtualPathResolver via DocumentManager
const absolutePath = manager.pathResolver.resolve(addresses.document.path);

// ❌ Wrong - manual path construction
const absolutePath = path.join(config.workspaceBasePath, addresses.document.path);

// ❌ Wrong - accessing private fields
const baseRoot = manager['docsRoot'];  // NEVER do this
```

**VirtualPathResolver Methods:**
- `resolve(virtualPath)` - Convert virtual path to absolute filesystem path
- `isCoordinatorPath(virtualPath)` - Check if path is in coordinator namespace
- `getArchivePath(virtualPath)` - Generate archive path with namespace preservation
- `getBaseRoot(virtualPath)` - Get base root directory for path

**Path Structure:**
- **Virtual paths**: `/api/auth.md`, `/coordinator/active.md` (NO /docs/ prefix)
- **Physical docs**: `.ai-prompt-guide/docs/api/auth.md`
- **Physical coordinator**: `.ai-prompt-guide/coordinator/active.md`
- **Archive docs**: `.ai-prompt-guide/archived/docs/api/auth.md`
- **Archive coordinator**: `.ai-prompt-guide/archived/coordinator/active.md`

**Why VirtualPathResolver:**
- Automatic routing to docs vs coordinator directories
- Namespace-aware archive path generation
- Centralized logic (no duplication)
- No private field access needed
- Easy to test and maintain

#### **Markdown Parsing**
**ALWAYS use the existing markdown parsing tools** (`listHeadings()`, `buildToc()`, `insertRelative()`, `readSection()`) instead of manual string manipulation. The toolkit provides these tools specifically to avoid brittle string parsing that breaks on edge cases.

#### **Task Identification Pattern**
Use structural analysis for task identification:
```typescript
import { isTaskSection } from '../shared/addressing-system.js';

const isTask = await isTaskSection(heading.slug, document);
if (isTask) {
  // Handle as task
}
```

#### **Archive Operations Pattern**
Capture actual return values from archive operations:
```typescript
const result = await manager.archiveDocument(addresses.document.path);
return {
  archived_to: result.archivePath,
  audit_file: result.auditPath
};
```

#### **Single GithubSlugger Instance**
Use a single GithubSlugger instance per document for automatic duplicate handling:
```typescript
const slugger = new GithubSlugger();
headings.forEach(heading => {
  heading.slug = slugger.slug(heading.title);  // Auto handles duplicates: task, task-1, task-2
});
```

#### **CachedDocument Access Pattern**
Access document.sections for content:
```typescript
const document = await manager.getDocument(path);
const sections = document.sections;  // Map<string, string>
const metadata = document.metadata;  // DocumentMetadata
```

## TESTING AND DEVELOPMENT

### MCP Inspector Testing (REQUIRED)

```bash
# Build first
pnpm build

# List tools (count varies based on enabled features)
npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/list

# Test specific tool
npx @modelcontextprotocol/inspector --cli node dist/index.js \
  --method tools/call \
  --tool-name test_connection \
  --tool-arg includeServerInfo=true

# Web UI
npx @modelcontextprotocol/inspector node dist/index.js
```

#### **Key Testing Practices**
- **Build First**: Always run `pnpm build` before MCP inspector testing
- **CLI Testing**: Use `--cli` flag for command-line testing of individual tools
- **Web UI**: Use web interface for interactive testing and exploration
- **Tool Validation**: Test all tool operations including edge cases and error scenarios

### Common Development Issues & Solutions

#### 1. **Global Document Cache Initialization**
When testing DocumentManager programmatically:
```typescript
import { initializeGlobalCache } from './dist/document-cache.js';
import { DocumentManager } from './dist/document-manager.js';

// REQUIRED: Initialize cache before creating manager
// docsRoot is the MCP workspace path (configured via MCP_WORKSPACE_PATH)
initializeGlobalCache(docsRoot);
const manager = new DocumentManager(docsRoot);
```

#### 2. **ES Module Import Errors**
- Use `.js` extensions in import statements (TypeScript requirement)
- Use `import` syntax, not `require()` (ES modules enabled)
- Built files are in `dist/` directory, not `build/`

#### 3. **Archive Functionality Testing**
- Archive system creates `/archived` directory with audit trails
- Test files should be in `.ai-prompt-guide/docs/` structure
- Always verify both document movement AND audit file creation

#### 4. **Background Process Management**
- Use `run_in_background: true` for long-running commands
- Check process output with BashOutput tool
- Kill processes properly using KillBash tool or direct `kill` commands

### **Critical Internal Utilities & Patterns**

#### **Section Boundary Handling**
Use `getSectionContentForRemoval()` for accurate removal reporting:
```typescript
import { getSectionContentForRemoval } from '../sections.js';

const contentToBeRemoved = getSectionContentForRemoval(document.content, sectionSlug);
return {
  removed_content: contentToBeRemoved,  // Excludes end boundary marker
  // ... other response data
};
```

#### **Unified Reference Extraction Pattern**
Use the centralized ReferenceExtractor for all @reference processing:
```typescript
import { ReferenceExtractor } from '../shared/reference-extractor.js';
import { ReferenceLoader } from '../shared/reference-loader.js';
import { loadConfig } from '../config.js';

// Extract and load references with hierarchical context
const config = loadConfig();
const extractor = new ReferenceExtractor();
const loader = new ReferenceLoader();

const refs = extractor.extractReferences(content);
const normalized = extractor.normalizeReferences(refs, documentPath);
const hierarchy = await loader.loadReferences(normalized, manager, config.referenceExtractionDepth);
```

#### **Unified Task Identification**
Use shared utilities for consistent task processing:
```typescript
import { enrichTaskWithReferences, extractTaskMetadata } from '../shared/task-view-utilities.js';

// Extract task metadata consistently
const metadata = extractTaskMetadata(taskContent);

// Enrich task with hierarchical references
const enrichedTask = await enrichTaskWithReferences(manager, documentPath, taskSlug, taskContent);
```

#### **Error Handling Patterns**
Use centralized addressing system error types for consistent error reporting:
```typescript
import {
  AddressingError,
  DocumentNotFoundError,
  SectionNotFoundError
} from '../shared/addressing-system.js';

try {
  const { addresses } = ToolIntegration.validateAndParse({ document: path, section: slug });
} catch (error) {
  if (error instanceof DocumentNotFoundError) {
    return {
      error: `Document not found: ${error.context.path}`,
      suggestion: 'Check document path and ensure it exists'
    };
  } else if (error instanceof SectionNotFoundError) {
    return {
      error: `Section '${error.context.slug}' not found in document`,
      available_sections: error.context.availableSections
    };
  }
  throw error;  // Re-throw unexpected errors
}
```

#### **Critical File System Utilities**
Check actual file structure - test against `.ai-prompt-guide/docs/` structure:
```bash
ls -la .ai-prompt-guide/docs/        # Check root documents
ls -la .ai-prompt-guide/docs/api/    # Check namespace structure
ls -la .ai-prompt-guide/archived/    # Check archive functionality
```

### Integration Testing Workflow
1. **Build & Test** → `pnpm build && pnpm check:all`
2. **MCP Inspector** → `npx @modelcontextprotocol/inspector node dist/index.js`
3. **Test CRUD Operations** → Use inspector interface
4. **Verify Archive System** → Create, then archive test documents
5. **Test Reference System** → Verify @reference extraction and hierarchical loading

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
- `create_document` - 2-stage progressive discovery (namespace selection → blank document creation)
- `browse_documents` - Unified browsing and searching with namespace awareness
- `search_documents` - Full-text and regex search across documents with context extraction

### **Unified Content Operations (Bulk-Only):**
- `section` - Bulk section operations via operations array:
  - Edit: `replace`, `append`, `prepend`
  - Create: `insert_before`, `insert_after`, `append_child` (auto-depth)
  - Delete: `remove`

### **Document Lifecycle Management:**
- `edit_document` - Edit document title and/or overview content
- `delete_document` - Delete or archive documents (archive parameter defaults to false)
- `move` - Move sections/tasks between documents with position control (before/after/child)
- `move_document` - Relocate document files to different paths/namespaces

### **View & Inspection Tools:**
- `view_document` - Enhanced document inspection with comprehensive stats
- `view_section` - Clean section content viewer (no stats overhead)
- `view_task` - Clean task data viewer with status

### **Task Management (Bulk-Only):**
- `task` - Bulk task operations via operations array: create, edit, list with @reference extraction
- `complete_task` - Mark completed, get next task with hierarchical reference loading
- `start_task` - Start or resume work on a task with full context injection

### **Key Tool Design Principles:**

1. **Consistent Field Names**: All tools use `document` field (not `path`) for consistency
2. **Multi-Item Support**: View tools support single or multiple items (arrays)
3. **Clean Separation**: View tools focus on content without stats overhead (except `view_document`)
4. **Progressive Discovery**: `create_document` uses 2-stage flow (discovery → creation)
5. **Bulk Operations**: `section` and `task` tools use operations array for all modifications
6. **Focused Operations**: Each tool has a clear, single purpose without irrelevant fields
7. **Data Safety**: Move operations create in new location BEFORE deleting from old

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

The progressive discovery pattern allows tools to reveal parameters gradually, conserving context and guiding users through workflows.

#### Key Concepts

1. **Staged Schema Evolution**: Tool schemas change based on session state
2. **Response-Driven Guidance**: Each response teaches the next valid parameters
3. **Context Conservation**: Minimal schemas reduce token usage
4. **Graceful Error Handling**: Errors provide helpful guidance, not exceptions

#### Current Implementation: create_document (2-Stage Flow)

**Stage 0 - Discovery:**
- Show available namespaces when no parameters provided
- Guide user to select namespace and provide title/overview

**Stage 1 - Creation:**
- Create blank document with title and overview
- Generate simple structure: title + overview + TOC placeholder
- No hardcoded templates or scaffolding

#### Implementation Pattern

For tools implementing progressive discovery:

1. **Define Schema Stages** (`src/tools/schemas/[tool]-schemas.ts`):
```typescript
export const TOOL_SCHEMAS: Record<number, SchemaStage> = {
  0: { /* discovery/minimal schema */ },
  1: { /* creation/full schema */ }
};
```

2. **Track Session State** (`src/session/types.ts`):
```typescript
export interface SessionState {
  sessionId: string;
  createDocumentStage: number;  // Stage tracking per tool
}
```

3. **Implement Stage Logic** (`src/tools/implementations/[tool].ts`):
```typescript
export async function executeTool(
  args: Record<string, unknown>,
  state: SessionState,
  onStageChange?: () => void
): Promise<unknown> {
  // Stage 0: Show discovery options
  // Stage 1: Execute creation with all params
}
```

4. **Update Tool Registry** (`src/tools/registry.ts`):
```typescript
const toolSchema = getToolSchema(state.createDocumentStage);
// Return dynamic schema based on session state
```

## WORKFLOW GUIDES AND DOCUMENTATION SYSTEM

The project includes static reference materials for document authors and AI agents:

### **Workflow Guides** (`.ai-prompt-guide/guides/`)
Static documentation teaching how to write effective documentation:
- `activate-guide-documentation.md` - Creating actionable guides and tutorials
- `activate-specification-documentation.md` - Writing technical specifications
- `documentation_standards.md` - Content organization and writing standards
- `research_best_practices.md` - Research guidelines
- And 6 more workflow guides

**Purpose:** Reference material for document authors (not loaded by MCP server)
**Management:** Direct file editing
**Audience:** Document authors and AI agents

### **Workflow Prompts** (`.ai-prompt-guide/workflows/`)
Structured workflow protocols with YAML frontmatter:
- `spec-first-integration.md` - Integration correctness protocol
- `multi-option-tradeoff.md` - Multi-criteria decision making
- `failure-triage-repro.md` - Bug reproduction workflows
- `simplicity-gate.md` - Simplicity checks
- And 4 more workflow protocols

**Purpose:** Reusable decision frameworks and workflows (not loaded by MCP server)
**Management:** Direct file editing
**Audience:** AI agents and developers
**Note:** Files use standard `.md` extension (not `.wfp.md`)

### **Document Creation**
The `create_document` MCP tool creates blank documents with no hardcoded templates:
- Simple structure: title + overview + TOC placeholder
- No namespace-specific scaffolding
- Users build document structure organically using `section` tool
- Workflow guides provide best practices for structure (if consulted)

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


## CENTRAL ADDRESSING SYSTEM

The central addressing system provides **type-safe, performant, and flexible addressing** for all document, section, and task operations across the MCP server.

**Core Features:**
- **Type Safety**: Comprehensive interfaces for `DocumentAddress`, `SectionAddress`, `TaskAddress`
- **Performance**: LRU caching with automatic eviction (1000 item limit)
- **Error Handling**: Custom error types with context (`AddressingError`, `DocumentNotFoundError`, `SectionNotFoundError`)
- **Flexibility**: Support for multiple input formats (`"section"`, `"#section"`, `"/doc.md#section"`)

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

#### **3. Error Handling and Validation**
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


## SYSTEMATIC ISSUE RESOLUTION WORKFLOW

### **The "Special Sauce" - Proven Systematic Approach**

Based on our successful alpha testing and comprehensive issue resolution, this systematic approach enables sustained productivity and quality outcomes:

#### **🎯 Core Workflow Principles**
1. **One Tool at a Time** - Never have multiple agents/developers working on the same tool simultaneously to avoid conflicts
2. **Evidence-Based Resolution** - Always replicate issues using MCP inspector before attempting fixes
3. **[Edit → Build → Test] Repeat Loop** - Mandatory cycle until acceptance criteria met
4. **Quality Gates Enforcement** - `pnpm check:all` must pass before considering work complete
5. **Comprehensive Regression Testing** - Test ALL functions of a tool after changes, not just the fixed function

#### **📋 Structured Task Management**
```markdown
## Per-Tool Task Packet Structure:
- **Clear Problem Statement** with original user wording
- **Steps to Replicate** using MCP inspector
- **Milestones & Acceptance Criteria** with explicit DoD (Definition of Done)
- **Non-Regression Checks** covering all tool functions
- **Evidence Requirements** (logs, screenshots, diffs, MCP inspector sessions)
```

#### **🔄 Agent-Based Issue Resolution Pattern**
1. **Coordinator** consolidates issues and slices work per tool with clear boundaries
2. **Specialist Agent** receives complete context, replicates issue, executes fix cycle
3. **Evidence Collection** with MCP inspector demonstrations and quality gate verification
4. **Knowledge Sharing** via structured notes capturing lessons learned and bad practices flagged

#### **🛠️ Technical Execution Standards**
```bash
# Mandatory quality verification cycle:
pnpm test:run      # ALL tests must pass
pnpm lint          # ZERO warnings/errors
pnpm typecheck     # ZERO type errors
pnpm check:dead-code # ZERO unused exports
pnpm build         # Build for MCP testing
npx @modelcontextprotocol/inspector node dist/index.js  # Manual testing
```

#### **📝 Documentation and Learning**
- **Capture Bad Practices** encountered with rationale and suggested replacements
- **Document Reusable Patterns** for future development
- **Evidence-Based Decisions** with comprehensive evaluation (e.g., hierarchical addressing evaluation)
- **Continuous Knowledge Updates** to prevent repeated mistakes

### **Why This Approach Works**
- **Prevents Tool Conflicts** - Sequential tool work eliminates merge conflicts and overlapping changes
- **Ensures Complete Testing** - MCP inspector usage catches integration issues missed by unit tests
- **Maintains Quality** - Rigid quality gates prevent technical debt accumulation
- **Knowledge Preservation** - Systematic documentation enables learning from every issue resolution
- **Sustained Productivity** - Clear structure allows extended work sessions (1+ hour) without degradation

## TYPE SAFETY AND CODE CONVENTIONS

### Enum Usage for Type Safety

**AccessContext Enum:**
Use the `AccessContext` enum (not string literals) for cache access context:
```typescript
import { AccessContext } from './document-cache.js';

// ✅ Correct - type-safe enum
const doc = await cache.getDocument(path, AccessContext.SEARCH);

// ❌ Wrong - string literal (will not compile)
const doc = await cache.getDocument(path, 'search');
```

**Available contexts:**
- `AccessContext.DIRECT` - Standard access (default)
- `AccessContext.SEARCH` - Search operations (3x eviction resistance)
- `AccessContext.REFERENCE` - Reference loading (2x eviction resistance)

### Nullish Coalescing Standard

Always use `??` operator for null/undefined checks:
```typescript
// ✅ Correct - only null/undefined trigger fallback
const value = param ?? 'default';

// ❌ Wrong - treats 0, '', false as falsy
const value = param || 'default';
```

### Structured Logging

Use structured logger (NOT console.log/warn/error):
```typescript
import { getGlobalLogger } from './utils/logger.js';
const logger = getGlobalLogger();

logger.warn('Failed to load reference', {
  reference: ref.originalRef,
  error: error instanceof Error ? error.message : String(error)
});
```

### Constants for Magic Numbers

Define constants for configuration values:
```typescript
// ✅ Correct - named constant with documentation
const TOC_UPDATE_DEBOUNCE_MS = 100;

setTimeout(() => {
  void this.updateTableOfContents(docPath);
}, TOC_UPDATE_DEBOUNCE_MS);
```

## Key Principles

1. **Follow Established Patterns** - The codebase has mature patterns, use them
2. **Schema Reuse** - Import from `src/tools/schemas/` instead of duplicating
3. **Test Everything** - See `docs/UNIT-TEST-STRATEGY.md` for testing requirements
4. **Quality Gates** - `pnpm check:all` MUST show zero issues
5. **No Dead Code** - Zero unused exports allowed (enforced by CI)
6. **MCP Compliance** - Use proper MCP patterns and error handling
7. **Production Ready** - Every change must pass ALL quality gates
8. **Systematic Workflow** - Use the proven ALPHA-TEST-WORKFLOW.md approach for complex issue resolution
9. **Type Safety** - Use enums and strong typing (AccessContext, error types)
10. **Resource Management** - Always implement cleanup in destroy() methods

## DEBUGGING PRINCIPLES

### **Never Mask Issues - Always Find Root Cause**
When encountering warnings or errors, trace to the actual source and resolve properly.
