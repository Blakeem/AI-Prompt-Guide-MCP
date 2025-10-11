# manage_document Tool Specification

## Overview

The `manage_document` tool provides unified document lifecycle management for the AI-Prompt-Guide MCP server. It handles all document-level operations including archival with audit trails, permanent deletion, title renaming, and document relocation.

**Key Characteristics:**
- **Unified Interface** - Single tool for all document management operations
- **Safe Operations** - Archive-first approach with audit trails
- **Batch Support** - Process multiple operations in a single call
- **Type-Safe** - Uses central addressing system for validation
- **Cache Integration** - Automatic cache invalidation after changes

## Tool Identity

- **Name**: `manage_document`
- **Type**: MCP Tool
- **Category**: Document Management
- **Version**: 1.0.0

## Input Parameters

### Single Operation Mode

```typescript
{
  operation: 'archive' | 'delete' | 'rename' | 'move';
  document: string;              // Document path (e.g., "/api/specs.md")
  new_path?: string;            // Required for 'move' operation
  new_title?: string;           // Required for 'rename' operation
  confirm?: boolean;            // Required for 'delete' operation (must be true)
}
```

### Batch Operation Mode

```typescript
[
  {
    operation: 'archive' | 'delete' | 'rename' | 'move';
    document: string;
    new_path?: string;
    new_title?: string;
    confirm?: boolean;
  },
  // ... up to 100 operations
]
```

### Parameter Details

| Parameter | Type | Required | Operations | Description |
|-----------|------|----------|------------|-------------|
| `operation` | string | Yes | All | Operation type: `archive`, `delete`, `rename`, `move` |
| `document` | string | Yes | All | Absolute document path starting with `/` |
| `new_path` | string | Conditional | `move` | New document path (can be relative or absolute) |
| `new_title` | string | Conditional | `rename` | New document title (updates first heading) |
| `confirm` | boolean | Conditional | `delete` | Must be `true` to confirm permanent deletion |

### Validation Rules

1. **Document Path**
   - Must be non-empty string
   - Should start with `/` (auto-normalized if not)
   - Must end with `.md` extension
   - Validated through central addressing system

2. **Operation-Specific**
   - `archive`: No additional parameters required
   - `delete`: Requires `confirm: true` for safety
   - `rename`: Requires `new_title` (non-empty string)
   - `move`: Requires `new_path` (valid document path)

3. **Batch Operations**
   - Maximum 100 operations per batch
   - Array must contain valid operation objects
   - Each operation validated independently

## Output Format

### Archive Operation

```typescript
{
  action: 'archived';
  document: string;              // Original document path
  from: string;                  // Original path (same as document)
  to: string;                    // Archive path with timestamp
  audit_file: string;            // Path to audit trail file
  document_info: {
    slug: string;                // Document slug
    title: string;               // Document title
    namespace: string;           // Document namespace
  };
  timestamp: string;             // ISO 8601 timestamp
}
```

### Delete Operation

```typescript
{
  action: 'deleted';
  document: string;              // Deleted document path
  document_info: {
    slug: string;
    title: string;
    namespace: string;
  };
  timestamp: string;
}
```

### Rename Operation

```typescript
{
  action: 'renamed';
  document: string;              // Document path (unchanged)
  old_title: string;             // Previous title
  new_title: string;             // New title
  document_info: {
    slug: string;
    title: string;               // Updated title
    namespace: string;
  };
  timestamp: string;
}
```

### Move Operation

```typescript
{
  action: 'moved';
  document: string;              // New document path
  from: string;                  // Original path
  to: string;                    // New path (same as document)
  document_info: {
    slug: string;                // New slug from new path
    title: string;               // Document title
    namespace: string;           // New namespace from new path
  };
  timestamp: string;
}
```

### Batch Operation Response

```typescript
{
  batch_results: Array<{
    success: boolean;
    action?: string;             // Operation action if successful
    document?: string;           // Document path
    error?: string;              // Error message if failed
  }>;
  operations_completed: number;  // Count of successful operations
  total_operations: number;      // Total operations attempted
  timestamp: string;
}
```

## Operation Workflows

### Archive Operation

**Purpose**: Safely archive document with audit trail for potential recovery

