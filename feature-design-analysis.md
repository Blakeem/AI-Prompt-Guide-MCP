# Feature Design Analysis

## 1. Templates - What They Are

### Current State

**Templates are hardcoded in `src/tools/create/template-processor.ts`:**

```typescript
const NAMESPACE_TEMPLATES: Record<string, {starterStructure: string}> = {
  'api/specs': { starterStructure: '# {{title}}\n\n## Overview...' },
  'api/guides': { starterStructure: '# {{title}}\n\n## Overview...' },
  'frontend/components': { starterStructure: '...' },
  'backend/services': { starterStructure: '...' },
  'docs/troubleshooting': { starterStructure: '...' }
};
```

Each namespace has a predefined markdown structure that gets populated when you create a document.

**Examples:**
- `api/specs` → Includes sections: Overview, Authentication, Base URL, Endpoints, Error Handling, Rate Limits, Tasks
- `api/guides` → Includes: Overview, Prerequisites, Setup, Step-by-Step Implementation, Testing, Troubleshooting
- `backend/services` → Includes: Architecture Overview with Mermaid diagrams, Components, Design Decisions

### Template Management = Would Allow

**Dynamic template editing instead of hardcoded:**
- Edit templates without changing TypeScript code
- Store templates in `.ai-prompt-guide/templates/api-specs.md`
- Add new namespaces without rebuilding
- Share templates across teams via git

### Recommendation: **Not Needed**

**Why:**
1. Templates rarely change (you set them once per project type)
2. Changing requires rebuild anyway (namespace schema updates)
3. Git already provides version control for the template-processor.ts file
4. Adding/editing namespaces is a dev task, not a runtime task
5. Current approach is simple and explicit

**When you might want it:**
- If you're selling this as a product where users need to customize namespaces
- If you have 20+ templates and they change frequently
- If non-developers need to edit templates

**For your use case:** Keep it hardcoded. Easy to edit, version controlled, no complexity.

---

## 2. Search Tool Design

### How I (Claude) Would Use Search

When working on documentation, here's what I actually need:

#### Use Case 1: Finding Mentions
**Scenario:** "Where do we document JWT authentication?"
**Need:** Full-text search across all documents
**Want:** See context around matches, not just filenames

#### Use Case 2: Finding Patterns
**Scenario:** "Which documents reference the auth API?"
**Need:** Find all @/api/specs/auth-api.md references
**Want:** See the surrounding text to understand the reference context

#### Use Case 3: Finding Incomplete Work
**Scenario:** "Which tasks mention 'database'?"
**Need:** Search within task sections specifically
**Want:** Task status, not just content

#### Use Case 4: Finding Examples
**Scenario:** "Where do we show error handling code examples?"
**Need:** Search for code blocks with specific patterns
**Want:** The code block itself, not just the document

### Recommended Design: `search_documents`

```typescript
{
  "query": string,              // Required: search term or regex pattern
  "scope"?: string,             // Optional: "/api/" to limit to namespace
  "type"?: "fulltext" | "regex", // Optional: search mode (default: fulltext)
  "target"?: "all" | "tasks" | "sections" | "code", // Optional: what to search
  "include_context": boolean,   // Optional: show surrounding lines (default: true)
  "context_lines"?: number,     // Optional: how many lines of context (default: 2)
  "max_results"?: number        // Optional: limit results (default: 20)
}
```

**Response Structure (like browse_documents with matches):**

```json
{
  "query": "JWT authentication",
  "results": [
    {
      "document": {
        "path": "/api/specs/auth-api.md",
        "title": "Authentication API",
        "namespace": "api/specs"
      },
      "matches": [
        {
          "section": "#authentication",
          "line_number": 42,
          "match_text": "JWT authentication via Bearer token",
          "context_before": "## Authentication\n\nAll requests require",
          "context_after": "in the Authorization header.\n\n### Token Format",
          "type": "content"  // or "task", "heading", "code"
        }
      ],
      "match_count": 3
    }
  ],
  "total_matches": 12,
  "total_documents": 4,
  "truncated": false
}
```

### Implementation Approach

