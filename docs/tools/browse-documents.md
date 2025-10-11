# browse_documents Tool Specification

## Overview

The `browse_documents` tool provides unified browsing and searching capabilities across the AI-Prompt-Guide document system. It operates in **two distinct modes** based on whether a search query is provided, offering both hierarchical navigation and full-text search functionality.

**Primary Use Cases:**
- **Browse Mode**: Navigate folder structures, explore document hierarchies, and discover document relationships
- **Search Mode**: Find documents by content, sections, or code snippets with relevance scoring

**When to Use This Tool:**
- Exploring document organization and namespace structure
- Searching for specific content across all documents
- Analyzing document relationships and dependencies
- Navigating to specific sections within documents
- Understanding document context before viewing detailed content

**Relationship to Other Tools:**
- Use `browse_documents` for **discovery and navigation**
- Use `view_document` for **detailed content inspection** of specific documents
- Use `view_section` for **focused reading** of specific sections

## Tool Modes

### Browse Mode (No Query)

**Activated When:** `query` parameter is empty/null or not provided

**Behavior:** Navigates folder/document structure based on `path` parameter
- **Folder Path** (e.g., `/api`, `/guides`): Lists subfolders and documents
- **Document Path** (e.g., `/api/auth.md`): Shows document sections with analysis
- **Section Path** (e.g., `/api/auth.md#jwt-tokens`): Shows subsections under target section

**Returns:**
- Folder/document structure
- Section hierarchy and metadata
- Optional document relationship analysis

### Search Mode (With Query)

**Activated When:** `query` parameter contains non-empty search terms

**Behavior:** Performs full-text search across all documents
- Searches titles, headings, content, and code blocks
- Returns ranked results with relevance scores
- Highlights matching snippets
- Respects `path` filter to limit search scope

**Returns:**
- Matching documents with relevance scores
- Search matches with snippets
- Limited by `limit` parameter

## Input Parameters

### Required Parameters

None - all parameters have defaults.

### Optional Parameters

#### `path` (string)
- **Description**: Directory to browse or search scope to limit results
- **Default**: `'/'` (root directory)
- **Format**: Absolute path starting with `/`
- **Examples**:
  - `'/'` - Root directory (browse all)
  - `'/api'` - API documentation folder
  - `'/guides'` - Guides folder
  - `'/api/specs/auth.md'` - Specific document
  - `'/api/specs/auth.md#jwt-tokens'` - Specific section

**Browse Mode Behavior:**
- Folder path → Lists contents of that folder
- Document path → Shows sections of that document
- Section path → Shows subsections under that section

**Search Mode Behavior:**
- Acts as a filter to limit search results to paths starting with this value
- Example: `path: '/api'` only returns results from `/api/*` documents

#### `query` (string)
- **Description**: Search terms for content search (activates search mode)
- **Default**: None (browse mode)
- **Format**: Free-text search query
- **Examples**:
  - `'authentication'` - Find documents about authentication
  - `'JWT token validation'` - Multi-word search
  - `'function getUserToken'` - Search in code blocks

**Special Behavior:**
- Empty string or omitted → Browse mode
- Non-empty string → Search mode with fuzzy matching

#### `depth` (number)
- **Description**: Maximum traversal depth for browsing (currently unused)
- **Range**: 1-5
- **Default**: 2
- **Note**: Reserved for future hierarchical traversal features

#### `limit` (number)
- **Description**: Maximum results returned in search mode
- **Range**: 1-50
- **Default**: 10
- **Applies To**: Search mode only (browse mode returns all results)

**Implementation:**
```typescript
const limitedDocuments = documents.slice(0, limit);
const limitedMatches = matches.slice(0, limit);
```

#### `include_related` (boolean)
- **Description**: Whether to include related document analysis
- **Default**: `false`
- **Applies To**: Document/section browse mode only
- **Performance Impact**: Adds document relationship traversal and analysis

**When Enabled:**
- Analyzes forward links (documents this document references)
- Analyzes backward links (documents that reference this document)
- Finds related documents by content similarity
- Builds dependency chains
- Generates implementation readiness assessment

#### `link_depth` (number)
- **Description**: Maximum depth for link traversal analysis
- **Range**: 1-6
- **Default**: 2
- **Applies To**: Only when `include_related: true`
- **Hard Limit**: Capped at 3 levels internally for safety