**Workflow:**
1. Validate document path using addressing system
2. Check document exists in cache
3. Generate unique archive path with timestamp: `/archived/YYYY-MM-DD-HHmmss-{slug}.md`
4. Handle duplicate archive paths automatically
5. Move document to archive directory (creates directory if needed)
6. Create audit trail file at `{archive_path}.audit`
7. Invalidate document from cache
8. Return archive metadata

**Audit Trail Format:**
```json
{
  "originalPath": "/api/specs.md",
  "archivedAt": "2025-10-11T14:30:00.000Z",
  "archivedBy": "MCP Document Manager",
  "type": "file",
  "note": "Archived via MCP server"
}
```

**Side Effects:**
- Document moved from original location to `/archived/` directory
- Audit trail file created with `.audit` extension
- Cache entry invalidated
- File system modified (mv operation)

**Example:**
```typescript
// Input
{
  operation: 'archive',
  document: '/api/authentication.md'
}

// Output
{
  action: 'archived',
  document: '/api/authentication.md',
  from: '/api/authentication.md',
  to: '/archived/2025-10-11-143000-authentication.md',
  audit_file: '/archived/2025-10-11-143000-authentication.md.audit',
  document_info: {
    slug: 'authentication',
    title: 'Authentication Guide',
    namespace: 'api'
  },
  timestamp: '2025-10-11T14:30:00.000Z'
}
```

### Delete Operation

**Purpose**: Permanently delete document (destructive operation)

**Workflow:**
1. Validate document path and check exists
2. Verify `confirm: true` parameter (safety check)
3. Delete file from file system using `fs.unlink()`
4. Invalidate cache entry
5. Return deletion confirmation

**Safety Features:**
- Requires explicit `confirm: true` parameter
- Throws error if confirmation not provided
- No recovery possible after deletion
- Recommend using `archive` operation instead

**Side Effects:**
- Document permanently deleted from file system
- Cache entry invalidated
- No backup or audit trail created

**Example:**
```typescript
// Input
{
  operation: 'delete',
  document: '/temp/draft.md',
  confirm: true
}

// Output
{
  action: 'deleted',
  document: '/temp/draft.md',
  document_info: {
    slug: 'draft',
    title: 'Draft Document',
    namespace: 'temp'
  },
  timestamp: '2025-10-11T14:30:00.000Z'
}

// Error if missing confirmation
{
  error: 'Permanent deletion requires confirm: true',
  code: 'CONFIRMATION_REQUIRED',
  context: {
    document: '/temp/draft.md'
  }
}
```

### Rename Operation

**Purpose**: Update document title (first heading) without changing path

**Workflow:**
1. Validate document path and check exists
2. Validate `new_title` parameter
3. Read current document with file snapshot
4. Find first level-1 heading (title)
5. Update heading using `renameHeading()` utility
6. Write updated content with conflict detection
7. Invalidate cache entry
8. Reload document to get updated metadata
9. Return rename metadata

**Important Notes:**
- Only renames the **first level-1 heading** in the document
- Does **not** rename the file or change document path
- Document slug remains unchanged
- Cache automatically refreshed after rename

**Side Effects:**
- First level-1 heading text updated in document
- File modification time updated
- Cache entry invalidated and reloaded

**Example:**
```typescript
// Input
{
  operation: 'rename',
  document: '/api/authentication.md',
  new_title: 'Authentication & Authorization Guide'
}

// Output
{
  action: 'renamed',
  document: '/api/authentication.md',
  old_title: 'Authentication Guide',
  new_title: 'Authentication & Authorization Guide',
  document_info: {
    slug: 'authentication',        // Unchanged
    title: 'Authentication & Authorization Guide',
    namespace: 'api'
  },
  timestamp: '2025-10-11T14:30:00.000Z'
}
```

### Move Operation

**Purpose**: Relocate document to different path/namespace

**Workflow:**
1. Validate source document path and check exists
2. Validate and parse `new_path` parameter
3. Normalize new path (add `/` prefix and `.md` extension if needed)
4. Validate new path through addressing system
5. Create destination directory if doesn't exist
6. Move file using `fs.rename()`
7. Invalidate old cache entry
8. Load document from new location
9. Return move metadata with new addressing

**Path Normalization:**
- Adds `/` prefix if not present
- Adds `.md` extension if not present
- Creates nested directories automatically
- Validates new path format

**Side Effects:**
- Document moved to new location
- Old cache entry invalidated
- New cache entry created
- Document slug and namespace updated
- Nested directories created if needed

