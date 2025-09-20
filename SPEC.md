# MCP Docs Server - Functional Specification

A composable MCP server for managing Markdown documentation with a progressive discovery pattern. Tools guide agents through document creation, management, and completion workflows.

## Core Concept

**Progressive Discovery**: Tools reveal their capabilities through exploration. Call without arguments to discover options, then with specific parameters to execute actions. Incorrect usage returns helpful specs.

## Design Principles

- **Single or Batch Operations**: Pass object for single operation, array for batch
- **Markdown-Native**: All content in Markdown with GitHub-style slug addressing
- **Self-Documenting**: Errors return full specs to guide correction
- **Smart Inference**: Tools detect intent from input shape
- **Composable Workflow**: Each response includes `next_step` guidance

## Slug System

### File Naming
Documents are saved with slugified titles as filenames:
- Title: "Search API Specification" 
- Filename: `search-api-specification.md`

### Section Addressing
Headings include explicit anchors for stability:
```markdown
# Search API Specification {#search-api-specification}

## Endpoints {#endpoints}

### Search Endpoint {#endpoints/search-endpoint}

#### Request Schema {#endpoints/search-endpoint/request-schema}
```

### Universal Slug Format
- **Document**: `search-api-specification.md`
- **Section**: `search-api-specification.md#endpoints`
- **Nested**: `search-api-specification.md#endpoints/search-endpoint`
- **Task by index**: `search-api-specification.md#tasks[0]`

### Slug Rules
- Auto-generated from headings using GitHub slugger
- Stored as anchors `{#slug}` for stability across edits
- Nested sections use path notation: `parent/child/grandchild`
- Maximum practical depth: 3 levels (H2/H3/H4)

## Tool Families

### Document Tools
Manage document structure and content

1. **create_document** - Progressive creation with instructions
2. **edit_document** - Modify content (single or batch)
3. **remove_document** - Delete documents/sections (single or batch)
4. **list_documents** - Browse document tree
5. **search_documents** - Find content by keywords
6. **view_document** - Inspect document structure

### Task Tools  
Manage task state and metadata

1. **complete_task** - Mark tasks as done (single or batch)
2. **reopen_task** - Revert completed tasks (single or batch)
3. **tag_document** - Apply metadata labels

## Error Handling Pattern

Any incorrect usage returns the tool's spec:

```json
Input: { "doc_type": "invalid_type" }
Output: {
  "error": "Invalid doc_type: 'invalid_type'",
  "valid_types": ["api_spec", "process_checklist", "review_cleanup"],
  "usage": {
    "discovery": "Call with {} to list types",
    "instructions": "Call with {doc_type} for instructions",
    "creation": "Call with {doc_type, title, initial_content}"
  }
}
```

## Batch Operations

All modification tools support single object or batch array:

```json
// Single operation
Input: { "operation": "add_task", "file": "...", "slug": "tasks", "title": "..." }

// Batch operations
Input: [
  { "operation": "add_task", "file": "...", "slug": "tasks", "title": "Task 1" },
  { "operation": "add_task", "file": "...", "slug": "tasks", "title": "Task 2" }
]
Output: {
  "batch_results": [
    { "success": true, "task_index": 0 },
    { "success": true, "task_index": 1 }
  ]
}
```

## Document Types & Instructions

### API Specification (`api_spec`)
Documents that define API contracts, endpoints, and examples.

**Auto-generated structure:**
```markdown
# {Title} {#slug}

## Endpoints {#endpoints}

## Examples {#examples}

## Tasks {#tasks}
```

**Instructions provided on creation:**
- Research existing API patterns in the domain
- Define clear request/response schemas
- Include realistic examples with expected outputs
- Document error conditions and edge cases

### Process Checklist (`process_checklist`)
Step-by-step procedures with completion tracking.

**Auto-generated structure:**
```markdown
# {Title} {#slug}

## Prerequisites {#prerequisites}

## Tasks {#tasks}

## Verification {#verification}
```

**Instructions provided on creation:**
- Break complex processes into atomic steps
- Define measurable completion criteria
- Order tasks by dependencies
- Include verification steps

