# Spec-Docs MCP Server - Unified Specification v2

A task-aware documentation system that combines specification management with actionable task tracking, built on robust markdown parsing tools and progressive discovery patterns.

## Core Vision

**Task-Driven Documentation**: Documents aren't just reference material - they're living workspaces with embedded tasks, cross-references, and completion tracking. This creates a unified system where specifications drive implementation and tasks link back to their authoritative sources.

## Architecture Principles

### 1. AST-Based Markdown Manipulation
- **No Regex**: All markdown operations use AST parsing via `unified/remark`
- **Structural Integrity**: Operations preserve document structure and hierarchy
- **Safe Transformations**: Validated operations that can't corrupt documents

### 2. Namespace-Based Organization
Documents are organized using flexible namespaces that map directly to folder structure:
```
namespace: "api/specs"     → folder: "/api/specs"     → file: "/api/specs/search-api.md"
namespace: "guides/setup"  → folder: "/guides/setup"  → file: "/guides/setup/oauth.md"
namespace: "docs/admin"    → folder: "/docs/admin"    → file: "/docs/admin/deployment.md"
```
- **Flexible Structure**: Namespaces adapt to any organization pattern
- **Direct Mapping**: Clear relationship between namespace and filesystem
- **Extensible**: Easy to add new namespaces without code changes

### 3. Consistent Slug and Path Handling
- **File Names**: Always use slugified versions (`search-api.md`)
- **Document Titles**: Full, human-readable titles in document content
- **Return Values**: Always expose both slug (for references) and title (for display)
- **Cross-Tool Consistency**: Same naming patterns across all tools

### 4. Progressive Discovery Pattern
Tools reveal capabilities through exploration:
```json
→ create_document {}                              // Lists available namespaces
→ create_document {namespace: "api/specs"}        // Returns instructions & best practices
→ create_document {namespace: "api/specs", title: "Search API", overview: "..."}  // Creates document
```

### 5. Batch and Single Operations
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

### 6. Error Recovery Pattern
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

### 7. Slug Stability Through Anchors
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

## Tool Architecture Philosophy

### Design Principles
1. **Separation of Creation vs Management**: Creation tools provide guided experiences; management tools handle operations
2. **Unified Operations**: Each tool handles ALL operations for its scope (document or section level)
3. **Consistent Naming**: `create_` for creation, `manage_` for operations, simple names for unified tools
4. **Batch Power**: All management tools support mixed batch operations

### Tool Categories

**Document Level:**
- `create_document`: Progressive discovery for guided document creation
- `manage_document`: All document operations (rename, move, archive, delete)

**Section Level:**
- `section`: All section operations (create, edit, remove) with auto-depth

**Task Management:**
- `add_task`: Create tasks with links
- `complete_task`: Mark tasks as done
- `reopen_task`: Revert completion

**Discovery:**
- `browse_documents`: Unified browsing and search (replaces list_documents + search_documents)
- `view_document`: Inspect structure

## Essential Tool Set (MVP)

### 1. create_document
Progressive creation with namespace-specific guidance:

**Stage 1 - Discovery**:
```json
Input: {}
Output: {
  "namespaces": {
    "api/specs": {
      "description": "REST API specifications with endpoints and schemas",
      "examples": ["search-api", "user-api", "payments-api"]
    },
    "api/guides": {
      "description": "API implementation and integration guides",
      "examples": ["oauth-setup", "rate-limiting", "error-handling"]
    },
    "frontend/components": {
      "description": "UI component documentation and examples",
      "examples": ["button", "modal", "data-table"]
    },
    "backend/services": {
      "description": "Backend service architecture and implementation",
      "examples": ["auth-service", "search-service", "notification-service"]
    },
    "docs/troubleshooting": {
      "description": "Problem diagnosis and solution guides",
      "examples": ["deployment-issues", "performance-problems", "debugging-guide"]
    }
  },
  "next_step": "Call with 'namespace' parameter for instructions"
}
```