**Link Traversal:**
- **Depth 1**: Direct links only
- **Depth 2**: Links and their immediate links (default, recommended)
- **Depth 3+**: Deeper traversal (slower, more comprehensive)

## Output Format

### Browse Mode - Folder Structure

**Activated When:** Path targets a folder

```typescript
{
  path: string;              // Path browsed
  structure: {
    folders: FolderInfo[];   // Subfolders
    documents: DocumentInfo[]; // Documents in folder
  };
  breadcrumb?: string[];     // Navigation trail
  parentPath?: string;       // Parent folder path
  totalItems: number;        // Total folders + documents
}
```

#### FolderInfo Interface
```typescript
{
  name: string;              // Folder name
  path: string;              // Full folder path
  namespace: string;         // Namespace derived from path
  documentCount: number;     // Count of .md files in folder
  hasSubfolders: boolean;    // Whether folder contains subfolders
}
```

#### DocumentInfo Interface
```typescript
{
  path: string;              // Document path
  slug: string;              // Document slug (filename without .md)
  title: string;             // Document title (from first heading)
  namespace: string;         // Namespace derived from path
  sections: SectionSummary[]; // Section summaries
  lastModified: string;      // ISO timestamp
}
```

#### SectionSummary Interface (in DocumentInfo)
```typescript
{
  slug: string;              // Section slug
  title: string;             // Section title
  depth: number;             // Heading depth (1-6)
  full_path: string;         // '/doc.md#section'
  parent?: string;           // Parent slug for hierarchical sections
  hasContent: boolean;       // Whether section has content
}
```

### Browse Mode - Document/Section Structure

**Activated When:** Path targets a document or section

```typescript
{
  path: string;              // Path browsed
  structure: {
    folders: [];             // Empty in document mode
    documents: [];           // Empty in document mode
  };
  document_context: {
    path: string;            // Document path
    title: string;           // Document title
    namespace: string;       // Document namespace
    slug: string;            // Document slug
    current_section?: string; // Section slug if browsing section
  };
  sections: SectionInfo[];   // Section details
  related_documents?: RelatedDocuments; // If include_related: true
  implementation_readiness?: ImplementationReadiness; // If include_related: true
  breadcrumb?: string[];     // Navigation trail
  parentPath?: string;       // Parent path
  totalItems: number;        // Total sections
}
```

#### SectionInfo Interface
```typescript
{
  slug: string;              // Section slug (normalized, no #)
  title: string;             // Section title
  depth: number;             // Heading depth (1-6)
  full_path: string;         // '/doc.md#section'
  parent?: string;           // Parent slug for hierarchical sections
  content_preview?: string;  // First few lines of content
  subsection_count: number;  // Count of immediate child sections
  has_code_blocks: boolean;  // Whether section contains code blocks
  has_links: boolean;        // Whether section contains markdown links
}
```

### Browse Mode - Related Documents Analysis

**Activated When:** `include_related: true` in document browse mode

#### RelatedDocuments Interface
```typescript
{
  forward_links: RelatedDocument[];    // Documents this document references
  backward_links: RelatedDocument[];   // Documents referencing this document
  related_by_content: RelatedDocument[]; // Similar documents by content
  dependency_chain: DependencyNode[];  // Logical dependency sequence
}
```

#### RelatedDocument Interface
```typescript
{
  path: string;              // Related document path
  title: string;             // Document title
  namespace: string;         // Document namespace
  relationship: RelationshipType; // Relationship classification
  relevance?: number;        // Content similarity score (0-1)
  sections_linked?: string[]; // Sections linked from this document
  sections_linking?: string[]; // Sections linking to this document
  tasks_linked?: number;     // Count of linked tasks
  completion_status?: string; // Completion percentage
  shared_concepts?: string[]; // Shared keywords/concepts
}
```

#### RelationshipType Enum
```typescript
type RelationshipType =
  | 'implements_spec'      // Implementation of a specification
  | 'implementation_guide' // Guide for implementing something
  | 'consumes_api'         // Consumes an API
  | 'depends_on'           // General dependency
  | 'references'           // Generic reference
  | 'similar_content';     // Similar content (not explicitly linked)
```