### Review Document (`review_cleanup`)
Analysis findings with actionable tasks.

**Auto-generated structure:**
```markdown
# {Title} {#slug}

## Findings {#findings}

## Tasks {#tasks}

## Notes {#notes}
```

**Instructions provided on creation:**
- Document findings objectively with evidence
- Create actionable tasks from findings
- Include specific acceptance criteria
- Reference relevant documentation

## Tool Specifications

### create_document

**Stage 1 - Discovery:**
```json
Input: {}
Output: {
  "doc_types": ["api_spec", "process_checklist", "review_cleanup"],
  "next_step": "Call with doc_type for instructions"
}
```

**Stage 2 - Instructions:**
```json
Input: { "doc_type": "api_spec" }
Output: {
  "instructions": "Research domain patterns...[detailed guidance]",
  "structure": "# Title\n## Endpoints\n## Examples\n## Tasks",
  "best_practices": [...],
  "next_step": "Call with doc_type, title, and initial_content"
}
```

**Stage 3 - Creation:**
```json
Input: { 
  "doc_type": "api_spec",
  "title": "Search API Specification",
  "initial_content": "API for full-text search with ranking"
}
Output: {
  "path": "search-api-specification.md",
  "created": true,
  "next_step": "Use edit_document to add endpoints"
}
```

### edit_document

**Discovery:**
```json
Input: {}
Output: {
  "operations": {
    "add_section": { "file": "string", "title": "string", "parent_slug?": "string" },
    "add_task": { "file": "string", "slug": "string", "title": "string", "criteria?": "string" },
    "update_content": { "file": "string", "slug": "string", "content": "string" },
    "rename_section": { "file": "string", "slug": "string", "new_title": "string" }
  },
  "supports_batch": true
}
```

**Single Operation:**
```json
Input: {
  "operation": "add_task",
  "file": "search-api.md",
  "slug": "tasks",
  "title": "Implement /search endpoint",
  "criteria": "Tests pass with 200ms p99"
}
Output: {
  "updated": true,
  "task_index": 0,
  "next_step": "Use complete_task when criteria met"
}
```

**Batch Operations:**
```json
Input: [
  { "operation": "add_section", "file": "api.md", "title": "Authentication", "parent_slug": "endpoints" },
  { "operation": "add_section", "file": "api.md", "title": "Rate Limiting", "parent_slug": "endpoints" },
  { "operation": "add_task", "file": "api.md", "slug": "tasks", "title": "Document auth flow" }
]
Output: {
  "batch_results": [
    { "success": true, "slug": "endpoints/authentication" },
    { "success": true, "slug": "endpoints/rate-limiting" },
    { "success": true, "task_index": 3 }
  ]
}
```

### remove_document

```json
// Single removal
Input: { "path": "old-spec.md" }
Output: { "removed": true }

// Batch removal
Input: [
  { "file": "api.md", "slug": "deprecated" },
  { "file": "api.md", "slug": "legacy" }
]
Output: {
  "batch_results": [
    { "success": true, "removed": "section" },
    { "success": true, "removed": "section" }
  ]
}
```

### list_documents

```json
Input: { "path": "." }
Output: {
  "documents": [
    {
      "path": "search-api-specification.md",
      "type": "api_spec",
      "title": "Search API Specification",
      "sections": {
        "endpoints": ["endpoints/search", "endpoints/suggest"],
        "tasks": { "total": 8, "completed": 3 }
      }
    }
  ]
}
```

### search_documents

```json
Input: { "query": "search endpoint latency", "limit": 5 }
Output: {
  "matches": [
    {
      "file": "search-api.md",
      "slug": "endpoints/search",
      "preview": "...200ms p99 latency requirement...",
      "score": 0.95
    }
  ]
}
```

### view_document

**Document Level:**
```json
Input: { "file": "search-api.md" }
Output: {
  "title": "Search API Specification",
  "type": "api_spec",
  "sections": {
    "endpoints": {
      "count": 3,
      "slugs": ["endpoints/search", "endpoints/suggest", "endpoints/health"]
    },
    "tasks": {
      "total": 8,
      "completed": 3,
      "active": ["tasks[3]", "tasks[4]", "tasks[5]", "tasks[6]", "tasks[7]"]
    }
  }
}
```