**Stage 2 - Instructions with Starter Structure**:
```json
Input: {"namespace": "api/specs"}
Output: {
  "namespace": "api/specs",
  "instructions": [
    "Research current API patterns and standards",
    "Define clear request/response schemas with OpenAPI",
    "Include realistic examples with actual data",
    "Document all error conditions with HTTP status codes",
    "Specify authentication and authorization requirements"
  ],
  "starter_structure": "# {{title}}\n\n## Overview\n{{overview}}\n\n## Authentication\n\n## Endpoints\n\n## Schemas\n\n## Examples\n\n## Tasks",
  "next_step": "Provide namespace, title, and overview to create document"
}
```

**Stage 3 - Creation**:
```json
Input: {
  "namespace": "api/specs",
  "title": "Search API Specification",
  "overview": "Full-text search with ranking and filtering capabilities"
}
Output: {
  "created": "/api/specs/search-api-specification.md",
  "slug": "search-api-specification",
  "title": "Search API Specification",
  "namespace": "api/specs",
  "sections": ["#overview", "#authentication", "#endpoints", "#schemas", "#examples", "#tasks"],
  "next_actions": [
    "Use add_task to populate the tasks section",
    "Use section tool to add endpoint details",
    "Use section tool to define request/response schemas"
  ]
}
```

### 2. section
Unified tool for ALL section operations - create, edit, and remove sections with automatic depth calculation:

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

**Remove section**:
```json
Input: {
  "document": "/specs/search-api.md",
  "section": "#deprecated",
  "operation": "remove"
}
Output: {
  "removed": true,
  "document": "/specs/search-api.md",
  "section": "#deprecated",
  "removed_content": "Previous content for recovery..."
}
```

**Operations**:
- **Edit existing**: `replace`, `append`, `prepend`
- **Create new**: `insert_before`, `insert_after`, `append_child` (with auto-depth)
- **Delete**: `remove`

**Powerful batch operations** (mix all operation types):
```json
Input: [
  {
    "document": "/specs/api.md",
    "section": "#old-intro",
    "operation": "remove"
  },
  {
    "document": "/specs/api.md",
    "section": "#overview",
    "operation": "insert_before",
    "title": "Introduction",
    "content": "New introduction..."
  },
  {
    "document": "/specs/api.md",
    "section": "#endpoints",
    "operation": "append",
    "content": "### GET /users"
  }
]
Output: {
  "batch_results": [
    {"success": true, "section": "#old-intro", "action": "removed"},
    {"success": true, "section": "#introduction", "action": "created", "depth": 2},
    {"success": true, "section": "#endpoints", "action": "edited"}
  ],
  "document": "/specs/api.md",
  "sections_modified": 3
}
```

### 3. manage_document
Unified tool for ALL document-level operations (except creation):

**Archive document**:
```json
Input: {
  "operation": "archive",
  "document": "/specs/old-api.md"
}
Output: {
  "archived": true,
  "from": "/specs/old-api.md",
  "to": "/archived/specs/old-api.md",
  "audit_file": "/archived/specs/old-api.audit.json"
}
```

**Delete document permanently**:
```json
Input: {
  "operation": "delete",
  "document": "/drafts/temp.md",
  "confirm": true
}
Output: {
  "deleted": true,
  "document": "/drafts/temp.md"
}
```

**Rename document**:
```json
Input: {
  "operation": "rename",
  "document": "/specs/api.md",
  "new_title": "API Specification v2"
}
Output: {
  "renamed": true,
  "document": "/specs/api.md",
  "old_title": "API Specification",
  "new_title": "API Specification v2"
}
```

**Move document**:
```json
Input: {
  "operation": "move",
  "document": "/drafts/api.md",
  "new_path": "/specs/api.md"
}
Output: {
  "moved": true,
  "from": "/drafts/api.md",
  "to": "/specs/api.md"
}
```

**Operations**:
- `archive`: Move to archive folder with audit trail
- `delete`: Permanent removal (requires confirm: true)
- `rename`: Change document title
- `move`: Relocate to different path