**Example:**
```typescript
// Input
{
  operation: 'move',
  document: '/drafts/new-feature.md',
  new_path: '/api/features/advanced-search.md'
}

// Output
{
  action: 'moved',
  document: '/api/features/advanced-search.md',
  from: '/drafts/new-feature.md',
  to: '/api/features/advanced-search.md',
  document_info: {
    slug: 'advanced-search',      // New slug from new path
    title: 'New Feature',         // Title unchanged
    namespace: 'api/features'     // New namespace
  },
  timestamp: '2025-10-11T14:30:00.000Z'
}

// Path normalization examples
new_path: 'api/auth.md'          -> '/api/auth.md'
new_path: '/api/auth'            -> '/api/auth.md'
new_path: 'api/auth'             -> '/api/auth.md'
```

## Integration Points

### DocumentManager

**Primary Integration:**
```typescript
import { DocumentManager } from '../../document-manager.js';

// Archive operation
const result = await manager.archiveDocument(addresses.document.path);

// Document retrieval
const document = await manager.getDocument(addresses.document.path);
```

**Methods Used:**
- `getDocument(path)` - Retrieve cached document for validation
- `archiveDocument(path)` - Archive with audit trail generation

### Central Addressing System

**Type-Safe Validation:**
```typescript
import { ToolIntegration, AddressingError } from '../../shared/addressing-system.js';

// Validate and parse document path
const { addresses } = ToolIntegration.validateAndParse({
  document: docPath
});

// Access validated addresses
addresses.document.path       // Normalized path
addresses.document.slug       // Document slug
addresses.document.namespace  // Document namespace
```

**Standard Utilities Used:**
- `ToolIntegration.validateAndParse()` - Parameter validation and parsing
- `ToolIntegration.validateStringParameter()` - String validation
- `ToolIntegration.validateDocumentParameter()` - Document path validation
- `ToolIntegration.validateOperation()` - Operation validation
- `ToolIntegration.formatDocumentInfo()` - Response formatting

### File System Operations

**Direct File System Access:**
```typescript
import { promises as fs } from 'node:fs';
import path from 'node:path';

// Delete operation
await fs.unlink(absolutePath);

// Move operation
await fs.mkdir(newDir, { recursive: true });
await fs.rename(oldAbsolutePath, newAbsolutePath);
```

**Utilities:**
- `fs.unlink()` - Permanent deletion
- `fs.rename()` - Move/rename files
- `fs.mkdir()` - Create directories recursively
- `fs.writeFile()` - Create audit trail files

### Section Management

**Rename Operation Integration:**
```typescript
import { renameHeading } from '../../sections.js';
import { readFileSnapshot, writeFileIfUnchanged } from '../../fsio.js';

// Read with conflict detection
const snapshot = await readFileSnapshot(absolutePath);

// Update heading
const updatedContent = renameHeading(snapshot.content, firstHeading.slug, newTitle);

// Write with conflict detection
await writeFileIfUnchanged(absolutePath, snapshot.mtimeMs, updatedContent);
```

### Document Cache

**Cache Invalidation:**
```typescript
import { getGlobalCache } from '../../document-cache.js';

const cache = getGlobalCache();

// Invalidate after modifications
cache.invalidateDocument(addresses.document.path);

// Reload to get updated metadata
const updatedDocument = await manager.getDocument(addresses.document.path);
```

**Cache Operations:**
- Automatic invalidation after all operations
- Fresh reload for rename operation
- Cache-aware archive path generation

## Cache & State Management

### Cache Invalidation Strategy

**Per-Operation Invalidation:**

| Operation | Cache Action | Reason |
|-----------|--------------|--------|
| `archive` | Invalidate original path | Document moved to archive |
| `delete` | Invalidate document | Document no longer exists |
| `rename` | Invalidate + Reload | Title metadata changed |
| `move` | Invalidate old path | Document relocated |

**Implementation:**
```typescript
// Immediate invalidation after file system changes
cache.invalidateDocument(addresses.document.path);

// Reload for metadata-changing operations
const updatedDocument = await manager.getDocument(addresses.document.path);
```

### State Consistency

**Guaranteed Consistency:**
1. **Atomic File Operations** - Uses `fs.rename()` for atomic moves
2. **Conflict Detection** - `writeFileIfUnchanged()` prevents concurrent modification races
3. **Cache Invalidation** - Immediate invalidation after file system changes
4. **Validation First** - Address validation before any modifications