#### DependencyNode Interface
```typescript
{
  sequence: number;          // Logical sequence (1, 2, 3...)
  path: string;              // Document path
  title: string;             // Document title
  status: 'completed' | 'in_progress' | 'pending';
  blocks?: string[];         // Paths blocked by this document
  depends_on?: string[];     // Paths this document depends on
}
```

**Dependency Chain Logic:**
1. **Specs** first (foundational documents)
2. **Guides** next (implementation guidance)
3. **Implementations** last (actual code/components)

#### ImplementationReadiness Interface
```typescript
{
  ready: boolean;            // All specs/guides completed
  confidence: 'high' | 'medium' | 'low'; // Confidence level
  missing: string[];         // Missing documents/specs
  recommendations: string[]; // What to complete next
  blockers: string[];        // Critical blocking issues
}
```

### Search Mode Output

**Activated When:** `query` parameter is provided

```typescript
{
  query: string;             // Search query used
  path?: string;             // Search scope filter
  structure: {
    folders: [];             // Empty in search mode
    documents: DocumentInfo[]; // Matching documents
  };
  matches: SearchMatch[];    // Individual search matches
  breadcrumb?: string[];     // Navigation trail for filtered search
  parentPath?: string;       // Parent path for filtered search
  totalItems: number;        // Total matching documents
}
```

#### SearchMatch Interface
```typescript
{
  document: string;          // Document path
  section: string;           // Section slug or 'document'
  snippet: string;           // Highlighted snippet with match
  relevance: number;         // Relevance score (0-10, rounded to 1 decimal)
}
```

**Search Boost Factors:**
- **Title matches**: 2.0x boost
- **Heading matches**: 1.5x boost
- **Code block matches**: 1.2x boost
- **Content matches**: 1.0x (baseline)

**Result Sorting:**
- Documents sorted by average relevance score (descending)
- Matches sorted by individual relevance score (descending)

### Common Response Fields

#### `breadcrumb` (string[])
Navigation trail from root to current location
```typescript
// Examples:
['/api']                          // Folder breadcrumb
['/api', '/api/specs']            // Nested folder breadcrumb
['/api', '/api/specs', '/api/specs/auth.md'] // Document breadcrumb
['/api', '/api/specs', '/api/specs/auth.md', '/api/specs/auth.md#jwt-tokens'] // Section breadcrumb
```

#### `parentPath` (string | undefined)
Parent path for navigation
- Undefined for root path `/`
- Document parent is its folder
- Section parent is its document
- Root-level documents have parent `'/'`

#### `totalItems` (number)
Total count of items returned
- Browse mode (folder): `folders.length + documents.length`
- Browse mode (document): `sections.length`
- Search mode: Total matching documents (before limit)

## Integration Points

### Document Cache

**Cache Usage:**
- Documents loaded via `DocumentCache.getDocument()`
- Section content via `DocumentCache.getSectionContent()`
- No caching of search results (always fresh)

**Access Context:**
- Browse operations use `AccessContext.DIRECT` (standard eviction)
- Search operations use `AccessContext.SEARCH` (3x eviction resistance)
- Related document analysis uses `AccessContext.REFERENCE` (2x eviction resistance)

**Cache Behavior:**
- First access loads from filesystem and parses
- Subsequent accesses return cached structure
- File watcher automatically invalidates on changes

### Addressing System

**Document Addressing:**
```typescript
const documentAddress = parseDocumentAddress(documentPath);
// Returns: { path, slug, namespace, normalizedPath, cacheKey }
```

**Section Addressing:**
```typescript
const sectionAddress = parseSectionAddress(sectionSlug, documentPath);
// Returns: { document, slug, fullPath, cacheKey }
```

**Validation:**
- All paths validated through addressing system
- Throws `AddressingError` for invalid paths
- Throws `DocumentNotFoundError` for missing documents
- Throws `SectionNotFoundError` for missing sections

### Search Engine

**Search Integration:**
```typescript
const results = await manager.searchDocuments(query, {
  searchIn: ['title', 'headings', 'content', 'code'],
  fuzzy: true,
  boost: {
    title: 2.0,
    headings: 1.5,
    code: 1.2
  },
  highlight: true,
  groupByDocument: true
});
```