**Batch operations**:
```json
Input: [
  {"operation": "archive", "document": "/old/v1-api.md"},
  {"operation": "move", "document": "/drafts/v2-api.md", "new_path": "/specs/api.md"},
  {"operation": "rename", "document": "/specs/api.md", "new_title": "API v2 Specification"}
]
Output: {
  "batch_results": [
    {"success": true, "action": "archived", "document": "/old/v1-api.md"},
    {"success": true, "action": "moved", "to": "/specs/api.md"},
    {"success": true, "action": "renamed", "document": "/specs/api.md"}
  ],
  "operations_completed": 3
}
```

### 4. add_task
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

### 5. complete_task
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

### 6. browse_documents
Unified browsing and search across documents, folders, and sections:

**Browse Mode (empty query)**:
```json
Input: {"path": "/api"}
Output: {
  "path": "/api",
  "structure": {
    "folders": [
      {
        "name": "specs",
        "path": "/api/specs",
        "namespace": "api/specs",
        "documentCount": 3,
        "hasSubfolders": false
      },
      {
        "name": "guides",
        "path": "/api/guides",
        "namespace": "api/guides",
        "documentCount": 5,
        "hasSubfolders": true
      }
    ],
    "documents": [
      {
        "path": "/api/overview.md",
        "slug": "overview",
        "title": "API Overview",
        "namespace": "api",
        "sections": [
          {"slug": "#introduction", "title": "Introduction", "depth": 2, "hasContent": true},
          {"slug": "#architecture", "title": "Architecture", "depth": 2, "hasContent": true}
        ],
        "tasks": {"total": 2, "completed": 1, "pending": ["tasks[1]"]},
        "lastModified": "2025-09-20T14:30:00Z"
      }
    ]
  },
  "breadcrumb": ["api"],
  "parentPath": "/",
  "totalItems": 9
}
```

**Search Mode (with query)**:
```json
Input: {
  "query": "caching performance",
  "path": "/api"
}
Output: {
  "path": "/api",
  "query": "caching performance",
  "structure": {
    "folders": [],
    "documents": [
      {
        "path": "/api/specs/search-api.md",
        "slug": "search-api",
        "title": "Search API Specification",
        "namespace": "api/specs",
        "sections": [
          {"slug": "#caching", "title": "Caching Strategy", "depth": 2, "hasContent": true},
          {"slug": "#performance", "title": "Performance", "depth": 2, "hasContent": true}
        ],
        "relevance": 0.95,
        "lastModified": "2025-09-19T10:15:00Z"
      }
    ]
  },
  "matches": [
    {
      "document": "/api/specs/search-api.md",
      "section": "#caching",
      "snippet": "Redis-based caching strategies for optimal performance...",
      "relevance": 0.95
    }
  ],
  "relatedTasks": [
    {
      "taskId": "search-api.md#tasks[3]",
      "title": "Implement caching layer",
      "status": "completed"
    }
  ],
  "totalItems": 1
}
```

**Global Search (no path)**:
```json
Input: {"query": "authentication"}
Output: {
  "query": "authentication",
  "structure": {
    "folders": [
      {
        "name": "auth",
        "path": "/backend/auth",
        "namespace": "backend/auth",
        "documentCount": 4,
        "hasSubfolders": false
      }
    ],
    "documents": [
      {
        "path": "/api/specs/auth-api.md",
        "slug": "auth-api",
        "title": "Authentication API",
        "namespace": "api/specs",
        "relevance": 0.98,
        "sections": [
          {"slug": "#jwt-tokens", "title": "JWT Tokens", "depth": 2, "hasContent": true},
          {"slug": "#oauth2", "title": "OAuth2 Flow", "depth": 2, "hasContent": true}
        ]
      }
    ]
  },
  "matches": [
    {
      "document": "/api/specs/auth-api.md",
      "section": "#jwt-tokens",
      "snippet": "JWT-based authentication with refresh tokens...",
      "relevance": 0.98
    }
  ],
  "totalItems": 12
}
```