**Option 1: Leverage Existing Grep Infrastructure**
- `browse_documents` already has document loading
- `Grep` tool exists for ripgrep integration
- Could wrap ripgrep with structure building

**Option 2: Pure JavaScript Search**
- Load all documents via DocumentManager
- String search or regex in memory
- Build structured results

**Recommendation: Hybrid**
```typescript
async function searchDocuments(query, options) {
  // 1. Use ripgrep for fast file-level matching
  const filesWithMatches = await grepDocuments(query, options.scope);

  // 2. Load matched documents via DocumentManager (gets structure)
  const structuredResults = await Promise.all(
    filesWithMatches.map(path => analyzeMatches(path, query, options))
  );

  // 3. Return browse_documents-style structure with match highlights
  return formatSearchResults(structuredResults);
}
```

### What I'd Use Most

**90% of time:** `type: "fulltext"` - Simple string matching
**10% of time:** `type: "regex"` - Finding patterns like `@references` or specific code patterns

**Killer feature:** `include_context: true` - Seeing surrounding text is crucial for understanding relevance

---

## 3. Bulk Operations Design

### Current Tool Pattern

**Universal tools with operation modes:**
- `section` - `operation: replace | append | prepend | insert_before | insert_after | append_child | remove`
- `task` - `operation: create | edit | list`

**Single object input:**
```json
{
  "document": "/api/specs/test.md",
  "section": "overview",
  "operation": "replace",
  "content": "New content"
}
```

### Bulk Design Options

#### Option A: Accept Array OR Single Object (Flexible)

```typescript
// Single operation (current)
{
  "document": "/api/specs/test.md",
  "section": "overview",
  "operation": "replace",
  "content": "New content"
}

// Multiple operations (new)
{
  "document": "/api/specs/test.md",
  "operations": [
    {
      "section": "overview",
      "operation": "replace",
      "content": "New overview"
    },
    {
      "section": "authentication",
      "operation": "replace",
      "content": "New auth section"
    },
    {
      "operation": "insert_after",
      "section": "overview",
      "title": "New Section",
      "content": "Content for new section"
    }
  ]
}
```

**Implementation:**
```typescript
async function section(args) {
  // Detect bulk vs single
  if (args.operations != null) {
    return await bulkSectionOperations(args);
  } else {
    return await singleSectionOperation(args);
  }
}
```

**Pros:**
- ✅ Single tool handles both cases
- ✅ Backward compatible (existing calls still work)
- ✅ Natural for both single and bulk use cases
- ✅ Document is specified once for all operations

**Cons:**
- ⚠️ Schema becomes more complex (union type)
- ⚠️ Need validation for both formats

---

#### Option B: Separate `operations` Array Field (Explicit)

```typescript
{
  "document": "/api/specs/test.md",
  "operations": [
    {
      "type": "section",
      "section": "overview",
      "operation": "replace",
      "content": "New content"
    },
    {
      "type": "task",
      "operation": "create",
      "title": "Implement Feature",
      "content": "Task content"
    }
  ]
}
```

**Pros:**
- ✅ Can mix section and task operations
- ✅ Very flexible for complex workflows
- ✅ Clear "this is bulk mode"

**Cons:**
- ❌ More verbose for simple cases
- ❌ Requires type discrimination
- ❌ Single operations become more complex

---

#### Option C: Keep Single Tool, Add Batch Flag

```typescript
// Single operation
{
  "document": "/api/specs/test.md",
  "section": "overview",
  "operation": "replace",
  "content": "New content"
}

// Batch mode (explicit)
{
  "document": "/api/specs/test.md",
  "batch": true,
  "sections": [
    { "section": "overview", "operation": "replace", "content": "..." },
    { "section": "auth", "operation": "replace", "content": "..." }
  ]
}
```

**Pros:**
- ✅ Clear distinction between single and batch
- ✅ Backward compatible
- ✅ Simpler validation

**Cons:**
- ⚠️ Still two schemas in one tool
- ⚠️ `batch: true` is explicit but redundant

---

### Recommendation: **Option A (Flexible Union)**

**Why:**
1. Most natural API - "operations" clearly signals bulk
2. Backward compatible - existing single calls work unchanged
3. Document specified once - efficient
4. No redundant flags or type fields
5. Matches REST API patterns (POST /resources vs POST /resources/batch)