**Search Features:**
- Fuzzy matching for typos
- Multi-field search with boost factors
- Snippet highlighting
- Grouped results by document

### Relationship Analysis

**Link Analysis:**
- Forward links: Parsed from markdown `[text](path)` patterns
- Backward links: Search-based (finds references to document)
- Content similarity: Keyword/concept matching

**Cycle Detection:**
```typescript
interface CycleDetectionContext {
  visited: Set<string>;      // Already visited documents
  currentPath: string[];     // Current traversal path
  depth: number;             // Current depth
  maxDepth: number;          // Maximum allowed depth (3)
}
```

**Prevents:**
- Infinite loops from circular references
- Excessive traversal depth
- Duplicate document processing

## Cache & State Management

### Document Cache Behavior

**Caching Strategy:**
- LRU (Least Recently Used) eviction
- Boost-aware eviction scores
- Max 100 documents cached (configurable)

**Boost Factors:**
- Search access: 3.0x eviction resistance
- Reference access: 2.0x eviction resistance
- Direct access: 1.0x (baseline)

**Cache Operations:**
```typescript
// Browse operation - direct access
const doc = await cache.getDocument(docPath, AccessContext.DIRECT);

// Search operation - search access (higher retention)
const doc = await cache.getDocument(docPath, AccessContext.SEARCH);

// Related document analysis - reference access
const doc = await cache.getDocument(docPath, AccessContext.REFERENCE);
```

### Addressing Cache

**Batch-Scoped Caching:**
- Cache lifetime tied to single operation
- Automatic timeout after 60 seconds
- No persistent caching across tool calls

**Invalidation:**
- Document changes trigger cache invalidation
- Section addresses invalidated with document
- File watcher maintains consistency

### Session State

**No Session State:**
This tool does not maintain session state. Each call is independent.

## Use Cases & Examples

### Use Case 1: Browse Root Directory

**Scenario:** Explore all available documentation

**Input:**
```typescript
{
  path: '/'
}
```

**Output:**
```typescript
{
  path: '/',
  structure: {
    folders: [
      {
        name: 'api',
        path: '/api',
        namespace: 'api',
        documentCount: 5,
        hasSubfolders: true
      },
      {
        name: 'guides',
        path: '/guides',
        namespace: 'guides',
        documentCount: 12,
        hasSubfolders: false
      }
    ],
    documents: [
      {
        path: '/README.md',
        slug: 'README',
        title: 'Documentation Index',
        namespace: 'root',
        sections: [...],
        lastModified: '2025-01-15T10:30:00.000Z'
      }
    ]
  },
  totalItems: 3
}
```

### Use Case 2: Browse Specific Folder

**Scenario:** Explore API documentation folder

**Input:**
```typescript
{
  path: '/api'
}
```

**Output:**
```typescript
{
  path: '/api',
  structure: {
    folders: [
      {
        name: 'specs',
        path: '/api/specs',
        namespace: 'api/specs',
        documentCount: 3,
        hasSubfolders: false
      }
    ],
    documents: [
      {
        path: '/api/overview.md',
        slug: 'overview',
        title: 'API Overview',
        namespace: 'api',
        sections: [...],
        lastModified: '2025-01-15T10:30:00.000Z'
      }
    ]
  },
  breadcrumb: ['/api'],
  parentPath: '/',
  totalItems: 2
}
```

### Use Case 3: Browse Document Sections

**Scenario:** View all sections in an authentication document

**Input:**
```typescript
{
  path: '/api/specs/auth.md'
}
```

**Output:**
```typescript
{
  path: '/api/specs/auth.md',
  structure: {
    folders: [],
    documents: []
  },
  document_context: {
    path: '/api/specs/auth.md',
    title: 'Authentication Specification',
    namespace: 'api/specs',
    slug: 'auth'
  },
  sections: [
    {
      slug: 'overview',
      title: 'Overview',
      depth: 1,
      full_path: '/api/specs/auth.md#overview',
      content_preview: 'This document specifies...',
      subsection_count: 0,
      has_code_blocks: false,
      has_links: true
    },
    {
      slug: 'jwt-tokens',
      title: 'JWT Tokens',
      depth: 1,
      full_path: '/api/specs/auth.md#jwt-tokens',
      subsection_count: 2,
      has_code_blocks: true,
      has_links: true
    }
  ],
  breadcrumb: ['/api', '/api/specs', '/api/specs/auth.md'],
  parentPath: '/api/specs',
  totalItems: 2
}
```