**Error Recovery:**
- Validation errors occur before file system changes
- File system errors propagate without cache corruption
- Cache remains consistent even on operation failure

## Batch Processing

### Batch Characteristics

**Limits:**
- Maximum 100 operations per batch
- Sequential execution (not parallel)
- Individual error isolation
- Partial success support

**Batch Validation:**
```typescript
// Array validation
if (!Array.isArray(operations)) {
  throw new AddressingError('Operations parameter must be an array', 'INVALID_BATCH');
}

// Size validation
if (operations.length > MAX_BATCH_SIZE) {
  throw new AddressingError(
    `Batch size ${operations.length} exceeds maximum of ${MAX_BATCH_SIZE}`,
    'BATCH_TOO_LARGE'
  );
}

// Item validation
for (let i = 0; i < operations.length; i++) {
  const op = operations[i];
  if (op == null || typeof op !== 'object' || Array.isArray(op)) {
    throw new AddressingError(
      `Invalid operation at index ${i}: must be a non-null object`,
      'INVALID_BATCH_ITEM'
    );
  }
}
```

### Batch Execution

**Sequential Processing:**
```typescript
const batchResults = [];
let operationsCompleted = 0;

for (const op of operations) {
  try {
    // Validate parameters
    const operation = ToolIntegration.validateStringParameter(op.operation, 'operation');
    const docPath = ToolIntegration.validateDocumentParameter(op.document);

    // Execute operation
    const result = await performDocumentOperation(manager, operation, docPath, op);

    // Record success
    batchResults.push({
      success: true,
      action: result.action,
      document: result.document ?? docPath
    });
    operationsCompleted++;

  } catch (opError) {
    // Record failure, continue processing
    batchResults.push({
      success: false,
      document: op.document ?? 'unknown',
      error: opError.message
    });
  }
}
```

**Partial Success Handling:**
- Each operation validated independently
- Failures don't stop batch processing
- Success/failure tracked per operation
- Summary statistics in response

### Batch Response Example

```typescript
// Input
[
  { operation: 'archive', document: '/old/doc1.md' },
  { operation: 'delete', document: '/old/doc2.md', confirm: true },
  { operation: 'rename', document: '/invalid.md', new_title: 'New Title' },  // Will fail
  { operation: 'move', document: '/drafts/doc3.md', new_path: '/api/doc3.md' }
]

// Output
{
  batch_results: [
    {
      success: true,
      action: 'archived',
      document: '/old/doc1.md'
    },
    {
      success: true,
      action: 'deleted',
      document: '/old/doc2.md'
    },
    {
      success: false,
      document: '/invalid.md',
      error: 'Document not found: /invalid.md'
    },
    {
      success: true,
      action: 'moved',
      document: '/api/doc3.md'
    }
  ],
  operations_completed: 3,
  total_operations: 4,
  timestamp: '2025-10-11T14:30:00.000Z'
}
```

## Error Handling

### Error Types

**Addressing Errors:**
```typescript
// Document not found
{
  code: 'DOCUMENT_NOT_FOUND',
  message: 'Document not found: /invalid/path.md',
  context: { path: '/invalid/path.md' }
}

// Invalid operation
{
  code: 'INVALID_OPERATION',
  message: 'Invalid operation: invalid. Must be one of: archive, delete, rename, move',
  context: { operation: 'invalid', document: '/api/doc.md' }
}

// Missing confirmation
{
  code: 'CONFIRMATION_REQUIRED',
  message: 'Permanent deletion requires confirm: true',
  context: { document: '/api/doc.md' }
}

// Invalid parameter
{
  code: 'INVALID_PARAMETER',
  message: 'new_title parameter is required and must be a non-empty string',
  context: { operation: 'rename', document: '/api/doc.md' }
}
```

**Batch Errors:**
```typescript
// Empty batch
{
  code: 'EMPTY_BATCH',
  message: 'Batch operations array cannot be empty'
}

// Batch too large
{
  code: 'BATCH_TOO_LARGE',
  message: 'Batch size 150 exceeds maximum of 100',
  context: { batchSize: 150, maxSize: 100 }
}

// Invalid batch item
{
  code: 'INVALID_BATCH_ITEM',
  message: 'Invalid operation at index 2: must be a non-null object',
  context: { index: 2, value: null, type: 'object' }
}
```