**Section Level:**
```json
Input: { "file": "search-api.md", "slug": "endpoints/search" }
Output: {
  "content": "### Search Endpoint {#endpoints/search}\n\n`POST /v1/search`\n\n...",
  "subsections": ["request-schema", "response-schema", "errors"],
  "parent": "endpoints"
}
```

### complete_task

**Single:**
```json
Input: {
  "file": "search-api.md",
  "slug": "tasks[0]",
  "note": "Schemas validated"
}
Output: {
  "completed": true,
  "next_step": "Complete tasks[1] or view_document for progress"
}
```

**Batch:**
```json
Input: [
  { "file": "api.md", "slug": "tasks[0]" },
  { "file": "api.md", "slug": "tasks[1]", "note": "Tests written" }
]
Output: {
  "batch_results": [
    { "success": true, "completed": true },
    { "success": true, "completed": true }
  ]
}
```

### reopen_task

```json
Input: { "file": "api.md", "slug": "tasks[0]" }
Output: { "reopened": true, "status": "active" }
```

### tag_document

```json
Input: {
  "file": "search-api.md",
  "tags": ["backend", "search", "v2"]
}
Output: {
  "tags_applied": ["backend", "search", "v2"],
  "total_tags": 3
}
```

## Markdown Format Examples

### Document with Nested Sections

```markdown
# Search API Specification {#search-api-specification}

## Endpoints {#endpoints}

### Search Endpoint {#endpoints/search-endpoint}

`POST /v1/search`

#### Request Schema {#endpoints/search-endpoint/request-schema}

```json
{
  "query": "string",
  "filters": "object",
  "limit": "number"
}
```

#### Response Schema {#endpoints/search-endpoint/response-schema}

```json
{
  "results": "array",
  "total": "number",
  "latency_ms": "number"
}
```

## Tasks {#tasks}

- [x] Define API schemas
  - Criteria: OpenAPI 3.0 compatible
  - Completed: 2025-09-19
  - Note: Validated with team

- [ ] Implement search endpoint
  - Criteria: 200ms p99 latency
  
- [ ] Write integration tests
  - Criteria: 80% coverage
```

## Example Workflow

1. **Create Document:**
   ```
   → create_document {}
   → create_document { doc_type: "api_spec" }  
   → create_document { doc_type: "api_spec", title: "Search API" }
   ```

2. **Batch Add Content:**
   ```
   → edit_document [
       { operation: "add_section", file: "search-api.md", title: "Endpoints" },
       { operation: "add_section", file: "search-api.md", title: "Search", parent_slug: "endpoints" },
       { operation: "add_task", file: "search-api.md", slug: "tasks", title: "Define schemas" }
     ]
   ```

3. **View & Complete:**
   ```
   → view_document { file: "search-api.md" }
   → complete_task { file: "search-api.md", slug: "tasks[0]" }
   ```

4. **Search Across Docs:**
   ```
   → search_documents { query: "latency requirements" }
   → view_document { file: "...", slug: "endpoints/search/requirements" }
   ```

## Design Decisions

### Why Explicit Anchors?
- Stability across edits
- Clear addressing in nested structures
- GitHub slugger compatibility
- Human-readable in source

### Why Batch Operations?
- Efficient for multiple updates
- Reduces LLM API calls
- Natural for related changes
- Maintains atomicity per operation

### Why Path-Style Nesting?
- Familiar folder metaphor
- Clear parent-child relationships
- Easy to navigate programmatically
- Supports arbitrary depth cleanly

### Why Error Returns Spec?
- Immediate recovery path
- No need for separate help lookup
- Teaches correct usage in context
- Reduces back-and-forth iterations

## Next Steps Contract

Every successful response includes contextual guidance:

1. After creation → "Add content with edit_document"
2. After adding tasks → "Complete with complete_task"
3. After completion → "View progress or continue with next task"
4. After errors → Full spec with correct usage examples

This creates a self-correcting, efficient workflow optimized for agent interaction.
