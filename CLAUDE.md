# CLAUDE.md - Assistant Instructions for AI-Prompt-Guide MCP Server

## Project Overview

This is a comprehensive MCP server for intelligent AI prompt and guide document management. The server provides full Create, Read, Update, and Delete operations on interconnected Markdown documents with advanced linking, task management, and view capabilities.

**Purpose:** Enable LLMs to manage AI prompt guides and documentation programmatically through progressive discovery workflows, with automatic context loading from linked documents and comprehensive document analysis tools.

**Current Status:** Production-ready system with unified addressing framework and comprehensive quality gates.

**Key Features:**
- **Central Addressing System** - Unified, type-safe addressing for documents, sections, and tasks with LRU caching
- **Advanced Document Linking** - Cross-document references with `@/path/doc.md#section` syntax
- **Flat Section Addressing** - Unique slug addressing with automatic duplicate handling (e.g., `#overview`, `#tasks-1`)
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

#### **Essential Workflow**
Use **ad hoc inspector sessions** - start for testing, stop immediately after:

```bash
# Check for port conflicts first (if needed)
lsof -i :6277,:6274  # Show what's using ports 6277/6274

# Kill conflicting processes if found
lsof -ti :6277,:6274 | xargs -r kill

# Start inspector
pnpm inspector:dev
# 🔗 Open provided URL with pre-filled token: http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=<token>

# Test functionality, then stop: Ctrl+C
```

#### **Key Testing Practices**
- **Ad Hoc Sessions**: Start only when needed, stop immediately after testing
- **Clean Handoffs**: Assistant stops all background inspectors before user testing
- **Port Management**: Use one-liner to clear orphaned processes on ports 6274/6277
- **Evidence Collection**: Capture MCP inspector sessions for issue verification

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

#### **Unified Task Identification**
Use `getTaskHeadings()` for consistent task identification across all tools:
```typescript
import { getTaskHeadings } from '../tools/implementations/view-document.js';

export async function getTaskHeadings(document: CachedDocument): Promise<HeadingInfo[]> {
  const taskHeadings: HeadingInfo[] = [];

  for (const heading of document.headings) {
    const compatibleDocument = { content: document.sections.get(heading.slug) ?? '', headings: [] };
    const isTask = await isTaskSection(heading.slug, compatibleDocument);
    if (isTask) {
      taskHeadings.push(heading);
    }
  }

  return taskHeadings;
}
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
1. **Start Inspector** → `pnpm inspector:dev`
2. **Run Quality Gates** → `pnpm check:all` (includes lint + typecheck + dead-code)
3. **Test CRUD Operations** → Use inspector interface
4. **Verify Archive System** → Create, then archive test documents
5. **Check Templates** → Verify `.ai-prompt-guide/templates/` accessibility

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
pnpm inspector:dev # Manual testing with MCP inspector
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

## Key Principles

1. **Follow Established Patterns** - The codebase has mature patterns, use them
2. **Schema Reuse** - Import from `src/tools/schemas/` instead of duplicating
3. **Test Everything** - See `docs/UNIT-TEST-STRATEGY.md` for testing requirements
4. **Quality Gates** - `pnpm check:all` MUST show zero issues
5. **No Dead Code** - Zero unused exports allowed (enforced by CI)
6. **MCP Compliance** - Use proper MCP patterns and error handling
7. **Production Ready** - Every change must pass ALL quality gates
8. **Systematic Workflow** - Use the proven ALPHA-TEST-WORKFLOW.md approach for complex issue resolution

## DEBUGGING PRINCIPLES

### **Never Mask Issues - Always Find Root Cause**
When encountering warnings or errors, trace to the actual source and resolve properly.