### Error Recovery Patterns

**Validation First:**
```typescript
// All validation before any file system changes
const { addresses } = ToolIntegration.validateAndParse({ document: docPath });
const document = await manager.getDocument(addresses.document.path);

if (document == null) {
  throw new DocumentNotFoundError(addresses.document.path);
}

// Validation complete, now modify file system
```

**Operation-Specific Checks:**
```typescript
// Delete confirmation
if (operation === 'delete' && options.confirm !== true) {
  throw new AddressingError('Permanent deletion requires confirm: true', 'CONFIRMATION_REQUIRED');
}

// Rename requires new_title
if (operation === 'rename' && !options.new_title) {
  throw new AddressingError('Rename operation requires new_title parameter', 'INVALID_PARAMETER');
}
```

**Error Propagation:**
```typescript
try {
  // Perform operation
} catch (error) {
  // Re-throw addressing errors unchanged
  if (error instanceof AddressingError) {
    throw error;
  }

  // Wrap other errors
  throw new AddressingError(
    `Failed to manage document: ${error.message}`,
    'DOCUMENT_MANAGE_ERROR',
    { args, originalError: error.message }
  );
}
```

## Use Cases & Examples

### Use Case 1: Archive Old Documentation

**Scenario:** Archive deprecated API documentation for record-keeping

```typescript
// Single archive
{
  operation: 'archive',
  document: '/api/v1/endpoints.md'
}

// Response
{
  action: 'archived',
  document: '/api/v1/endpoints.md',
  from: '/api/v1/endpoints.md',
  to: '/archived/2025-10-11-143000-endpoints.md',
  audit_file: '/archived/2025-10-11-143000-endpoints.md.audit',
  document_info: {
    slug: 'endpoints',
    title: 'API v1 Endpoints',
    namespace: 'api/v1'
  },
  timestamp: '2025-10-11T14:30:00.000Z'
}

// Check audit trail
// File: /archived/2025-10-11-143000-endpoints.md.audit
{
  "originalPath": "/api/v1/endpoints.md",
  "archivedAt": "2025-10-11T14:30:00.000Z",
  "archivedBy": "MCP Document Manager",
  "type": "file",
  "note": "Archived via MCP server"
}
```

### Use Case 2: Batch Archive Multiple Documents

**Scenario:** Clean up multiple draft documents

```typescript
// Batch archive
[
  { operation: 'archive', document: '/drafts/idea1.md' },
  { operation: 'archive', document: '/drafts/idea2.md' },
  { operation: 'archive', document: '/drafts/old-notes.md' }
]

// Response
{
  batch_results: [
    { success: true, action: 'archived', document: '/drafts/idea1.md' },
    { success: true, action: 'archived', document: '/drafts/idea2.md' },
    { success: true, action: 'archived', document: '/drafts/old-notes.md' }
  ],
  operations_completed: 3,
  total_operations: 3,
  timestamp: '2025-10-11T14:30:00.000Z'
}
```

### Use Case 3: Update Document Title

**Scenario:** Rename document title to reflect updated content

```typescript
// Before state
// File: /guides/authentication.md
// Content: "# Auth Guide\n\n..."

// Rename operation
{
  operation: 'rename',
  document: '/guides/authentication.md',
  new_title: 'Complete Authentication Guide'
}

// Response
{
  action: 'renamed',
  document: '/guides/authentication.md',
  old_title: 'Auth Guide',
  new_title: 'Complete Authentication Guide',
  document_info: {
    slug: 'authentication',                    // Slug unchanged
    title: 'Complete Authentication Guide',   // Title updated
    namespace: 'guides'
  },
  timestamp: '2025-10-11T14:30:00.000Z'
}

// After state
// File: /guides/authentication.md (path unchanged)
// Content: "# Complete Authentication Guide\n\n..."
```

### Use Case 4: Reorganize Document Structure

**Scenario:** Move document from drafts to production API docs