### Use Case 4: Browse Section Subsections

**Scenario:** View subsections under JWT Tokens section

**Input:**
```typescript
{
  path: '/api/specs/auth.md#jwt-tokens'
}
```

**Output:**
```typescript
{
  path: '/api/specs/auth.md#jwt-tokens',
  structure: {
    folders: [],
    documents: []
  },
  document_context: {
    path: '/api/specs/auth.md',
    title: 'Authentication Specification',
    namespace: 'api/specs',
    slug: 'auth',
    current_section: 'jwt-tokens'
  },
  sections: [
    {
      slug: 'jwt-tokens/generation',
      title: 'Token Generation',
      depth: 2,
      full_path: '/api/specs/auth.md#jwt-tokens/generation',
      parent: 'jwt-tokens',
      subsection_count: 0,
      has_code_blocks: true,
      has_links: false
    },
    {
      slug: 'jwt-tokens/validation',
      title: 'Token Validation',
      depth: 2,
      full_path: '/api/specs/auth.md#jwt-tokens/validation',
      parent: 'jwt-tokens',
      subsection_count: 1,
      has_code_blocks: true,
      has_links: true
    }
  ],
  breadcrumb: ['/api', '/api/specs', '/api/specs/auth.md', '/api/specs/auth.md#jwt-tokens'],
  parentPath: '/api/specs/auth.md',
  totalItems: 2
}
```

### Use Case 5: Analyze Document Relationships

**Scenario:** Understand how auth spec relates to other documents

**Input:**
```typescript
{
  path: '/api/specs/auth.md',
  include_related: true,
  link_depth: 2
}
```

**Output:**
```typescript
{
  path: '/api/specs/auth.md',
  structure: { folders: [], documents: [] },
  document_context: {...},
  sections: [...],
  related_documents: {
    forward_links: [
      {
        path: '/api/endpoints/login.md',
        title: 'Login Endpoint',
        namespace: 'api/endpoints',
        relationship: 'implements_spec',
        sections_linked: ['request-format', 'response-format']
      }
    ],
    backward_links: [
      {
        path: '/guides/authentication-setup.md',
        title: 'Authentication Setup Guide',
        namespace: 'guides',
        relationship: 'implementation_guide',
        sections_linking: ['overview', 'configuration']
      }
    ],
    related_by_content: [
      {
        path: '/api/specs/authorization.md',
        title: 'Authorization Specification',
        namespace: 'api/specs',
        relationship: 'similar_content',
        relevance: 0.85,
        shared_concepts: ['jwt', 'token', 'validation', 'security']
      }
    ],
    dependency_chain: [
      {
        sequence: 1,
        path: '/api/specs/auth.md',
        title: 'Authentication Specification',
        status: 'completed',
        blocks: ['/guides/authentication-setup.md']
      },
      {
        sequence: 2,
        path: '/guides/authentication-setup.md',
        title: 'Authentication Setup Guide',
        status: 'completed',
        blocks: ['/api/endpoints/login.md'],
        depends_on: ['/api/specs/auth.md']
      },
      {
        sequence: 3,
        path: '/api/endpoints/login.md',
        title: 'Login Endpoint',
        status: 'in_progress',
        depends_on: ['/api/specs/auth.md', '/guides/authentication-setup.md']
      }
    ]
  },
  implementation_readiness: {
    ready: false,
    confidence: 'medium',
    missing: [],
    recommendations: ['Complete implementation of login endpoint'],
    blockers: ['Login endpoint tasks pending']
  },
  breadcrumb: ['/api', '/api/specs', '/api/specs/auth.md'],
  parentPath: '/api/specs',
  totalItems: 2
}
```

### Use Case 6: Search All Documents

**Scenario:** Find all documents mentioning JWT validation

**Input:**
```typescript
{
  query: 'JWT validation',
  limit: 5
}
```

