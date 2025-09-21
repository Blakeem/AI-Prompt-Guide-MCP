# Spec-Docs MCP Server - Unified Specification v2

A task-aware documentation system that combines specification management with actionable task tracking, built on robust markdown parsing tools and progressive discovery patterns.

## Core Vision

**Task-Driven Documentation**: Documents aren't just reference material - they're living workspaces with embedded tasks, cross-references, and completion tracking. This creates a unified system where specifications drive implementation and tasks link back to their authoritative sources.

## Architecture Principles

### 1. AST-Based Markdown Manipulation
- **No Regex**: All markdown operations use AST parsing via `unified/remark`
- **Structural Integrity**: Operations preserve document structure and hierarchy
- **Safe Transformations**: Validated operations that can't corrupt documents

### 2. Progressive Discovery Pattern
Tools reveal capabilities through exploration:
```json
→ create_document {}                    // Lists available doc types
→ create_document {type: "api_spec"}    // Returns instructions & best practices
→ create_document {type: "api_spec", title: "Search API", content: "..."}  // Creates document
```

### 3. Batch and Single Operations
All modification tools support both single and batch operations through input type detection:
```json
// Single operation
Input: {"operation": "add_task", "document": "api.md", "title": "Implement endpoint"}

// Batch operations (array input)
Input: [
  {"operation": "add_task", "document": "api.md", "title": "Task 1"},
  {"operation": "add_task", "document": "api.md", "title": "Task 2"}
]
```

### 4. Error Recovery Pattern
Errors return full specifications to guide correction:
```json
{
  "error": "Invalid operation: 'update'",
  "valid_operations": ["add_task", "edit_section", "remove_section"],
  "example": {
    "operation": "edit_section",
    "document": "/specs/api.md",
    "section": "#endpoints",
    "content": "Updated content"
  },
  "usage": "Provide operation type and required parameters"
}
```

### 5. Slug Stability Through Anchors
Sections maintain stable slugs even when renamed:
```markdown
## Updated Title {#original-slug}
```
This preserves all existing links when titles change.

## MVP Task Format

Tasks use GitHub-style checkboxes with essential metadata:

```markdown
## Tasks {#tasks}

- [ ] Implement search endpoint
  - Criteria: 200ms p99 latency
  - Links: [API Spec](/specs/search-api.md#endpoints), [Performance Guide](/guides/optimization.md)

- [x] Define schemas
  - Criteria: OpenAPI 3.0 compatible
  - Completed: 2025-09-19
  - Note: Validated against spec
```

**MVP Task Properties** (keeping it simple):
- `title`: Task description
- `status`: Checkbox state (pending/completed)
- `criteria`: Measurable completion requirements
- `links`: References to specification documents
- `note`: Completion notes or blockers

**Deferred for Later**:
- Tags, assignments, due dates, complex dependencies

## Essential Tool Set (MVP)

### 1. create_document
Progressive creation with type-specific guidance:

**Stage 1 - Discovery**:
```json
Input: {}
Output: {
  "types": ["api_spec", "implementation_guide", "architecture_doc", "troubleshooting"],
  "next_step": "Call with 'type' parameter for instructions"
}
```

**Stage 2 - Instructions with Starter Structure**:
```json
Input: {"type": "api_spec"}
Output: {
  "instructions": [
    "Research current API patterns and standards",
    "Define clear request/response schemas",
    "Include realistic examples",
    "Document error conditions"
  ],
  "starter_structure": "# Title\n## Overview\n## Endpoints\n## Schemas\n## Examples\n## Tasks",
  "next_step": "Provide type, title, and initial_content"
}
```

**Stage 3 - Creation**:
```json
Input: {
  "type": "api_spec",
  "title": "Search API",
  "initial_content": "Full-text search with ranking"
}
Output: {
  "created": "/specs/search-api.md",
  "sections": ["#overview", "#endpoints", "#schemas", "#examples", "#tasks"],
  "next_actions": [
    "Use add_task to populate the tasks section",
    "Use edit_section to add endpoint details"
  ]
}
```

### 2. edit_section
Unified tool for both editing existing sections and creating new sections with automatic depth calculation:

**Edit existing section**:
```json
Input: {
  "document": "/specs/search-api.md",
  "section": "#endpoints",
  "operation": "append",
  "content": "### POST /search\n\nFull-text search endpoint..."
}
Output: {
  "updated": true,
  "document": "/specs/search-api.md",
  "section": "#endpoints",
  "operation": "append"
}
```

**Create new section with automatic depth**:
```json
Input: {
  "document": "/specs/search-api.md",
  "section": "#endpoints",
  "operation": "append_child",
  "title": "Authentication",
  "content": "JWT-based authentication system..."
}
Output: {
  "created": true,
  "document": "/specs/search-api.md",
  "new_section": "#authentication",
  "depth": 3,
  "operation": "append_child"
}
```

**Operations**:
- **Edit existing**: `replace`, `append`, `prepend`
- **Create new**: `insert_before`, `insert_after`, `append_child` (with auto-depth)

**Batch operations** (mix editing and creation):
```json
Input: [
  {
    "document": "/specs/api.md",
    "section": "#endpoints",
    "operation": "append",
    "content": "### GET /users"
  },
  {
    "document": "/specs/api.md",
    "section": "#endpoints",
    "operation": "append_child",
    "title": "Error Handling",
    "content": "Standard HTTP error responses..."
  }
]
Output: {
  "batch_results": [
    {"success": true, "section": "#endpoints", "action": "edited"},
    {"success": true, "section": "#error-handling", "action": "created", "depth": 3}
  ],
  "document": "/specs/api.md",
  "sections_modified": 2
}
```

### 3. add_task
Add tasks with links to specifications:

**Single task**:
```json
Input: {
  "document": "/specs/search-api.md",
  "title": "Implement caching layer",
  "criteria": "Redis-based, 100ms response time",
  "links": ["/architecture/caching.md", "/specs/search-api.md#performance"]
}
Output: {
  "added": true,
  "task_id": "search-api.md#tasks[3]",
  "document": "/specs/search-api.md"
}
```

**Batch tasks**:
```json
Input: [
  {
    "document": "/specs/api.md",
    "title": "Write unit tests",
    "criteria": "80% coverage"
  },
  {
    "document": "/specs/api.md",
    "title": "Add integration tests",
    "criteria": "All endpoints tested"
  }
]
Output: {
  "batch_results": [
    {"success": true, "task_id": "api.md#tasks[0]"},
    {"success": true, "task_id": "api.md#tasks[1]"}
  ],
  "document": "/specs/api.md",
  "tasks_added": 2
}
```

### 4. complete_task
Mark tasks as completed with notes:

**Single completion**:
```json
Input: {
  "task_id": "search-api.md#tasks[3]",
  "note": "Implemented with Redis Cluster, achieving 87ms p99"
}
Output: {
  "completed": true,
  "task_id": "search-api.md#tasks[3]",
  "criteria_met": true
}
```

**Batch completions**:
```json
Input: [
  {"task_id": "api.md#tasks[0]", "note": "Coverage at 85%"},
  {"task_id": "api.md#tasks[1]", "note": "All endpoints tested"}
]
Output: {
  "batch_results": [
    {"success": true, "task_id": "api.md#tasks[0]"},
    {"success": true, "task_id": "api.md#tasks[1]"}
  ],
  "tasks_completed": 2
}
```

### 5. list_documents
Browse the document tree:
```json
Input: {"path": "/specs", "include_tasks": true}
Output: {
  "documents": [
    {
      "path": "/specs/search-api.md",
      "title": "Search API Specification",
      "sections": ["#overview", "#endpoints", "#schemas", "#examples", "#tasks"],
      "tasks": {
        "total": 5,
        "completed": 2
      }
    }
  ],
  "total_documents": 1
}
```

### 6. search_documents
Find content across documents:
```json
Input: {
  "query": "caching performance",
  "include_tasks": true
}
Output: {
  "results": [
    {
      "document": "/architecture/caching.md",
      "matches": [
        {
          "type": "content",
          "section": "#overview",
          "snippet": "...caching strategies for optimal performance..."
        }
      ],
      "relevance": 0.95
    }
  ],
  "related_tasks": [
    {
      "task_id": "api.md#tasks[3]",
      "title": "Implement caching layer",
      "status": "completed"
    }
  ]
}
```