```typescript
// Before state
// File exists: /drafts/websocket-api.md
// Namespace: drafts
// Slug: websocket-api

// Move operation
{
  operation: 'move',
  document: '/drafts/websocket-api.md',
  new_path: '/api/realtime/websockets.md'
}

// Response
{
  action: 'moved',
  document: '/api/realtime/websockets.md',     // New location
  from: '/drafts/websocket-api.md',           // Old location
  to: '/api/realtime/websockets.md',
  document_info: {
    slug: 'websockets',                       // New slug
    title: 'WebSocket API',                   // Title unchanged
    namespace: 'api/realtime'                 // New namespace
  },
  timestamp: '2025-10-11T14:30:00.000Z'
}

// After state
// File exists: /api/realtime/websockets.md (moved)
// File removed: /drafts/websocket-api.md
// Directory created: /api/realtime/ (if didn't exist)
```

### Use Case 5: Permanent Deletion with Safety

**Scenario:** Delete temporary test document (with confirmation)

```typescript
// Attempt without confirmation (FAILS)
{
  operation: 'delete',
  document: '/temp/test.md'
}

// Error response
{
  error: 'Permanent deletion requires confirm: true',
  code: 'CONFIRMATION_REQUIRED',
  context: { document: '/temp/test.md' }
}

// Correct deletion with confirmation
{
  operation: 'delete',
  document: '/temp/test.md',
  confirm: true
}

// Success response
{
  action: 'deleted',
  document: '/temp/test.md',
  document_info: {
    slug: 'test',
    title: 'Test Document',
    namespace: 'temp'
  },
  timestamp: '2025-10-11T14:30:00.000Z'
}

// After state
// File removed: /temp/test.md (permanently deleted)
// No audit trail created
// No recovery possible
```

### Use Case 6: Mixed Batch Operations

**Scenario:** Reorganize and clean up documentation in one batch

```typescript
// Mixed operations
[
  // Archive old version
  {
    operation: 'archive',
    document: '/api/v1/guide.md'
  },
  // Move current to versioned path
  {
    operation: 'move',
    document: '/api/guide.md',
    new_path: '/api/v2/guide.md'
  },
  // Update title of moved doc
  {
    operation: 'rename',
    document: '/api/v2/guide.md',
    new_title: 'API v2 Guide'
  },
  // Delete temporary file
  {
    operation: 'delete',
    document: '/temp/draft.md',
    confirm: true
  }
]

// Response
{
  batch_results: [
    { success: true, action: 'archived', document: '/api/v1/guide.md' },
    { success: true, action: 'moved', document: '/api/v2/guide.md' },
    { success: true, action: 'renamed', document: '/api/v2/guide.md' },
    { success: true, action: 'deleted', document: '/temp/draft.md' }
  ],
  operations_completed: 4,
  total_operations: 4,
  timestamp: '2025-10-11T14:30:00.000Z'
}
```

## Implementation Details

### Archive System

**Path Generation:**
```typescript
// Format: /archived/YYYY-MM-DD-HHmmss-{slug}.md
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const archivePath = `/archived/${timestamp}-${document.slug}.md`;

// Duplicate handling by PathHandler
// If /archived/2025-10-11-143000-auth.md exists
// Creates: /archived/2025-10-11-143000-auth-1.md
```

**Audit Trail Structure:**
```typescript
interface AuditInfo {
  originalPath: string;        // Original document location
  archivedAt: string;          // ISO 8601 timestamp
  archivedBy: string;          // Always "MCP Document Manager"
  type: 'file' | 'folder';     // Document type
  note: string;                // Always "Archived via MCP server"
}
```

**Directory Creation:**
- Archive directory (`/archived/`) created automatically
- Nested structures supported for future organization
- Permissions inherited from parent directory

### Rename Implementation

**Heading Update Process:**
```typescript
// 1. Find first level-1 heading
const titleHeadings = document.headings.filter(h => h.depth === 1);
const firstHeading = titleHeadings[0];

// 2. Update using section utilities
const updatedContent = renameHeading(
  snapshot.content,
  firstHeading.slug,
  newTitle
);

// 3. Write with conflict detection
await writeFileIfUnchanged(absolutePath, snapshot.mtimeMs, updatedContent);

// 4. Refresh cache
cache.invalidateDocument(addresses.document.path);
const updatedDocument = await manager.getDocument(addresses.document.path);
```

**Edge Cases:**
- No level-1 headings: Operation succeeds but no changes made
- Multiple level-1 headings: Only first heading updated
- Concurrent modifications: `writeFileIfUnchanged` prevents conflicts

### Move Path Normalization