### 7. view_document
Inspect document structure and content:
```json
Input: {"document": "/api/specs/search-api.md"}
Output: {
  "path": "/api/specs/search-api.md",
  "slug": "search-api",
  "title": "Search API Specification",
  "namespace": "api/specs",
  "sections": [
    {
      "slug": "#overview",
      "title": "Overview",
      "depth": 2,
      "hasContent": true,
      "links": []
    },
    {
      "slug": "#endpoints",
      "title": "Endpoints",
      "depth": 2,
      "hasContent": true,
      "links": ["/api/guides/api-design.md"]
    },
    {
      "slug": "#tasks",
      "title": "Tasks",
      "depth": 2,
      "taskCount": 5,
      "links": [
        "/api/specs/search-api.md#endpoints",
        "/api/guides/optimization.md",
        "/backend/services/caching.md"
      ]
    }
  ],
  "tasks": {
    "total": 5,
    "completed": 2,
    "pending": ["tasks[2]", "tasks[3]", "tasks[4]"]
  },
  "documentLinks": {
    "total": 4,
    "internal": 3,
    "external": 1,
    "broken": [],
    "sectionsWithoutLinks": ["#schemas", "#examples"]
  },
  "lastModified": "2025-09-20T14:30:00Z",
  "wordCount": 1250,
  "headingCount": 8
}
```

## Additional Tool (Quick Win)

### reopen_task
Revert task completion:
```json
Input: {"task_id": "api.md#tasks[0]"}
Output: {"reopened": true, "task_id": "api.md#tasks[0]"}
```

**Note**: This specification reflects the unified tool architecture where:
- `section` tool handles ALL section operations (create/edit/remove)
- `manage_document` tool handles ALL document operations (archive/delete/rename/move)
- `browse_documents` tool unifies browsing and search (replaces `list_documents` + `search_documents`)
- Namespace-based organization replaces rigid document types
- Consistent slug and path handling across all tools

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

#### Phase 1: Namespace Foundation
1. Update `create_document` schemas to use namespaces instead of types
2. Create namespace configuration system with predefined namespaces
3. Add namespace validation and suggestions
4. Update slug generation to handle longer, descriptive titles

#### Phase 2: Unified Browse Tool
1. Create new `browse_documents` tool replacing `list_documents` + `search_documents`
2. Implement hierarchical folder/file/section structure
3. Add search integration with path filtering
4. Support both browse mode (empty query) and search mode (with query)

#### Phase 3: Consistent Integration
1. Update all tools to use consistent path/namespace terminology
2. Ensure all tools expose both slug and title information
3. Add namespace awareness to `section` and `manage_document` tools
4. Update error messages and examples to use new patterns

#### Phase 4: Advanced Features

##### 1. Section-Level Browsing ✅ (Completed)
Section-level browsing allows deep navigation into document structure:
```json
// Browse document sections
Input: {"path": "/api/specs/search-api.md"}
Output: { "sections": [...], "document_context": {...} }

// Browse specific section
Input: {"path": "/api/specs/search-api.md#endpoints"}
Output: { "sections": [...subsections...], "document_context": {...} }
```

##### 2. Cross-Namespace Linking and References

**Problem Statement**: When working on a feature, developers need to see ALL related documents (specs, guides, components, services) without getting lost in recursive link chains.

**Smart Link Discovery System**:
- **Forward Links**: Documents this document references
- **Backward Links**: Documents that reference this document
- **Related Documents**: Documents with similar content/tasks
- **Dependency Chain**: Logical implementation sequence
- **Anti-Recursion**: Smart depth limiting and cycle detection