### 7. view_document
Inspect document structure and content:
```json
Input: {"document": "/specs/search-api.md"}
Output: {
  "path": "/specs/search-api.md",
  "title": "Search API Specification",
  "sections": [
    {
      "slug": "#overview",
      "title": "Overview",
      "depth": 2,
      "has_content": true,
      "links": []
    },
    {
      "slug": "#endpoints",
      "title": "Endpoints",
      "depth": 2,
      "has_content": true,
      "links": ["/guides/api-design.md"]
    },
    {
      "slug": "#tasks",
      "title": "Tasks",
      "depth": 2,
      "task_count": 5,
      "links": [
        "/specs/search-api.md#endpoints",
        "/guides/optimization.md",
        "/architecture/caching.md"
      ]
    }
  ],
  "tasks": {
    "total": 5,
    "completed": 2,
    "pending": ["tasks[2]", "tasks[3]", "tasks[4]"]
  },
  "document_links": {
    "total": 4,
    "internal": 3,
    "external": 1,
    "broken": [],
    "sections_without_links": ["#schemas", "#examples"]
  }
}
```

## Additional Tools (Quick Wins - 2 tools)

### reopen_task
Revert task completion:
```json
Input: {"task_id": "api.md#tasks[0]"}
Output: {"reopened": true, "task_id": "api.md#tasks[0]"}
```

### remove_section
Delete sections (with safety check):
```json
Input: {
  "document": "/specs/api.md",
  "section": "#deprecated"
}
Output: {
  "removed": true,
  "document": "/specs/api.md",
  "section": "#deprecated"
}
```

**Note**: Section creation is now handled by the enhanced `edit_section` tool using creation operations (`insert_before`, `insert_after`, `append_child`) with automatic depth calculation. No separate `insert_section` tool needed.

## Implementation Architecture

### Core Components

```
src/
├── markdown-tools/          # AST-based markdown manipulation
│   ├── parse.ts            # Heading extraction, TOC building
│   ├── sections.ts         # CRUD operations on sections
│   └── slug.ts             # Deterministic slug generation
│
├── task-engine/            # Task management system
│   ├── task-parser.ts      # Extract tasks from markdown
│   └── task-tracker.ts     # Simple status management
│
├── document-manager/       # High-level document operations
│   ├── document-cache.ts   # LRU cache with file watching
│   ├── document-manager.ts # Document CRUD facade
│   └── link-validator.ts   # Check link targets exist
│
└── mcp-server/            # MCP protocol implementation
    ├── tool-handlers.ts    # Tool request processing
    └── progressive-discovery.ts  # Staged tool responses
```

### Implementation Phases

#### Phase 1: Core Foundation (Week 1)
1. AST-based markdown parser with GitHub slugger
2. Basic CRUD for documents and sections
3. Task parser for checkboxes with metadata
4. Progressive discovery for `create_document`
5. Batch operation support

#### Phase 2: Linking & Discovery (Week 2)
1. Manual link creation in tasks
2. Link validation (verify targets exist)
3. Search with task inclusion
4. Error recovery patterns

#### Phase 3: Polish & Optimization (Week 3)
1. Task completion validation
2. Section anchor stability
3. Performance optimization
4. Comprehensive testing

## Configuration

Simple configuration for document organization:
```yaml
# .specdocs.config.yaml
paths:
  specs: /specs
  guides: /guides
  architecture: /architecture

defaults:
  auto_toc: true
  auto_anchors: true
  task_section: "Tasks"
```

## Success Metrics

Track these to validate the approach:
1. Time from spec creation to task completion
2. Number of cross-references actively used
3. Task completion rate
4. Documents that remain in sync

## Benefits of This Approach

1. **Simplicity First**: MVP focuses on essential features
2. **Progressive Enhancement**: Can add complexity later
3. **Reliable Foundation**: AST-based operations ensure safety
4. **Clear Value**: Spec→Task→Completion loop is immediately useful
5. **Extensible Design**: Architecture supports future enhancements

## Next Steps

1. Implement the 7 essential tools
2. Add batch operation support to all modification tools
3. Ensure error recovery patterns guide users
4. Test with real specification documents
5. Iterate based on usage patterns

This MVP provides a solid foundation for spec-driven development while keeping complexity manageable. The focus on tasks linked to specifications creates immediate value for development workflows.