**Output:**
```typescript
{
  query: 'JWT validation',
  structure: {
    folders: [],
    documents: [
      {
        path: '/api/specs/auth.md',
        slug: 'auth',
        title: 'Authentication Specification',
        namespace: 'api/specs',
        sections: [...],
        lastModified: '2025-01-15T10:30:00.000Z',
        relevance: 9.5
      },
      {
        path: '/guides/security.md',
        slug: 'security',
        title: 'Security Best Practices',
        namespace: 'guides',
        sections: [...],
        lastModified: '2025-01-14T15:20:00.000Z',
        relevance: 7.2
      }
    ]
  },
  matches: [
    {
      document: '/api/specs/auth.md',
      section: 'jwt-tokens',
      snippet: '...implement **JWT validation** using the HS256...',
      relevance: 9.8
    },
    {
      document: '/guides/security.md',
      section: 'token-security',
      snippet: '...best practices for **JWT validation** include...',
      relevance: 8.1
    }
  ],
  totalItems: 2
}
```

### Use Case 7: Search Within Folder

**Scenario:** Search only within API documentation

**Input:**
```typescript
{
  path: '/api',
  query: 'authentication',
  limit: 10
}
```

**Output:**
```typescript
{
  query: 'authentication',
  path: '/api',
  structure: {
    folders: [],
    documents: [
      {
        path: '/api/specs/auth.md',
        slug: 'auth',
        title: 'Authentication Specification',
        namespace: 'api/specs',
        sections: [...],
        lastModified: '2025-01-15T10:30:00.000Z',
        relevance: 9.8
      }
      // Only documents under /api/*
    ]
  },
  matches: [...],
  breadcrumb: ['/api'],
  parentPath: '/',
  totalItems: 1
}
```

### Use Case 8: Empty Results

**Scenario:** Browse non-existent folder

**Input:**
```typescript
{
  path: '/nonexistent'
}
```

**Output:**
```typescript
{
  path: '/nonexistent',
  structure: {
    folders: [],
    documents: []
  },
  breadcrumb: ['/nonexistent'],
  parentPath: '/',
  totalItems: 0
}
```

## Implementation Details

### Key Functions

#### Main Entry Point
```typescript
export async function browseDocuments(
  args: Record<string, unknown>,
  _state: SessionState,
  manager: DocumentManager
): Promise<BrowseResponse>
```

**Decision Flow:**
1. Parse and normalize parameters
2. Determine mode (search vs browse)
3. Determine path type (folder, document, section)
4. Execute appropriate handler
5. Format and return response

#### Numeric Parameter Validation
```typescript
function validateNumericParameter(
  value: unknown,
  paramName: string,
  min: number,
  max: number,
  defaultValue: number
): number
```

**Validation:**
- Type check (must be finite number)
- Range check (min/max inclusive)
- Floor to integer
- Throws `AddressingError` on failure

#### Search Handler
```typescript
const { documents, matches } = await performSearch(
  manager,
  query,
  pathFilter
);
```

**Search Process:**
1. Execute search with boost factors
2. Apply path filter if provided
3. Load document metadata
4. Extract search matches with snippets
5. Sort by relevance
6. Apply limit

#### Folder Browse Handler
```typescript
const { folders, documents } = await getFolderStructure(
  manager,
  config.docsBasePath,
  normalizedPath
);
```

**Folder Process:**
1. Construct absolute filesystem path
2. Check directory exists
3. Read directory entries
4. Classify as folders or documents
5. Load document metadata
6. Count and analyze subfolders
7. Sort alphabetically

#### Document Browse Handler
```typescript
const { sections, document_context } = await getSectionStructure(
  manager,
  documentAddress.path,
  analyzeSectionContent,
  sectionAddress?.slug
);
```

**Document Process:**
1. Validate document exists
2. Load document structure
3. If no target section: return all sections
4. If target section: return subsections
5. Analyze section content (code blocks, links)
6. Count subsections
7. Generate hierarchical context

#### Related Documents Analysis
```typescript
const relatedDocuments = await analyzeDocumentLinks(
  manager,
  documentAddress.path,
  linkDepth,
  classifyRelationship,
  findRelatedByContent
);
```

