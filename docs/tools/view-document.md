# view_document Tool Specification

## Overview

The `view_document` tool provides comprehensive document inspection with detailed statistics, metadata, and structural analysis. Unlike the minimal `view_section` and `view_task` tools, `view_document` returns complete document metadata including link analysis, task statistics, and hierarchical section information.

**Primary Use Case:** Deep document inspection for understanding document structure, content distribution, and completeness.

**Key Distinguisher:** This is the ONLY view tool that provides comprehensive statistics. Use `view_section` and `view_task` for clean content viewing without stats overhead.

## Tool Purpose

- **Comprehensive Inspection:** Detailed analysis of document structure, content, and metadata
- **Batch Document Viewing:** Support for viewing multiple documents in a single call
- **Link Analysis:** Internal, external, and broken link detection and reporting
- **Task Statistics:** Complete task counting and status distribution
- **Hierarchical Context:** Section relationships, TOC structure, and navigation aids
- **Linked Context Loading:** Optional loading of referenced documents via @reference syntax

## Input Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `document` | `string` or `string[]` | Document path(s) to view. Absolute paths from docs root (e.g., `/api/auth.md` or `["/api/auth.md", "/api/users.md"]`). Maximum 5 documents per call. |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `section` | `string` | `undefined` | Optional section slug for section-specific viewing. Filters document to show only specified section and its subsections. Supports both flat slugs (`"authentication"`) and hierarchical paths (`"api/auth/flows"`). Hash prefix (`#`) is normalized automatically. |
| `include_linked` | `boolean` | `false` | Whether to load context from linked documents referenced via `@/path/doc.md#section` syntax. Only loads for the first document when viewing multiple. |
| `link_depth` | `number` | `2` | Maximum depth for recursive linked context loading (1-6). Controls how many levels deep to follow @references. Higher values provide more context but increase response size. |

## Output Format

### Response Structure

```typescript
{
  // Array of document data (one per requested document)
  documents: [
    {
      // Core document information
      path: string;              // "/api/authentication.md"
      slug: string;              // "authentication"
      title: string;             // "Authentication Guide"
      namespace: string;         // "api" or "root" for root-level docs

      // Section information with hierarchical data
      sections: [
        {
          slug: string;          // "overview"
          title: string;         // "Overview"
          depth: number;         // 2 (heading level)
          full_path: string;     // "/api/authentication.md#overview"
          parent?: string;       // "authentication" (if subsection)
          hasContent: boolean;   // true if section has body content
          links: string[];       // ["@/api/tokens.md", "@/api/users.md#roles"]
        }
      ];

      // Comprehensive link analysis
      documentLinks: {
        total: number;           // Total link count in document
        internal: number;        // Internal document references (@refs)
        external: number;        // External HTTP/HTTPS links
        broken: number;          // Detected broken or invalid links
        sectionsWithoutLinks: string[];  // Sections lacking any links
      };

      // Task statistics (omitted if no tasks found)
      tasks?: {
        total: number;           // Total task count
        completed: number;       // Completed task count
        pending: number;         // Pending task count
        sections_with_tasks: string[];  // Task section slugs
      };

      // File metadata
      lastModified: string;      // ISO 8601 timestamp
      wordCount: number;         // Total word count
      headingCount: number;      // Total heading count
    }
  ];

  // Summary statistics (for multiple documents)
  summary: {
    total_documents: number;     // Number of documents returned
    total_sections: number;      // Sum of all sections
    total_words: number;         // Sum of all words
    total_tasks: number;         // Sum of all tasks
    section_filter?: string;     // If section parameter used
  };

  // Optional linked context (when include_linked=true)
  linked_context?: [
    {
      source_link: string;       // Original @reference
      document_path: string;     // Referenced document path
      section_slug?: string;     // Referenced section (if specified)
      content: string;           // Section or document content
      namespace: string;         // Document namespace
      title: string;             // Document title
      relevance: string;         // "primary" | "secondary" | "tertiary"
    }
  ];

  // Optional section context (single document + section only)
  section_context?: {
    current_section: string;     // Current section slug
    parent_sections: string[];   // Breadcrumb trail to root
    child_sections: string[];    // Direct children only
    sibling_sections: string[];  // Sections at same level
  };
}
```