**Schema Design:**
```typescript
{
  document: string;

  // Single operation mode
  section?: string;
  operation?: 'replace' | 'append' | ...;
  content?: string;
  title?: string;

  // Bulk operation mode
  operations?: Array<{
    section: string;
    operation: 'replace' | 'append' | ...;
    content: string;
    title?: string;
  }>;
}

// Validation: Exactly one of (operation + content) OR operations must be present
```

**Response for Bulk:**
```json
{
  "success": true,
  "document": "/api/specs/test.md",
  "operations_completed": 3,
  "results": [
    { "section": "overview", "status": "updated" },
    { "section": "auth", "status": "updated" },
    { "section": "new-section", "status": "created" }
  ],
  "timestamp": "2025-10-12T00:15:30.123Z"
}
```

---

## 4. Task Bulk Operations

### Natural Use Case

**Creating a workflow with multiple tasks at once:**

```json
{
  "document": "/api/specs/new-api.md",
  "operations": [
    {
      "operation": "create",
      "title": "Design API Schema",
      "content": "Create OpenAPI specification\n\n@/api/specs/common-patterns.md"
    },
    {
      "operation": "create",
      "title": "Implement Endpoints",
      "content": "Build REST endpoints\n\n@/api/specs/new-api.md#design-api-schema"
    },
    {
      "operation": "create",
      "title": "Add Tests",
      "content": "Comprehensive test coverage\n\n@/api/specs/new-api.md#implement-endpoints"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "document": "/api/specs/new-api.md",
  "tasks_created": 3,
  "results": [
    { "slug": "design-api-schema", "title": "Design API Schema" },
    { "slug": "implement-endpoints", "title": "Implement Endpoints" },
    { "slug": "add-tests", "title": "Add Tests" }
  ],
  "timestamp": "2025-10-12"
}
```

---

## Summary & Recommendations

### ✅ Implement These

**1. Search Tool**
```
Priority: High
Design: Full-text with optional regex, returns browse_documents-style structure with matches
Use Case: 90% of my document searching needs
Implementation: Hybrid (ripgrep + DocumentManager for structure)
```

**2. Bulk Section Operations**
```
Priority: Medium-High
Design: Option A (accept operations array OR single operation)
Use Case: Creating/editing multiple sections in one call
Implementation: Detect operations field, iterate with existing logic
```

**3. Bulk Task Operations**
```
Priority: Medium
Design: Same pattern as bulk sections (operations array)
Use Case: Creating workflows with multiple related tasks
Implementation: Same as bulk sections
```

### ❌ Skip These

**1. Template Management**
```
Reason: Hardcoded templates work fine, rarely change
Alternative: Edit template-processor.ts when needed (it's easy)
```

**2. Separate Bulk Tools**
```
Reason: Confusing to have both task and task_bulk
Alternative: One tool that handles both via operations array
```

### 📊 Priority Order

1. **Search tool** - Most immediately useful, clear design
2. **Bulk section operations** - Natural extension of existing tool
3. **Bulk task operations** - Same pattern, different domain
4. **Make content optional for remove** - Simple improvement

---

## How I'd Use These Features

### Daily Document Work

**Morning:** Use `search_documents` to find where we document JWT
```json
{"query": "JWT", "scope": "/api/"}
```

**Afternoon:** Create new API doc with bulk sections
```json
{
  "document": "/api/specs/payment-api.md",
  "operations": [
    {"section": "overview", "operation": "replace", "content": "Payment processing API..."},
    {"section": "endpoints", "operation": "replace", "content": "### POST /payments..."},
    {"section": "authentication", "operation": "replace", "content": "Uses JWT tokens..."}
  ]
}
```

**Evening:** Create task workflow
```json
{
  "document": "/api/specs/payment-api.md",
  "operations": [
    {"operation": "create", "title": "Implement Stripe integration", "content": "..."},
    {"operation": "create", "title": "Add refund endpoint", "content": "..."},
    {"operation": "create", "title": "Test payment flows", "content": "..."}
  ]
}
```

**Result:** Much faster than 10+ individual section/task calls.