**Analysis Process:**
1. Initialize cycle detection context
2. Find forward links (parsed from content)
3. Find backward links (search-based)
4. Find related by content (keyword matching)
5. Build dependency chain
6. Assess implementation readiness

### Error Handling Patterns

#### Addressing Errors
```typescript
try {
  const documentAddress = parseDocumentAddress(documentPath);
  const sectionAddress = parseSectionAddress(sectionSlug, documentAddress.path);
} catch (error) {
  if (error instanceof AddressingError) {
    throw error; // Propagate to caller
  }
  throw new DocumentNotFoundError(documentPath);
}
```

#### Graceful Degradation
```typescript
try {
  // Load document
} catch {
  // Skip documents that can't be loaded - don't fail entire operation
}
```

**Graceful Handling:**
- Missing documents silently skipped
- Unreadable sections omitted
- Search failures return empty results
- Cache errors don't interrupt operations

#### Generic Error Response
```typescript
return {
  path: args['path'] as string ?? '/',
  structure: { folders: [], documents: [] },
  totalItems: 0,
  breadcrumb: [`Error: ${message}`]
};
```

### Performance Considerations

#### Search Optimization
- Grouped results by document
- Limited result set via `limit` parameter
- Cached documents reused
- Boost-aware cache retention for search results

#### Relationship Analysis Optimization
- Depth limiting (max 3 levels)
- Cycle detection prevents infinite loops
- Parallel analysis (Promise.all)
- Optional via `include_related` flag

#### Cache Strategy
- LRU eviction with boost factors
- Search results get 3x retention
- Reference loads get 2x retention
- File watching for automatic invalidation

#### Filesystem Efficiency
- Directory existence checks before reading
- Parallel document loading
- Metadata caching
- Selective section content loading

## Security & Validation

### Path Validation
- All paths normalized through addressing system
- Path traversal protection via addressing system
- Markdown file extension validation
- Absolute path enforcement

### Input Validation
- Numeric parameters validated with ranges
- String parameters type-checked
- Empty query detection for mode switching
- Path format validation

### Resource Limits
- Search result limiting (1-50)
- Link depth capping (max 3)
- Cache size limits (100 documents)
- Timeout protection on batch cache (60s)

### Error Security
- Addressing errors include context without exposing internals
- Filesystem errors sanitized
- No stack traces in responses
- Graceful degradation prevents information leakage

## Testing Considerations

### Unit Test Coverage
- Parameter validation (numeric ranges, string formats)
- Mode switching (query presence detection)
- Path parsing (folder/document/section)
- Error handling (addressing, filesystem, cache)
- Response formatting (breadcrumbs, parent paths)

### Integration Test Scenarios
1. Browse root directory
2. Navigate nested folders
3. View document sections
4. Browse section subsections
5. Search all documents
6. Search within folder
7. Analyze related documents
8. Handle missing paths
9. Handle invalid parameters
10. Verify cache behavior

### MCP Inspector Testing
```bash
# Browse root
npx @modelcontextprotocol/inspector --cli node dist/index.js \
  --method tools/call \
  --tool-name browse_documents

# Browse folder
npx @modelcontextprotocol/inspector --cli node dist/index.js \
  --method tools/call \
  --tool-name browse_documents \
  --tool-arg path=/api

# Search
npx @modelcontextprotocol/inspector --cli node dist/index.js \
  --method tools/call \
  --tool-name browse_documents \
  --tool-arg query='authentication'

# Related documents analysis
npx @modelcontextprotocol/inspector --cli node dist/index.js \
  --method tools/call \
  --tool-name browse_documents \
  --tool-arg path=/api/auth.md \
  --tool-arg include_related=true \
  --tool-arg link_depth=2
```

## Future Enhancements

### Potential Features
- **Depth traversal**: Implement `depth` parameter for recursive folder browsing
- **Task integration**: Show task counts in document info
- **Statistics**: Document size, complexity metrics
- **Filtering**: Filter by namespace, date, document type
- **Sorting**: Custom sort orders (by date, size, relevance)
- **Pagination**: Cursor-based pagination for large result sets
- **Export**: Export browse results as structured data

### API Evolution
- Consider splitting search and browse into separate tools
- Enhanced relationship types
- More granular boost configuration
- Real-time change notifications
- Performance metrics in responses