**Enhanced browse_documents with Link Context**:
```json
Input: {
  "path": "/api/specs/search-api.md",
  "include_related": true,
  "link_depth": 2
}
Output: {
  "document_context": {...},
  "sections": [...],
  "related_documents": {
    "forward_links": [
      {
        "path": "/api/guides/search-implementation.md",
        "title": "Search Implementation Guide",
        "namespace": "api/guides",
        "relationship": "implementation_guide",
        "sections_linked": ["#setup", "#examples"],
        "tasks_linked": 3
      }
    ],
    "backward_links": [
      {
        "path": "/backend/services/search-service.md",
        "title": "Search Service Architecture",
        "namespace": "backend/services",
        "relationship": "implements_spec",
        "sections_linking": ["#api-integration"],
        "completion_status": "75%"
      }
    ],
    "related_by_content": [
      {
        "path": "/frontend/components/search-box.md",
        "title": "Search Box Component",
        "namespace": "frontend/components",
        "relationship": "consumes_api",
        "relevance": 0.85,
        "shared_concepts": ["search queries", "filters", "pagination"]
      }
    ],
    "dependency_chain": [
      {
        "sequence": 1,
        "path": "/api/specs/search-api.md",
        "title": "Search API Specification",
        "status": "completed",
        "blocks": ["/api/guides/search-implementation.md"]
      },
      {
        "sequence": 2,
        "path": "/api/guides/search-implementation.md",
        "title": "Search Implementation Guide",
        "status": "in_progress",
        "blocks": ["/backend/services/search-service.md", "/frontend/components/search-box.md"]
      },
      {
        "sequence": 3,
        "path": "/backend/services/search-service.md",
        "title": "Search Service Architecture",
        "status": "pending",
        "depends_on": ["/api/guides/search-implementation.md"]
      }
    ]
  },
  "implementation_readiness": {
    "specs_ready": true,
    "guides_available": true,
    "components_needed": 2,
    "services_needed": 1,
    "estimated_completion": "85%"
  }
}
```

**Anti-Recursion Strategy**:
- **Depth Limiting**: Max 3 levels of related documents
- **Cycle Detection**: Track visited documents, break cycles
- **Relevance Filtering**: Only show links above relevance threshold
- **Relationship Types**: Categorize links to avoid noise
- **Smart Pruning**: Prefer direct dependencies over distant relations

**Link Relationship Types**:
- `implements_spec`: Implementation follows this specification
- `implementation_guide`: Guide for implementing this spec
- `consumes_api`: Frontend/client that uses this API
- `depends_on`: Requires this to be completed first
- `references`: General reference or citation
- `similar_content`: Related by topic/tags/content similarity

##### 3. Smart Namespace Suggestions

**Problem Statement**: When creating new documents, developers should see intelligent suggestions for related documents, similar implementations, and logical next steps.

**Intelligent Suggestion Engine**:
- **Content Analysis**: Analyze title/overview for topic detection
- **Pattern Recognition**: Find similar documents in other namespaces
- **Completion Gaps**: Identify missing pieces in implementation chains
- **Template Matching**: Suggest proven patterns from existing docs

**Enhanced create_document with Smart Suggestions**:

**Stage 2.5 - Smart Suggestions** (between instructions and creation):
```json
Input: {
  "namespace": "backend/services",
  "title": "User Authentication Service",
  "overview": "JWT-based authentication with refresh tokens"
}
Output: {
  "suggestions": {
    "related_documents": [
      {
        "path": "/api/specs/auth-api.md",
        "title": "Authentication API Specification",
        "namespace": "api/specs",
        "reason": "Your service should implement this API spec",
        "relevance": 0.95,
        "sections_to_reference": ["#jwt-tokens", "#refresh-flow"]
      },
      {
        "path": "/frontend/components/login-form.md",
        "title": "Login Form Component",
        "namespace": "frontend/components",
        "reason": "Frontend component that will consume your service",
        "relevance": 0.80,
        "implementation_gap": "needs_api_integration"
      }
    ],
    "similar_implementations": [
      {
        "path": "/backend/services/authorization-service.md",
        "title": "Authorization Service",
        "namespace": "backend/services",
        "reason": "Similar service architecture you can reference",
        "relevance": 0.75,
        "reusable_patterns": ["JWT handling", "token validation", "error responses"]
      }
    ],
    "missing_pieces": [
      {
        "type": "guide",
        "suggested_path": "/api/guides/auth-integration.md",
        "title": "Authentication Integration Guide",
        "reason": "Implementation guide missing for this auth spec",
        "priority": "high"
      },
      {
        "type": "troubleshooting",
        "suggested_path": "/docs/troubleshooting/auth-issues.md",
        "title": "Authentication Troubleshooting",
        "reason": "Common auth problems documentation needed",
        "priority": "medium"
      }
    ],
    "implementation_sequence": [
      {
        "order": 1,
        "action": "Review API specification",
        "document": "/api/specs/auth-api.md",
        "sections": ["#jwt-tokens", "#endpoints"]
      },
      {
        "order": 2,
        "action": "Create your service document",
        "document": "/backend/services/user-authentication-service.md",
        "focus": "architecture and implementation details"
      },
      {
        "order": 3,
        "action": "Link frontend integration",
        "document": "/frontend/components/login-form.md",
        "focus": "update API endpoints and error handling"
      }
    ]
  },
  "namespace_patterns": {
    "common_sections": ["#architecture", "#endpoints", "#security", "#deployment"],
    "frequent_links": ["/api/specs/", "/docs/troubleshooting/"],
    "typical_tasks": ["Implement core logic", "Add error handling", "Create deployment guide"]
  },
  "next_step": "Review suggestions, then call again with 'create: true' to proceed"
}
```