## Workflow

### Single Document Viewing

1. **Validation:** Parse and validate document path using ToolIntegration
2. **Document Loading:** Retrieve document from DocumentManager cache
3. **Metadata Extraction:** Extract title, namespace, file statistics
4. **Section Analysis:** Build enhanced section list with links and hierarchy
5. **Link Analysis:** Count and categorize all document links
6. **Task Analysis:** Identify and analyze tasks (if present)
7. **Linked Context (Optional):** Load referenced documents if requested
8. **Response Assembly:** Construct comprehensive response with all data

### Multiple Document Viewing

1. **Validation:** Validate array of document paths (max 5)
2. **Batch Processing:** Process each document independently
3. **Summary Calculation:** Aggregate statistics across all documents
4. **Linked Context:** Only load for first document (avoid response bloat)
5. **Response Assembly:** Return array of document data plus summary

### Section-Specific Viewing

1. **Section Validation:** Normalize section slug (remove # prefix)
2. **Section Filtering:** Filter sections to target section + subsections
3. **Hierarchy Analysis:** Build parent/child/sibling relationships
4. **Context Building:** Construct section_context for navigation
5. **Response Assembly:** Include section context in response

## Integration Points

### DocumentManager Integration

```typescript
// Load document from cache
const document = await manager.getDocument(documentPath);

// Get section content for link analysis
const sectionContent = await manager.getSectionContent(documentPath, sectionSlug);

// Read full file for statistics
const { readFile, stat } = await import('node:fs/promises');
const fullContent = await readFile(absolutePath, 'utf-8');
const stats = await stat(absolutePath);
```

### Addressing System Integration

```typescript
import { ToolIntegration, parseDocumentAddress } from '../shared/addressing-system.js';

// Validate and parse document path
const { addresses } = ToolIntegration.validateAndParse({
  document: documentPath,
  ...(sectionSlug && { section: sectionSlug })
});

// Format document info consistently
const documentInfo = ToolIntegration.formatDocumentInfo(
  addresses.document,
  { title: document.metadata.title }
);
```

### Reference Extraction Integration

```typescript
import { ReferenceExtractor } from '../shared/reference-extractor.js';
import { ReferenceLoader } from '../shared/reference-loader.js';

// Extract @references from content
const extractor = new ReferenceExtractor();
const links = extractor.extractReferences(sectionContent);

// Load hierarchical linked context
const loader = new ReferenceLoader();
const hierarchy = await loader.loadReferences(
  normalizedRefs,
  manager,
  linkDepth
);
```

## Cache & State Management

### Document Cache Usage

```typescript
import { AccessContext } from '../document-cache.js';

// Documents are loaded with DIRECT context (standard eviction resistance)
const document = await manager.getDocument(
  documentPath,
  AccessContext.DIRECT
);

// Sections retrieved on-demand (not cached at section level)
const content = await manager.getSectionContent(documentPath, slug);
```

**Cache Characteristics:**
- **Document Metadata:** Cached with LRU eviction policy
- **Section Content:** Parsed on-demand from full document content
- **File Statistics:** Read fresh from filesystem for accuracy
- **Boost Factor:** 1.0x (standard eviction resistance)

### Session State

This tool does NOT use session state. All parameters are provided in each call.

## Statistics Calculation

### Document Statistics

| Statistic | Calculation Method | Purpose |
|-----------|-------------------|---------|
| `wordCount` | Split content by whitespace, filter empty strings | Content volume indicator |
| `headingCount` | Count of document.headings array length | Structure complexity |
| `lastModified` | Filesystem mtime from fs.stat() | Change tracking |

### Link Statistics

| Statistic | Calculation Method | Purpose |
|-----------|-------------------|---------|
| `total` | Count of all @references + external links | Link density |
| `internal` | Count of @/path/doc.md patterns | Cross-document references |
| `external` | Count of `http://` and `https://` links | External dependencies |
| `broken` | Basic validation (missing .md extension) | Link quality |
| `sectionsWithoutLinks` | Sections with zero extracted links | Content isolation indicator |

**Note:** Broken link detection is basic. It only checks for malformed @references. Full link validation would require existence checking.

### Task Statistics

| Statistic | Calculation Method | Purpose |
|-----------|-------------------|---------|
| `total` | Count of task headings under Tasks section | Workload volume |
| `completed` | Count where Status field = "completed" | Progress tracking |
| `pending` | Count where Status field != "completed" | Remaining work |
| `sections_with_tasks` | Array of task section slugs | Task location mapping |

**Task Identification:**
- Uses `getTaskHeadings()` from task-utilities.ts
- Relies on structural analysis (not slug naming conventions)
- Status extracted via `extractTaskStatus()` supporting multiple formats

## Use Cases & Examples

### Use Case 1: Basic Document Inspection

**Scenario:** Inspect a single document to understand its structure and content.

```json
{
  "document": "/api/authentication.md"
}
```

**Response Highlights:**
```json
{
  "documents": [{
    "path": "/api/authentication.md",
    "slug": "authentication",
    "title": "Authentication Guide",
    "namespace": "api",
    "sections": [
      {
        "slug": "overview",
        "title": "Overview",
        "depth": 2,
        "full_path": "/api/authentication.md#overview",
        "hasContent": true,
        "links": ["@/api/tokens.md", "@/api/users.md#roles"]
      }
    ],
    "documentLinks": {
      "total": 15,
      "internal": 12,
      "external": 3,
      "broken": 0,
      "sectionsWithoutLinks": []
    },
    "wordCount": 2847,
    "headingCount": 12,
    "lastModified": "2025-10-11T14:23:45.000Z"
  }],
  "summary": {
    "total_documents": 1,
    "total_sections": 12,
    "total_words": 2847,
    "total_tasks": 0
  }
}
```

### Use Case 2: Batch Document Analysis

**Scenario:** Compare multiple documents for completeness and structure.

```json
{
  "document": [
    "/api/authentication.md",
    "/api/authorization.md",
    "/api/tokens.md"
  ]
}
```

**Response Highlights:**
```json
{
  "documents": [
    {
      "path": "/api/authentication.md",
      "documentLinks": { "total": 15, "internal": 12 },
      "wordCount": 2847,
      "headingCount": 12
    },
    {
      "path": "/api/authorization.md",
      "documentLinks": { "total": 8, "internal": 6 },
      "wordCount": 1523,
      "headingCount": 8
    },
    {
      "path": "/api/tokens.md",
      "documentLinks": { "total": 5, "internal": 4 },
      "wordCount": 943,
      "headingCount": 6
    }
  ],
  "summary": {
    "total_documents": 3,
    "total_sections": 26,
    "total_words": 5313,
    "total_tasks": 0
  }
}
```

### Use Case 3: Section-Specific Analysis

**Scenario:** Analyze a specific section and its subsections with navigation context.

```json
{
  "document": "/api/authentication.md",
  "section": "jwt-tokens"
}
```

**Response Highlights:**
```json
{
  "documents": [{
    "sections": [
      {
        "slug": "jwt-tokens",
        "title": "JWT Tokens",
        "depth": 2,
        "parent": "authentication"
      },
      {
        "slug": "jwt-tokens/validation",
        "title": "Token Validation",
        "depth": 3,
        "parent": "jwt-tokens"
      }
    ]
  }],
  "summary": {
    "total_documents": 1,
    "total_sections": 2,
    "section_filter": "jwt-tokens"
  },
  "section_context": {
    "current_section": "jwt-tokens",
    "parent_sections": ["authentication"],
    "child_sections": ["jwt-tokens/validation", "jwt-tokens/refresh"],
    "sibling_sections": ["oauth-flows", "session-management"]
  }
}
```

### Use Case 4: Linked Context Loading

**Scenario:** Understand document with all its referenced context loaded.

```json
{
  "document": "/guides/getting-started.md",
  "include_linked": true,
  "link_depth": 3
}
```

**Response Highlights:**
```json
{
  "documents": [{
    "path": "/guides/getting-started.md",
    "sections": [
      {
        "slug": "prerequisites",
        "links": ["@/setup/installation.md", "@/setup/configuration.md#env"]
      }
    ]
  }],
  "linked_context": [
    {
      "source_link": "@/setup/installation.md",
      "document_path": "/setup/installation.md",
      "content": "# Installation\n\nFollow these steps...",
      "namespace": "setup",
      "title": "Installation Guide",
      "relevance": "primary"
    },
    {
      "source_link": "@/setup/configuration.md#env",
      "document_path": "/setup/configuration.md",
      "section_slug": "env",
      "content": "## Environment Variables\n\nConfigure the following...",
      "namespace": "setup",
      "title": "Configuration",
      "relevance": "primary"
    }
  ]
}
```

### Use Case 5: Task Progress Analysis

**Scenario:** Analyze document with tasks to track project progress.

```json
{
  "document": "/projects/migration.md"
}
```

**Response Highlights:**
```json
{
  "documents": [{
    "path": "/projects/migration.md",
    "tasks": {
      "total": 12,
      "completed": 7,
      "pending": 5,
      "sections_with_tasks": [
        "tasks/database-migration",
        "tasks/api-updates",
        "tasks/testing",
        "tasks/deployment"
      ]
    },
    "wordCount": 3421,
    "headingCount": 18
  }],
  "summary": {
    "total_documents": 1,
    "total_sections": 18,
    "total_words": 3421,
    "total_tasks": 12
  }
}
```

## Implementation Details

### Core Processing Functions

#### `processDocument()`
**Purpose:** Orchestrates complete document processing for single document.

**Flow:**
1. Extract metadata (title, namespace, file stats)
2. Analyze sections (structure, links, hierarchy)
3. Analyze document links (internal/external/broken)
4. Analyze tasks (if Tasks section exists)
5. Format and return comprehensive document data

#### `extractDocumentMetadata()`
**Purpose:** Extract document metadata including filesystem statistics.

**Returns:**
```typescript
{
  documentInfo: { slug, title, namespace };
  lastModified: string;  // ISO 8601 from fs.stat()
  wordCount: number;     // Split by whitespace
  headingCount: number;  // document.headings.length
  fullContent: string;   // For link analysis
}
```

#### `analyzeDocumentSections()`
**Purpose:** Build enhanced section information with hierarchical data.

**Features:**
- Section filtering (when section parameter provided)
- Link extraction using ReferenceExtractor
- Parent slug calculation using getParentSlug()
- Full path formatting using ToolIntegration
- Content presence detection

#### `analyzeDocumentLinks()`
**Purpose:** Comprehensive link analysis across entire document.

**Link Categorization:**
- **Internal:** @/path/doc.md patterns extracted by ReferenceExtractor
- **External:** HTTP/HTTPS links via regex matching
- **Broken:** Basic validation (missing .md extension check)
- **Sections Without Links:** Track content isolation

#### `analyzeDocumentTasks()`
**Purpose:** Identify and analyze tasks if Tasks section exists.

**Task Processing:**
1. Find Tasks section (slug="tasks" or title="Tasks")
2. Get task headings using getTaskHeadings()
3. Extract status for each task via extractTaskStatus()
4. Count completed vs pending tasks
5. Return statistics or undefined if no tasks

#### `buildSectionContext()`
**Purpose:** Build navigation context for section-specific viewing.

**Context Components:**
- **Parent Sections:** Breadcrumb trail to document root
- **Child Sections:** Direct children only (next depth level)
- **Sibling Sections:** Sections at same depth with same parent

### Helper Function Details

#### Word Count Calculation
```typescript
const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
```
- Splits on any whitespace (spaces, tabs, newlines)
- Filters empty strings from array
- Returns total count of non-empty words

#### Link Extraction Patterns
```typescript
// Internal links via ReferenceExtractor
const extractor = new ReferenceExtractor();
const allLinks = extractor.extractReferences(fullContent);

// External links via regex
const externalLinks = fullContent.match(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g) ?? [];
```

#### Status Extraction Formats
Supports multiple task metadata formats:
- `* Status: completed` (star format)
- `- Status: pending` (dash format)
- `**Status:** in_progress` (bold format)

### Performance Considerations

**Optimization Strategies:**
1. **Parallel Document Processing:** Multiple documents processed concurrently
2. **Single File Read:** Full content read once, parsed multiple times
3. **Cached Document Access:** Metadata and headings from cache
4. **On-Demand Section Parsing:** Section content loaded only when analyzing
5. **Linked Context Limit:** Only first document gets linked context in batch mode

**Performance Characteristics:**
- **Single Document:** ~50-100ms for typical document
- **Batch (5 docs):** ~200-400ms depending on document sizes
- **With Linked Context:** +100-300ms per depth level
- **Section Filtering:** Minimal overhead (filter operation only)

## Relationship to Other Tools

### Overlap with browse_documents

**browse_documents** also shows document statistics but with different focus:
- **browse_documents:** Discovery and search across all documents
- **view_document:** Deep inspection of specific documents

**When to use which:**
- Use `browse_documents` to find documents matching criteria
- Use `view_document` to inspect known documents in detail

### Complement with view_section

**view_section** provides clean content viewing without stats:
- **view_document:** Shows section list with links and hierarchy
- **view_section:** Returns actual section content without metadata

**Workflow:**
1. Use `view_document` to understand structure
2. Use `view_section` to read specific section content

### Complement with view_task

**view_task** provides clean task data viewing:
- **view_document:** Shows task counts and statistics
- **view_task:** Returns complete task data with references

**Workflow:**
1. Use `view_document` to see task distribution
2. Use `view_task` to work with specific tasks

## Edge Cases & Error Handling

### Document Not Found
**Scenario:** Requested document doesn't exist
**Handling:** Throws DocumentNotFoundError with context
```typescript
throw new DocumentNotFoundError(addresses.document.path);
```

### Section Not Found
**Scenario:** Section filter doesn't match any sections
**Handling:** Returns empty sections array (not an error)

### No Tasks Section
**Scenario:** Document has no Tasks section
**Handling:** Omits tasks field from response (undefined)

### Link Depth Out of Range
**Scenario:** link_depth parameter outside 1-6 range
**Handling:** Defaults to 2 silently
```typescript
if (!isValidLinkDepth(linkDepth)) {
  linkDepth = 2;
}
```

### Too Many Documents
**Scenario:** More than 5 documents requested
**Handling:** Validation error from ToolIntegration
```typescript
ToolIntegration.validateCountLimit(documents, 5, 'documents');
```

### File Read Errors
**Scenario:** Filesystem errors during stat/read operations
**Handling:** Graceful fallback for non-critical data
```typescript
try {
  const stats = await stat(absolutePath);
  lastModified = stats.mtime.toISOString();
} catch {
  lastModified = new Date().toISOString();  // Fallback to current time
}
```

## Security Considerations

### Path Validation
All document paths validated through ToolIntegration.validateAndParse() which:
- Prevents path traversal attacks
- Ensures paths stay within docs root
- Normalizes paths for consistency

### Reference Loading Limits
Linked context loading protected by:
- Maximum depth limit (1-6 levels)
- Timeout protection (30 seconds)
- Cycle detection (prevents infinite loops)
- Node limit (1000 total nodes)

### Resource Management
- Document cache with LRU eviction prevents memory exhaustion
- Batch processing limited to 5 documents per call
- Global heading limit enforced (100,000 total)

## Future Enhancements

### Potential Additions
1. **Enhanced Link Validation:** Actually check if referenced documents exist
2. **Content Similarity Analysis:** Compare documents for duplicate content
3. **Dependency Graph:** Build graph of document relationships via links
4. **Change Detection:** Track and report changes since last view
5. **Export Options:** Generate reports in different formats (JSON, CSV, Markdown)
6. **Custom Statistics:** Allow clients to request specific metrics
7. **Caching Layer:** Cache computed statistics for faster repeated access

### API Evolution Considerations
- Current API designed for extension without breaking changes
- Optional fields can be added to response without version bump
- Summary section designed to accept new aggregations
- Linked context structure supports additional metadata fields
