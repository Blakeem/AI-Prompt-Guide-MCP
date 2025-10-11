# Section Tool Specification

## Overview

The `section` tool is a unified section management tool providing comprehensive Create, Read, Update, and Delete (CRUD) operations on markdown sections. It serves as the primary interface for all section-level content manipulation, supporting both flat and hierarchical section addressing with automatic depth calculation and batch operation capabilities.

**Key Features:**
- **Unified Operations**: Single tool handles all section operations through the `operation` parameter
- **Batch Support**: Process multiple section operations in a single call
- **Hierarchical Addressing**: Full support for nested section paths (e.g., `api/auth/jwt-tokens`)
- **Automatic Depth Calculation**: `append_child` operation automatically determines correct heading depth
- **Link Analysis**: Optional analysis of @reference patterns in content
- **Central Addressing System**: Type-safe validation and caching through unified addressing infrastructure

## Input Parameters

### Core Parameters

#### `document` (required)
- **Type**: `string`
- **Description**: Absolute path to target document from document root
- **Format**: Must start with `/` and end with `.md`
- **Examples**:
  - `"/api/authentication.md"`
  - `"/guides/setup-guide.md"`
  - `"/api/specs/oauth-flows.md"`

#### `section` (required)
- **Type**: `string`
- **Description**: Section slug or reference section for placement
- **Format**: Supports flat slugs, hierarchical paths, and `#` prefix
- **Examples**:
  - `"overview"` - Flat section slug
  - `"#endpoints"` - With hash prefix (normalized automatically)
  - `"api/auth/flows"` - Hierarchical path

#### `content` (conditionally required)
- **Type**: `string`
- **Description**: Markdown content for the section
- **Required For**: All operations except `remove`
- **Not Required For**: `remove` operation
- **Supports**: Full markdown syntax including @reference links
- **Examples**:
  ```markdown
  "## Authentication\n\nThis section covers..."
  ```
  ```markdown
  "See @/api/auth.md#tokens for details.\n\n### Overview\n..."
  ```