**Suggestion Algorithm**:
1. **Content Fingerprinting**: Extract keywords, concepts, technology stack
2. **Cross-Namespace Analysis**: Find related docs in other namespaces
3. **Pattern Matching**: Compare against successful doc patterns
4. **Gap Analysis**: Identify missing implementation pieces
5. **Sequence Planning**: Suggest logical implementation order

**Suggestion Categories**:
- **Must Reference**: Direct dependencies (API specs this implements)
- **Should Integrate**: Related components (frontend that consumes this API)
- **Could Reference**: Similar implementations for patterns
- **Missing Pieces**: Gaps in documentation chain
- **Next Steps**: Logical follow-up documents to create

##### 4. Template Customization per Namespace (Future)
Allow customizing templates based on namespace patterns and team preferences.

## Document Linking System

### Overview
A comprehensive linking system that enables documents to reference each other with automatic context loading, hierarchical slug management, and seamless navigation across the documentation ecosystem.

### Link Reference Formats

#### Cross-Document Links
Reference documents and sections across the ecosystem:
```markdown
@/api/specs/auth-api.md                        # Link to entire document
@/api/specs/auth-api.md#overview               # Link to top-level section
@/api/specs/auth-api.md#api/authentication     # Link to nested section
@/api/specs/auth-api.md#api/endpoints/users    # Link to deeply nested section
```

#### Within-Document Links
Reference sections within the current document:
```markdown
@#overview                                      # Link to top-level section in current doc
@#api/authentication                            # Link to nested section in current doc
@#implementation/testing/unit-tests             # Link to deeply nested section
```

#### External Links
Standard markdown links for external resources:
```markdown
[External Resource](https://example.com)        # Regular external link (no @ prefix)
```

### Hierarchical Slug System

#### Structure
Slugs use forward slashes to create hierarchy, preventing naming conflicts:
```
#overview                                       # Top-level section
#api                                           # API parent section
#api/authentication                            # Nested under API
#api/authentication/jwt-tokens                 # Further nested
#api/endpoints                                 # Parallel to authentication
#api/endpoints/users                           # Specific endpoint
#api/endpoints/users/create                    # Specific operation
```

#### Benefits
- **Prevents Conflicts**: Same slug names can exist in different hierarchies
- **Provides Context**: Slug path shows section relationship
- **Enables Navigation**: Natural parent-child traversal
- **Scales Infinitely**: Supports any depth of nesting

### Enhanced Tool Behaviors

#### browse_documents
Shows document path and slug path separately to avoid repetition:
```json
{
  "document_context": {
    "path": "/api/specs/auth-api.md",          // Document path shown once
    "title": "Authentication API",
    "namespace": "api/specs"
  },
  "sections": [
    {
      "slug": "api/authentication",            // Relative slug path only
      "title": "Authentication",
      "full_path": "/api/specs/auth-api.md#api/authentication",  // Full path for reference
      "depth": 2,
      "parent": "api"
    }
  ]
}
```

