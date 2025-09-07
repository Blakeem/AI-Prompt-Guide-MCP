# CLAUDE.md - Assistant Instructions for Spec-Docs MCP Server

## Project Overview

This is a Markdown CRUD toolkit for building an MCP server that allows full Create, Read, Update, and Delete operations on Markdown files. The toolkit uses deterministic slug-based addressing for sections and enforces strict duplicate heading prevention.

**Purpose:** Enable LLMs to manage specification documents programmatically without direct markdown manipulation, providing a clean interface for document CRUD operations through MCP tools.

**Key Features:**
- Slug-based section addressing (e.g., `#get-users-id`, `#api-limits-quotas`) 
- Hierarchical TOC generation and navigation
- Duplicate heading prevention among siblings
- File safety with precondition checks
- Comprehensive markdown parsing and serialization 

**Package Manager**: pnpm (NOT npm or yarn)
**Language**: TypeScript with strict mode enabled
**Runtime**: Node.js with ES modules

## CRITICAL CODE QUALITY REQUIREMENTS

### Quality Gates (ALL must pass)
**AFTER EVERY CODE CHANGE:**
1. Run `pnpm test:run` - ALL tests must pass (runs once, exits)
2. Run `pnpm lint` - ZERO errors and warnings allowed  
3. Run `pnpm typecheck` - ZERO type errors allowed
4. **Unit Testing**: ALL new features must include unit tests following `docs/UNIT-TEST-STRATEGY.md`

### Test Commands
- `pnpm test:run` - Run tests once and exit (for CI/validation)
- `pnpm test` - Watch mode for development (stays running)
- `pnpm test:coverage` - Run with coverage report

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
2. **Run Quality Gates** → `pnpm test:run && pnpm lint && pnpm typecheck`
3. **Test CRUD Operations** → Use inspector interface
4. **Verify Archive System** → Create, then archive test documents
5. **Check Templates** → Verify `.spec-docs-mcp/templates/` accessibility

## DEBUGGING PRINCIPLES

### **Never Mask Issues - Always Find Root Cause**
When encountering warnings or errors:

❌ **DON'T:** Hide warnings with grep, redirects, or suppression  
✅ **DO:** Trace to the actual source and resolve properly