#### `operation` (optional)
- **Type**: `string`
- **Default**: `"replace"`
- **Description**: Type of operation to perform
- **Values**: See [Operations Reference](#operations-reference)

#### `title` (conditionally required)
- **Type**: `string`
- **Description**: Heading title for new section
- **Required For**: Create operations (`insert_before`, `insert_after`, `append_child`)
- **Not Required For**: Edit and delete operations
- **Examples**:
  - `"Authentication"`
  - `"OAuth 2.0 Integration"`
  - `"JWT Token Validation"`

#### `analyze_links` (optional)
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Enable comprehensive link analysis and reference loading
- **Impact**: Adds `link_assistance` to response with hierarchical references

## Operations Reference

| Operation | Category | Purpose | Parameters Required | Auto-Depth |
|-----------|----------|---------|---------------------|------------|
| `replace` | Edit | Replace entire section content | `content` | No |
| `append` | Edit | Add content to end of section | `content` | No |
| `prepend` | Edit | Add content to beginning of section | `content` | No |
| `insert_before` | Create | Create section before reference | `content`, `title` | No |
| `insert_after` | Create | Create section after reference | `content`, `title` | No |
| `append_child` | Create | Create subsection under reference | `content`, `title` | Yes |
| `remove` | Delete | Delete section and all subsections | None | N/A |

### Edit Operations

#### `replace`
Completely replaces the content of an existing section while preserving the heading.

**Use Case**: Updating section content with new information

**Example**:
```json
{
  "document": "/api/auth.md",
  "section": "overview",
  "content": "New complete overview content...",
  "operation": "replace"
}
```

#### `append`
Adds content to the end of an existing section.

**Use Case**: Adding new information to existing section without replacing content

**Example**:
```json
{
  "document": "/api/auth.md",
  "section": "overview",
  "content": "\n\n## Additional Notes\n\nNew information...",
  "operation": "append"
}
```

#### `prepend`
Adds content to the beginning of an existing section (after the heading).

**Use Case**: Adding introductory content or important notes at section start

**Example**:
```json
{
  "document": "/api/auth.md",
  "section": "overview",
  "content": "> **Note**: This section has been updated.\n\n",
  "operation": "prepend"
}
```

### Create Operations

#### `insert_before`
Creates a new section immediately before the reference section at the same depth level.

**Use Case**: Adding a new section before existing content

**Example**:
```json
{
  "document": "/api/auth.md",
  "section": "jwt-tokens",
  "content": "Prerequisites for token management...",
  "operation": "insert_before",
  "title": "Prerequisites"
}
```

**Before**:
```markdown
## JWT Tokens
Token management details...
```

**After**:
```markdown
## Prerequisites
Prerequisites for token management...

## JWT Tokens
Token management details...
```

#### `insert_after`
Creates a new section immediately after the reference section at the same depth level.

**Use Case**: Adding a new section after existing content

**Example**:
```json
{
  "document": "/api/auth.md",
  "section": "overview",
  "content": "Detailed authentication flow...",
  "operation": "insert_after",
  "title": "Authentication Flow"
}
```

**Before**:
```markdown
## Overview
Basic authentication information...
```

**After**:
```markdown
## Overview
Basic authentication information...

## Authentication Flow
Detailed authentication flow...
```

#### `append_child`
Creates a new subsection as a child of the reference section with **automatic depth calculation**.

**Use Case**: Adding nested content under parent section

**Automatic Depth**: System calculates correct heading depth (parent depth + 1)

**Example**:
```json
{
  "document": "/api/auth.md",
  "section": "authentication",
  "content": "OAuth 2.0 implementation details...",
  "operation": "append_child",
  "title": "OAuth Flows"
}
```

**Before**:
```markdown
## Authentication
Parent section content...
```

**After**:
```markdown
## Authentication
Parent section content...

### OAuth Flows
OAuth 2.0 implementation details...
```

**Note**: If `authentication` is depth 2, the new section automatically becomes depth 3.

### Delete Operations

#### `remove`
Deletes the section and all its subsections completely.

**Use Case**: Removing deprecated or obsolete content

**Example**:
```json
{
  "document": "/api/auth.md",
  "section": "legacy-endpoints",
  "operation": "remove"
}
```

**Warning**: This operation is irreversible and removes all child sections.

## Output Format

### Single Operation Response

#### Edit/Create Success
```json
{
  "updated": true,  // or "created": true for create operations
  "document": "/api/auth.md",
  "section": "overview",
  "operation": "replace",
  "timestamp": "2025-10-11T12:34:56.789Z",
  "hierarchical_info": {
    "slug_depth": 2,
    "parent_slug": null
  },
  "hierarchical_context": null,  // null for flat sections
  "link_assistance": {
    "links_found": [],
    "link_suggestions": [],
    "syntax_help": {
      "detected_patterns": [],
      "correct_examples": [
        "@/path/to/doc.md",
        "@/path/to/doc.md#section"
      ],
      "common_mistakes": []
    }
  },
  "document_info": {
    "slug": "auth",
    "title": "Authentication Guide",
    "namespace": "api"
  }
}
```

#### Create Operation with Depth
```json
{
  "created": true,
  "document": "/api/auth.md",
  "new_section": "oauth-flows",
  "depth": 3,
  "operation": "append_child",
  "timestamp": "2025-10-11T12:34:56.789Z",
  "hierarchical_info": {
    "slug_depth": 3,
    "parent_slug": "authentication"
  },
  "hierarchical_context": null,
  "link_assistance": { /* ... */ },
  "document_info": { /* ... */ }
}
```

#### Remove Operation
```json
{
  "removed": true,
  "document": "/api/auth.md",
  "section": "legacy-endpoints",
  "removed_content": "## Legacy Endpoints\n\nDeprecated content...",
  "operation": "remove",
  "timestamp": "2025-10-11T12:34:56.789Z",
  "document_info": {
    "slug": "auth",
    "title": "Authentication Guide",
    "namespace": "api"
  }
}
```

### Batch Operation Response
```json
{
  "batch_results": [
    {
      "success": true,
      "section": "overview",
      "action": "edited"
    },
    {
      "success": true,
      "section": "migration-guide",
      "action": "created",
      "depth": 2
    },
    {
      "success": false,
      "section": "invalid-section",
      "error": "Section not found: invalid-section in /api/auth.md"
    }
  ],
  "document": "/api/auth.md",
  "sections_modified": 2,
  "total_operations": 3,
  "timestamp": "2025-10-11T12:34:56.789Z",
  "document_info": {
    "slug": "auth",
    "title": "Authentication Guide",
    "namespace": "api"
  }
}
```

## Operation Workflows

### Edit Workflow (Replace/Append/Prepend)

1. **Validation**: `ToolIntegration.validateAndParse()` validates document and section addresses
2. **Document Retrieval**: `DocumentManager.getDocument()` loads document with cache
3. **Section Verification**: Confirms section exists in document headings
4. **Content Processing**:
   - **Replace**: Direct content replacement
   - **Append**: Concatenates `currentContent + "\n\n" + newContent`
   - **Prepend**: Concatenates `newContent + "\n\n" + currentContent`
5. **Update Execution**: `DocumentManager.updateSection()` applies changes
6. **Cache Invalidation**: Document cache updated automatically
7. **TOC Update**: Table of contents refreshed if present
8. **Response Formatting**: Returns operation result with metadata

### Create Workflow (Insert Before/After/Append Child)

1. **Validation**: Address and parameter validation via ToolIntegration
2. **Document Retrieval**: Load target document
3. **Reference Section Verification**: Confirm reference section exists
4. **Depth Calculation**:
   - **insert_before/insert_after**: Use same depth as reference section
   - **append_child**: Automatically calculates `referenceDepth + 1`
5. **Slug Generation**: `titleToSlug()` generates unique slug from title
6. **Duplicate Check**: GithubSlugger ensures unique slug (adds `-1`, `-2` suffixes if needed)
7. **Insertion**: `DocumentManager.insertSection()` uses markdown parsing tools:
   - `insertRelative()` from `markdown-tools.ts`
   - Position determined by reference section
   - Proper AST manipulation for clean insertion
8. **Cache Invalidation**: Document cache refreshed
9. **TOC Update**: Table of contents updated
10. **Response Formatting**: Returns created section info with depth

### Delete Workflow (Remove)

1. **Validation**: Address validation and parsing
2. **Document Retrieval**: Load document with sections
3. **Section Verification**: Confirm section exists
4. **Content Capture**: `getSectionContentForRemoval()` captures content for response
5. **Deletion**: `deleteSection()` removes section and all subsections:
   - Uses `headingRange()` to identify section boundaries
   - Preserves end boundary marker to prevent data loss
   - Removes heading and all content until next same-or-higher level heading
6. **File Update**: Atomic write with snapshot validation
7. **Cache Invalidation**: Document cache cleared
8. **Response Formatting**: Returns removed content for audit/undo

## Integration Points

### Central Addressing System

All section operations leverage the unified addressing system for consistent validation and parsing:

```typescript
const { addresses } = ToolIntegration.validateAndParse({
  document: params.document,
  section: params.section
});

// addresses.document: DocumentAddress with path, slug, namespace
// addresses.section: SectionAddress with document, slug, fullPath
```

**Benefits**:
- Type-safe address objects with validation
- LRU caching for repeated operations
- Automatic normalization (#section → section)
- Hierarchical path support (api/auth/flows)

### Document Manager

Primary interface for all document operations:

- `getDocument(path)`: Retrieve cached document with metadata
- `updateSection(path, slug, content, options)`: Update existing section
- `insertSection(path, refSlug, mode, depth, title, content, options)`: Create new section
- `getSectionContent(path, slug)`: Read section content

### Markdown Parsing Tools

Low-level utilities used internally:

- `listHeadings(content)`: Extract all heading metadata
- `insertRelative(content, refSlug, mode, depth, title, body)`: Insert section relative to reference
- `replaceSectionBody(content, slug, newBody)`: Replace section content
- `deleteSection(content, slug)`: Remove section and subsections
- `getSectionContentForRemoval(content, slug)`: Capture content before deletion

**Why Not Call Directly?**: Tools are optimized for internal use, section tool provides:
- Parameter validation and error handling
- Document manager integration with caching
- Atomic file operations with snapshot validation
- TOC updates and link validation
- Consistent response formatting

### Section Addressing

Supports both flat and hierarchical section addressing:

**Flat Addressing**: `"overview"`, `"#endpoints"`
- Direct slug matching
- GithubSlugger handles disambiguation (overview, overview-1)

**Hierarchical Addressing**: `"api/auth/jwt-tokens"`
- Full path validation
- Parent-child relationship verification
- Automatic depth calculation
- Disambiguation at any path level

## Cache & State Management

### Document Cache

Section operations trigger automatic cache updates:

1. **Cache Read**: `DocumentManager.getDocument()` checks cache first
2. **Cache Hit**: Return cached document (fast path)
3. **Cache Miss**: Parse document, populate cache
4. **Cache Invalidation**: Any section modification invalidates document cache
5. **Auto-refresh**: Next read loads updated document

**Performance Impact**: Repeated section operations on same document benefit from caching.

### Address Cache

ToolIntegration uses batch-scoped address caching:

1. **Batch Start**: First address parse initializes batch cache
2. **Cache Hit**: Repeated addresses return cached parsed results
3. **Batch Complete**: Cache cleared after batch operation
4. **Auto-timeout**: 60-second timeout clears stale cache

**Batch Operations**: Address parsing cached across all operations in batch.

### File System Operations

All section operations use atomic file operations:

1. **Snapshot**: Read file with modification time
2. **Modify**: Apply section changes to content
3. **Validate**: Check file hasn't changed (mtimeMs comparison)
4. **Write**: Atomic write if validation passes
5. **Rollback**: Operation fails if file changed during modification

**Concurrency Safety**: Prevents concurrent modification conflicts.

## Batch Operations

### Batch Input Format

Pass array of operation objects instead of single operation:

```json
[
  {
    "document": "/api/auth.md",
    "section": "overview",
    "content": "Updated overview...",
    "operation": "replace"
  },
  {
    "document": "/api/auth.md",
    "section": "overview",
    "content": "New migration guide...",
    "operation": "insert_after",
    "title": "Migration Guide"
  }
]
```

### Batch Processing

1. **Validation**: Array and individual operation validation
2. **Size Limit**: Maximum 100 operations per batch
3. **Sequential Processing**: Operations processed in order
4. **Error Isolation**: Individual operation failures don't stop batch
5. **Result Collection**: Success/failure status for each operation
6. **Document Tracking**: Tracks all modified documents
7. **Cache Optimization**: Address cache shared across operations

### Batch Constraints

- **Maximum Size**: 100 operations (MAX_BATCH_SIZE constant)
- **Single Document Optimization**: Document info included if all operations target same document
- **Error Handling**: Failed operations return error in result, don't throw
- **Sequential Execution**: Operations execute sequentially, not parallel

## Use Cases & Examples

### Use Case 1: Update Documentation Section

**Scenario**: Replace outdated API documentation with current information

```json
{
  "document": "/api/endpoints.md",
  "section": "user-management",
  "content": "## User Management\n\nUpdated API documentation...",
  "operation": "replace"
}
```

**Result**: Section content completely replaced, TOC updated, cache invalidated.

### Use Case 2: Add Subsection to Existing Section

**Scenario**: Add OAuth details under authentication section

```json
{
  "document": "/api/auth.md",
  "section": "authentication",
  "content": "OAuth 2.0 implementation...",
  "operation": "append_child",
  "title": "OAuth Flows"
}
```

**Result**: New subsection created at correct depth (parent + 1), proper nesting maintained.

### Use Case 3: Reorganize Documentation Structure

**Scenario**: Insert prerequisites section before main content

```json
{
  "document": "/guides/setup.md",
  "section": "installation",
  "content": "Before installing...",
  "operation": "insert_before",
  "title": "Prerequisites"
}
```

**Result**: New section inserted before installation, all subsequent sections shift down.

### Use Case 4: Batch Update Multiple Sections

**Scenario**: Update overview and add new section in one operation

```json
[
  {
    "document": "/api/specs.md",
    "section": "overview",
    "content": "Updated overview...",
    "operation": "replace"
  },
  {
    "document": "/api/specs.md",
    "section": "overview",
    "content": "Migration guide content...",
    "operation": "insert_after",
    "title": "Migration Guide"
  }
]
```

**Result**: Both operations complete, single response with batch results.

### Use Case 5: Remove Deprecated Content

**Scenario**: Delete obsolete section and all subsections

```json
{
  "document": "/api/legacy.md",
  "section": "deprecated-endpoints",
  "operation": "remove"
}
```

**Result**: Section and all child sections deleted, content returned for audit.

### Use Case 6: Hierarchical Section Update

**Scenario**: Update deeply nested section using hierarchical path

```json
{
  "document": "/api/auth.md",
  "section": "authentication/oauth/client-credentials",
  "content": "Updated client credentials flow...",
  "operation": "replace"
}
```

**Result**: Correct section found via hierarchical path, content updated.

## Error Handling

### Common Errors

#### Document Not Found
```json
{
  "error": "Document not found: /invalid/path.md",
  "code": "DOCUMENT_NOT_FOUND",
  "context": {
    "path": "/invalid/path.md"
  }
}
```

#### Section Not Found
```json
{
  "error": "Section not found: missing-section in /api/auth.md",
  "code": "SECTION_NOT_FOUND",
  "context": {
    "slug": "missing-section",
    "documentPath": "/api/auth.md",
    "availableSections": ["overview", "authentication", "endpoints"]
  }
}
```

#### Missing Content
```json
{
  "error": "Content is required for all operations except remove",
  "code": "MISSING_CONTENT",
  "context": {
    "operation": "replace"
  }
}
```

#### Missing Title
```json
{
  "error": "Title is required for creation operation: append_child",
  "code": "MISSING_PARAMETER",
  "context": {
    "operation": "append_child",
    "requiredParameter": "title"
  }
}
```

#### Invalid Operation
```json
{
  "error": "Invalid operation: invalid_op. Must be one of: replace, append, prepend, insert_before, insert_after, append_child, remove",
  "code": "INVALID_OPERATION",
  "context": {
    "operation": "invalid_op",
    "allowedOperations": ["replace", "append", "prepend", "insert_before", "insert_after", "append_child", "remove"]
  }
}
```

#### Batch Size Exceeded
```json
{
  "error": "Batch size 150 exceeds maximum of 100",
  "code": "BATCH_TOO_LARGE",
  "context": {
    "batchSize": 150,
    "maxSize": 100
  }
}
```

### Error Recovery Strategies

1. **Document Not Found**: Verify document path, use `browse_documents` to find correct path
2. **Section Not Found**: Check `availableSections` in error context, use `view_document` to see structure
3. **Missing Parameters**: Review operation requirements in operations reference table
4. **Hierarchical Path Errors**: Try parent section first, verify path structure
5. **Batch Errors**: Review individual operation results in `batch_results` array

## Implementation Details

### Key Functions

#### `processSectionOperation()`
Handles individual section operation with full validation:
- Address parsing and validation
- Operation type validation
- Content requirement checking
- Delegates to `performSectionEdit()`

#### `performSectionEdit()`
Core section operation logic from `shared/section-operations.ts`:
- Document existence check
- Operation categorization (edit/create/delete)
- Section verification for edit/delete
- Automatic depth calculation for `append_child`
- File operations with snapshot validation

#### `handleBatchOperations()`
Manages batch processing:
- Array validation and size limits
- Sequential operation processing
- Error isolation per operation
- Document tracking for optimization
- Batch result aggregation

#### `handleSingleOperation()`
Processes single operation:
- Parameter validation
- Address parsing
- Operation execution
- Response formatting with document info

### Automatic Depth Calculation

The `append_child` operation uses automatic depth calculation:

```typescript
// Find reference heading
const refHeading = document.headings.find(h => h.slug === refSlug);

// Calculate child depth
const childDepth = refHeading.depth + 1;

// Validate depth is within valid range (1-6)
if (childDepth > 6) {
  throw new Error('Maximum heading depth exceeded');
}
```

**Benefits**:
- No manual depth specification required
- Correct nesting guaranteed
- Prevents depth errors
- Maintains document hierarchy integrity

### Slug Generation and Disambiguation

Uses GithubSlugger for unique slug generation:

```typescript
import GithubSlugger from 'github-slugger';

const slugger = new GithubSlugger();
const slug = slugger.slug(title);
// "overview" → "overview"
// "overview" → "overview-1" (if "overview" exists)
// "overview" → "overview-2" (if "overview" and "overview-1" exist)
```

**Automatic Disambiguation**: System handles slug conflicts automatically.

### Link Analysis Integration

When `analyze_links: true`:

1. **Reference Extraction**: `ReferenceExtractor` finds all @references in content
2. **Normalization**: References normalized relative to current document
3. **Hierarchical Loading**: `ReferenceLoader` loads referenced documents up to configured depth
4. **Legacy Analysis**: Backward-compatible link analysis for validation
5. **Response Enhancement**: `referenced_documents` added with hierarchical structure

**Configuration**: `REFERENCE_EXTRACTION_DEPTH` environment variable controls depth (default: 3)

## Tool Relationship Notes

### Section vs Task Tool

The section tool operates at the **section level** for general content management. For sections under the "Tasks" parent that follow task conventions, use the **task tool** instead:

- **Section Tool**: General section CRUD, any section in any document
- **Task Tool**: Task-specific operations (create, edit, complete, list) with status tracking

**Overlap**: Both tools can modify sections, but task tool adds task-specific workflows.

### Section vs View Tools

- **Section Tool**: Modification operations (edit, create, delete)
- **View Section Tool**: Read-only inspection with clean content view
- **View Document Tool**: Document-level inspection with comprehensive statistics

**Use Section Tool When**: Modifying content, creating/deleting sections, batch operations
**Use View Tools When**: Reading content, inspecting structure, analyzing document

## Performance Considerations

### Caching Strategy

1. **Address Cache**: Batch-scoped, 60-second timeout
2. **Document Cache**: Global LRU cache with automatic invalidation
3. **Cache Hit Rate**: High for repeated operations on same document
4. **Cache Invalidation**: Automatic on any modification

### Batch Optimization

1. **Address Reuse**: Single parse for repeated document/section addresses
2. **Sequential Processing**: Prevents race conditions, ensures consistency
3. **Document Tracking**: Optimized response when all operations target same document
4. **Error Isolation**: Failed operations don't impact successful operations

### File System Efficiency

1. **Atomic Operations**: Single read-modify-write per operation
2. **Snapshot Validation**: Prevents concurrent modification issues
3. **TOC Debouncing**: 100ms delay before TOC updates
4. **Batch File Operations**: Each operation writes independently (no transaction)

## Security & Validation

### Input Validation

1. **Document Path**: Must start with `/`, end with `.md`, no path traversal
2. **Section Slug**: Unicode normalization, dangerous character filtering, length limits
3. **Hierarchical Path**: Maximum 20 levels deep, 1000 characters total, 200 per component
4. **Content**: Maximum section body length enforced (configurable limit)

### Path Traversal Prevention

- No `..` components allowed in hierarchical paths
- No leading/trailing slashes in section slugs
- No double slashes (`//`) permitted
- Absolute paths required for documents

### Content Validation

- Unicode normalization (NFC) for all slugs
- Control character filtering
- Percent encoding rejection
- Markdown syntax validation

## Version Compatibility

The section tool is production-ready with stable API:

- **MCP Protocol**: Compatible with MCP specification
- **Addressing System**: Uses central addressing infrastructure
- **Document Manager**: Integrated with global document cache
- **Backward Compatible**: Response format includes both old and new hierarchical structures

**Breaking Changes**: None planned, tool API is stable
**Deprecation Notice**: None

## Summary

The section tool provides comprehensive, production-ready section management with:

- ✅ Unified interface for all section operations
- ✅ Batch operation support for efficiency
- ✅ Automatic depth calculation for hierarchical content
- ✅ Type-safe addressing with caching
- ✅ Atomic file operations for concurrency safety
- ✅ Comprehensive error handling and validation
- ✅ Integration with document cache and TOC system
- ✅ Support for both flat and hierarchical section addressing

**Best For**: General section CRUD operations, batch updates, documentation restructuring
**Integration Points**: DocumentManager, ToolIntegration, markdown parsing tools
**Related Tools**: task, view_section, view_document