#### view_document
Enhanced to support namespace-aware viewing with section specificity:
```json
// View entire document
Input: {"path": "/api/specs/auth-api.md"}

// View specific section
Input: {"path": "/api/specs/auth-api.md#api/authentication"}

// View with linked document context
Input: {
  "path": "/api/specs/auth-api.md#api/authentication",
  "include_linked": true,
  "link_depth": 2
}
```

#### section (editing)
Supports hierarchical slugs and provides link assistance:
```json
Input: {
  "document": "/api/specs/auth-api.md",
  "section": "api/endpoints/users",           // Hierarchical slug
  "operation": "append",
  "content": "See [@/api/guides/auth-setup.md#implementation] for details."
}
Output: {
  "updated": true,
  "section": "api/endpoints/users",
  "links_detected": ["/api/guides/auth-setup.md#implementation"],
  "linked_context": [...]                     // Automatic context loading
}
```

### Context Loading

#### Automatic Link Detection
When editing sections, the system automatically:
1. Detects all `@` references in content
2. Validates referenced documents/sections exist
3. Loads linked content into context
4. Provides relevant snippets for reference

#### Context Hierarchy
```
Primary Context (Current Document)
├── Current Section Content
├── Parent Section Headers
└── Sibling Section Summaries

Secondary Context (Linked Documents)
├── Linked Document Metadata
├── Linked Section Content
└── Related Sections (1 level up/down)

Tertiary Context (Suggested)
├── Similar Documents (by content)
└── Related by Namespace
```

### Link Guidance in Tools

#### create_document
Provides linking instructions during document creation:
```json
{
  "linking_guide": {
    "cross_document": "Use @/namespace/path/doc.md#section for cross-doc links",
    "within_document": "Use @#section for within-doc links",
    "examples": [
      "@/api/specs/search-api.md#endpoints",
      "@#implementation/setup",
      "@/backend/services/search.md#architecture"
    ],
    "best_practices": [
      "Link to specifications when implementing",
      "Reference guides from troubleshooting docs",
      "Connect frontend components to their APIs"
    ]
  }
}
```

#### section (editing)
Provides real-time link suggestions while editing:
```json
{
  "link_suggestions": {
    "should_reference": [
      {
        "path": "@/api/specs/auth-api.md#jwt-tokens",
        "reason": "This implementation should reference the spec"
      }
    ],
    "could_reference": [
      {
        "path": "@/api/guides/best-practices.md#error-handling",
        "reason": "Similar error handling patterns"
      }
    ]
  }
}
```

### Edge Cases and Solutions

#### 1. Circular References
**Problem**: Document A links to B, B links to A
**Solution**: Depth limiting (max 3) and cycle detection in context loading

#### 2. Broken Links
**Problem**: Referenced document/section deleted or moved
**Solution**: Link validation on save, migration tools for bulk updates

#### 3. Ambiguous Slugs
**Problem**: Legacy flat slugs like `#overview` everywhere
**Solution**: Migration path to hierarchical, backwards compatibility layer

#### 4. Large Context
**Problem**: Many links could overwhelm context window
**Solution**: Smart summarization, relevance filtering, configurable depth

#### 5. Relative vs Absolute Paths
**Problem**: How to handle `../guides/setup.md` style references
**Solution**: Always resolve to absolute paths internally, support relative in UI

### Implementation Phases

#### Phase 1: Link Reference Infrastructure
- Link parsing utilities (`parseLink()`, `resolveLink()`)
- Hierarchical slug generation (`generateHierarchicalSlug()`)
- Slug path utilities (`splitSlugPath()`, `joinSlugPath()`)
- Link validation (`validateLink()`, `linkExists()`)

#### Phase 2: Tool Updates for Hierarchical Slugs
- Update browse_documents to show slug hierarchy
- Enhance section tool for hierarchical operations
- Update manage_document for slug-aware moves
- Ensure all tools handle hierarchical paths

#### Phase 3: view_document Enhancement
- Add namespace-aware path resolution
- Implement section-specific viewing
- Add linked document context loading
- Provide navigation helpers