**Normalization Rules:**
```typescript
// Add leading slash
const newPath = rawNewPath.startsWith('/') ? rawNewPath : `/${rawNewPath}`;

// Add .md extension
const finalNewPath = newPath.endsWith('.md') ? newPath : `${newPath}.md`;

// Examples:
'api/auth'           -> '/api/auth.md'
'/api/auth'          -> '/api/auth.md'
'api/auth.md'        -> '/api/auth.md'
'/api/auth.md'       -> '/api/auth.md'
```

**Directory Handling:**
```typescript
// Extract directory from new path
const newDir = path.dirname(newAbsolutePath);

// Create nested directories
await fs.mkdir(newDir, { recursive: true });

// Move file atomically
await fs.rename(oldAbsolutePath, newAbsolutePath);
```

### Performance Considerations

**Operation Costs:**

| Operation | I/O Operations | Cache Operations | Relative Cost |
|-----------|----------------|------------------|---------------|
| `archive` | Move + Write audit | Invalidate | Medium |
| `delete` | Unlink | Invalidate | Low |
| `rename` | Read + Write | Invalidate + Reload | Medium |
| `move` | Rename + Mkdir | Invalidate + Load | Medium |

**Optimization Strategies:**
- Batch operations process sequentially (no parallelization overhead)
- Cache invalidation immediate (no stale reads)
- File operations use atomic operations where possible
- Address validation cached within batch scope

**Batch Processing Cost:**
- Linear O(n) with number of operations
- No exponential overhead from dependencies
- Partial failures don't roll back successful operations
- Maximum 100 operations prevents resource exhaustion

## Operation Reference Table

| Operation | Parameters | Validation | File System | Cache | Audit Trail | Recoverable |
|-----------|------------|------------|-------------|-------|-------------|-------------|
| **archive** | `document` | Document exists | Move file | Invalidate | Yes | Yes (from archive) |
| **delete** | `document`, `confirm: true` | Document exists, confirm provided | Delete file | Invalidate | No | No (permanent) |
| **rename** | `document`, `new_title` | Document exists, new_title valid | Update content | Invalidate + Reload | No | Yes (undo via edit) |
| **move** | `document`, `new_path` | Both paths valid, dest available | Rename file, mkdir | Invalidate old, load new | No | Yes (move back) |

## Security Considerations

**Path Traversal Protection:**
- All paths validated through central addressing system
- Absolute paths enforced with leading `/`
- Path normalization prevents `..` traversal
- Document cache enforces docs root boundaries

**Destructive Operation Safety:**
- Delete requires explicit confirmation
- Archive creates audit trails for recovery
- Validation before any file system modifications
- Error messages don't leak sensitive paths

**Batch Operation Limits:**
- Maximum 100 operations prevents DoS
- Resource exhaustion prevention
- Individual operation isolation
- No cascading failures

## Testing Recommendations

**Unit Test Coverage:**
1. Single operation validation for each type
2. Batch validation (size limits, array validation)
3. Error handling for each error code
4. Cache invalidation verification
5. Audit trail format validation

**Integration Tests:**
1. Archive with audit trail verification
2. Move with directory creation
3. Rename with cache refresh
4. Delete with confirmation requirement
5. Batch operations with partial failures

**Edge Cases:**
1. Concurrent modifications during rename
2. Duplicate archive paths
3. Missing destination directories
4. Documents without level-1 headings
5. Invalid operation combinations in batch

## Related Tools

- **`create_document`** - Creates new documents (complementary to move/rename)
- **`view_document`** - Inspect documents before management operations
- **`browse_documents`** - Discover documents to manage
- **`section`** - Manage content within documents (section-level operations)

## Version History

- **1.0.0** (2025-10-11) - Initial specification
  - Unified document management operations
  - Central addressing system integration
  - Batch operation support
  - Archive with audit trails
  - Type-safe parameter validation

## Notes

**Design Decisions:**
1. **Archive-first approach** - Prefer `archive` over `delete` for safety
2. **Rename affects title only** - Document path remains unchanged for stability
3. **Batch operations sequential** - Prevents complex failure scenarios
4. **Explicit confirmation required** - Delete operations require user acknowledgment
5. **Audit trail for archive only** - Other operations reversible without audit

**Future Enhancements:**
- Folder-level archive support (currently individual files)
- Bulk rename patterns
- Archive browsing and restoration tools
- Operation undo/redo support
- Audit trail for all destructive operations