#### Phase 4: Link Guidance and Assistance
- Add linking instructions to create_document
- Implement link suggestions in section editing
- Create link validation on save
- Add migration tools for existing documents

### Usage Examples

#### Creating Linked Documentation
```markdown
# User Authentication Service

## Overview
This service implements [@/api/specs/auth-api.md#jwt-tokens](JWT authentication)
following our [@/api/guides/security-best-practices.md](security guidelines).

## Architecture

### Database Schema
See [@#implementation/database] for schema details.

### API Integration
Connects to [@/frontend/components/login-form.md#api-calls](Login Component).

## Implementation

### Database
PostgreSQL schema for user management...

### JWT Handling
Based on [@/api/specs/auth-api.md#jwt-tokens/refresh-flow](refresh token spec)...
```

#### Automatic Context Loading
When editing the JWT Handling section above, the system loads:
```
Primary: /backend/services/auth-service.md#implementation/jwt-handling
Linked:
  - /api/specs/auth-api.md#jwt-tokens (full section)
  - /api/specs/auth-api.md#jwt-tokens/refresh-flow (specific subsection)
  - /api/guides/security-best-practices.md (document summary)
  - /frontend/components/login-form.md#api-calls (relevant section)
```

### Benefits

1. **Seamless Navigation**: Click any `@` link to navigate directly
2. **Contextual Editing**: Linked documents automatically loaded
3. **Prevents Duplication**: Reference instead of copy-paste
4. **Maintains Consistency**: Single source of truth
5. **Discovers Relationships**: See what links to current document
6. **Hierarchical Organization**: No more slug conflicts
7. **Intuitive References**: Natural path-like structure

## Configuration

### Namespace Configuration
```yaml
# .specdocs.config.yaml
namespaces:
  "api/specs":
    description: "REST API specifications with endpoints and schemas"
    template: "api_spec_template"
    examples: ["search-api", "user-api", "payments-api"]

  "api/guides":
    description: "API implementation and integration guides"
    template: "implementation_guide_template"
    examples: ["oauth-setup", "rate-limiting", "error-handling"]

  "frontend/components":
    description: "UI component documentation and examples"
    template: "component_template"
    examples: ["button", "modal", "data-table"]

  "backend/services":
    description: "Backend service architecture and implementation"
    template: "service_template"
    examples: ["auth-service", "search-service", "notification-service"]

  "docs/troubleshooting":
    description: "Problem diagnosis and solution guides"
    template: "troubleshooting_template"
    examples: ["deployment-issues", "performance-problems", "debugging-guide"]

defaults:
  auto_toc: true
  auto_anchors: true
  task_section: "Tasks"
  slug_max_length: 50

paths:
  docs_root: ".spec-docs-mcp/docs"
  templates: ".spec-docs-mcp/templates"
  archived: ".spec-docs-mcp/archived"
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

### Immediate Implementation (Phase 1)
1. **Update create_document tool**: Replace types with namespace system
2. **Add namespace configuration**: Define predefined namespaces with templates
3. **Implement slug consistency**: Ensure all tools expose both slug and title
4. **Test namespace validation**: Verify namespace-to-folder mapping works correctly

### Short-term Goals (Phase 2)
1. **Implement browse_documents tool**: Replace list_documents + search_documents
2. **Add hierarchical browsing**: Support folder/file/section navigation
3. **Integrate search functionality**: Unified search with path filtering
4. **Test mixed-media responses**: Ensure folders, files, and sections work together

### Integration Phase (Phase 3)
1. **Update existing tools**: Add namespace awareness to section and manage_document
2. **Standardize responses**: Consistent slug/title/namespace patterns across all tools
3. **Enhance error handling**: Updated error messages with namespace examples
4. **Comprehensive testing**: End-to-end workflows with new architecture

This unified architecture provides a flexible foundation for spec-driven development while maintaining the progressive discovery patterns that make the system approachable. The namespace-based organization scales naturally as teams grow and documentation becomes more complex.