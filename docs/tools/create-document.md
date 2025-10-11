# create_document Tool Specification

## Overview

The `create_document` tool enables progressive, guided document creation through an intelligent multi-stage workflow. Rather than requiring all parameters upfront, the tool reveals parameters gradually, providing namespace-specific guidance and intelligent suggestions at each stage.

**Key Capabilities:**
- Progressive parameter discovery (3 stages: Discovery → Instructions → Creation)
- Namespace-based document templates with rich section structures
- Custom namespace support with simple templates
- Intelligent document suggestions and pattern analysis
- Security-validated namespace paths
- Automatic document structure with table of contents

**Design Philosophy:**
The tool uses a **progressive discovery pattern** to conserve context, guide users through complex workflows, and provide stage-appropriate assistance. Each stage builds upon the previous one, revealing new parameters only when needed.

## Progressive Discovery Workflow

### Stage Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Stage 0: DISCOVERY                                              │
│ No parameters required                                          │
│                                                                 │
│ Input:  {}                                                      │
│ Output: Available namespaces with descriptions                  │
│ Next:   Reveals 'namespace' parameter                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ User provides: { namespace: "api/specs" }
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Stage 1: INSTRUCTIONS                                           │
│ Required: namespace                                             │
│                                                                 │
│ Input:  { namespace: "api/specs" }                             │
│ Output: Namespace-specific instructions + template structure   │
│ Next:   Reveals 'title' and 'overview' parameters              │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ User provides: { namespace, title, overview }
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Stage 2: CREATION                                               │
│ Required: namespace, title, overview                            │
│                                                                 │
│ Input:  { namespace: "api/specs",                              │
│           title: "Search API",                                 │
│           overview: "Full-text search..." }                    │
│ Output: Created document with suggestions + patterns           │
│ Next:   Document ready for section/task operations             │
└─────────────────────────────────────────────────────────────────┘
```

### Stage Determination Logic

The current stage is automatically determined by analyzing provided arguments:

```typescript
function determineStage(args):
  if (has namespace AND title AND overview):
    return 2  // Creation - create document immediately

  if (has namespace):
    return 1  // Instructions - show namespace guidance

  return 0    // Discovery - show available namespaces
```

**Important:** Stage transitions are automatic based on argument presence. The tool does not require explicit stage tracking by the client.

## Input Parameters

### Stage 0: Discovery (No Parameters)

**Call with empty parameters or no parameters:**

```json
{}
```

**Purpose:** Discover available document namespaces and their purposes.

### Stage 1: Instructions (namespace only)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | string | Yes | Document namespace (predefined or custom) |

**Example:**
```json
{
  "namespace": "api/specs"
}
```

**Predefined Namespaces:**
- `api/specs` - REST API specifications with endpoints and schemas
- `api/guides` - Step-by-step API implementation guides
- `frontend/components` - UI component documentation
- `backend/services` - Service architecture documentation
- `docs/troubleshooting` - Troubleshooting guides and solutions

**Custom Namespaces:**
Users can provide custom namespaces like `"custom/my-namespace"` which are validated for security and structure.

### Stage 2: Creation (all parameters)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | string | Yes | Document namespace (predefined or custom) |
| `title` | string | Yes | Document title (used for display and slug generation) |
| `overview` | string | Yes | Content for the Overview section |

**Example:**
```json
{
  "namespace": "api/specs",
  "title": "Search API",
  "overview": "Full-text search with ranking capabilities and filtering options"
}
```

**Validation Rules:**
- `namespace`: Cannot be empty, contain path traversal (`..`), absolute paths, or invalid filesystem characters
- `title`: Cannot be empty, used to generate document slug (kebab-case)
- `overview`: Cannot be empty, inserted into the Overview section of the template

## Output Format

### Stage 0: Discovery Response

```json
{
  "stage": "discovery",
  "namespaces": [
    {
      "id": "api/specs",
      "name": "API Specifications",
      "description": "Document REST APIs with endpoints, schemas, and examples",
      "folder": "/api/specs",
      "template": "api_spec"
    },
    // ... other namespaces
  ],
  "next_step": "Call again with 'namespace' parameter to get specific instructions",
  "example": {
    "namespace": "api/specs"
  }
}
```

### Stage 1: Instructions Response

```json
{
  "stage": "instructions",
  "namespace": "api/specs",
  "instructions": [
    "Research current API patterns and industry standards for your domain",
    "Define clear request/response schemas using JSON Schema or OpenAPI",
    "Include realistic examples with actual data structures",
    "Document all error conditions with proper HTTP status codes",
    "Specify authentication and authorization requirements",
    "Add rate limiting and pagination details"
  ],
  "starter_structure": "# {{title}}\n\n## Overview\n...",
  "next_step": "Call again with namespace, title, and overview to create the document",
  "example": {
    "namespace": "api/specs",
    "title": "Search API",
    "overview": "Full-text search with ranking capabilities"
  },
  "smart_suggestions_note": "After providing title and overview, you'll receive intelligent suggestions about related documents, similar implementations, and logical next steps before creating the document."
}
```

### Stage 2: Creation Response

```json
{
  "stage": "creation",
  "success": true,
  "created": "/api/specs/search-api.md",
  "document": {
    "path": "/api/specs/search-api.md",
    "slug": "search-api",
    "title": "Search API",
    "namespace": "api/specs",
    "created": "2025-10-11T12:00:00.000Z"
  },
  "sections": [
    "#overview",
    "#authentication",
    "#base-url",
    "#endpoints",
    "#error-handling",
    "#rate-limits",
    "#tasks"
  ],
  "suggestions": {
    "related_documents": [
      {
        "path": "/api/specs/user-api.md",
        "title": "User API",
        "namespace": "api/specs",
        "reason": "Related documentation in api/specs namespace",
        "relevance": 0.85,
        "sections_to_reference": ["#authentication"],
        "implementation_gap": "Consider referencing authentication patterns"
      }
    ],
    "broken_references": []
  },
  "namespace_patterns": {
    "common_sections": ["#overview", "#authentication", "#endpoints"],
    "frequent_links": ["/api/guides/auth-implementation"],
    "typical_tasks": ["Implement endpoint validation"]
  },
  "next_actions": [
    "Use section tool with operation 'edit' to add content to any section",
    "Use task tool to populate the tasks section with specific items",
    "Use section tool with operation 'insert_after' to add new sections as needed",
    "Review suggestions above and use section tool to add @references to related documents"
  ]
}
```

### Error Response

```json
{
  "stage": "error_fallback",
  "error": "Namespace too long",
  "details": "Namespace must be 100 characters or less",
  "provided_parameters": {
    "namespace": "very/long/namespace/path/...",
    "title": "Example",
    "overview": "Example overview"
  },
  "help": "Document creation failed. Please check your parameters and try again.",
  "suggestion": "Start over with the discovery flow for guidance",
  "recovery_steps": [
    "Call create_document with no parameters to see available namespaces",
    "Call create_document with just { 'namespace': 'your_namespace' } for instructions",
    "Call create_document with all required parameters: namespace, title, and overview"
  ],
  "example": {
    "namespace": "api/specs",
    "title": "Search API",
    "overview": "Full-text search capabilities"
  }
}
```

## Session State Management

### Session State Integration

The tool maintains session state through the global `SessionStore` singleton:

```typescript
interface SessionState {
  sessionId: string;
  createDocumentStage: number;  // Current stage: 0, 1, or 2
}
```

### State Update Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. executeCreateDocumentPipeline() called                      │
│    - Extract parameters: namespace, title, overview            │
│    - Determine current stage from parameters                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Compare stage to session.createDocumentStage                │
│    - If different: Update session + trigger onStageChange()    │
│    - If same: Continue without update                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Process stage logic                                          │
│    - Stage 0: processDiscovery()                               │
│    - Stage 1: processInstructions()                            │
│    - Stage 2: executeCreationStage()                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. After successful response                                    │
│    - Update to next stage: getNextCreateDocumentStage()        │
│    - Trigger onStageChange() for tool list update              │
└─────────────────────────────────────────────────────────────────┘
```

**Key Points:**
- Stage updates trigger `onStageChange()` callback → tool list refresh
- Each successful stage response updates to next stage **after** returning
- This ensures the next tool list shows the appropriate schema
- Session state persists across tool calls within the same MCP connection

### When State Updates Occur

1. **Before Stage Processing:**
   - If determined stage differs from `session.createDocumentStage`
   - Updates session and triggers tool list refresh

2. **After Stage Response:**
   - After successful stage 0 (discovery) → update to stage 1
   - After successful stage 1 (instructions) → update to stage 2
   - After successful stage 2 (creation) → remains at stage 2

## Template System

### Predefined Namespace Templates

Each predefined namespace has a rich template structure:

#### api/specs Template

```markdown
# {{title}}

## Overview
Brief description of the API's purpose and key capabilities.

## Authentication
Authentication method and requirements.

## Base URL
```
https://api.example.com/v1
```

## Endpoints

### GET /example
Description of the endpoint.

**Request:**
```http
GET /example HTTP/1.1
Host: api.example.com
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {}
}
```

## Error Handling
Standard error response format and common error codes.

## Rate Limits
Rate limiting policies and headers.

## Tasks
- [ ] Implement endpoint validation
- [ ] Add comprehensive error handling
- [ ] Set up rate limiting
```

**Template Features:**
- Rich section structure specific to API documentation
- Code blocks for examples and schemas
- Task section for implementation tracking
- Placeholder text guides content creation

### Custom Namespace Templates

Custom namespaces use a simpler, flexible template:

```markdown
# {{title}}

## Overview
Brief description of the purpose and key points.

{{overview}}

## Additional Content
Add sections relevant to your specific use case.

## Tasks
- [ ] Review and expand content
- [ ] Add specific examples
- [ ] Include relevant details
```

**Template Features:**
- Minimal structure for flexibility
- Overview section populated with user content
- Placeholder sections for custom additions
- Task section for tracking work

### Template Variable Substitution

- `{{title}}` → Replaced with the document title
- `{{overview}}` → Replaced with provided overview content in Overview section
- Template selection based on namespace (predefined vs custom)

## Document Path Generation

### Path Generation Rules

```typescript
// For predefined namespaces:
path = namespaceConfig.folder + "/" + titleToSlug(title) + ".md"
// Example: "/api/specs/search-api.md"

// For custom namespaces:
path = "/" + namespace + "/" + titleToSlug(title) + ".md"
// Example: "/custom/my-namespace/my-document.md"
```

### Slug Generation

The `titleToSlug()` function converts titles to URL-safe slugs:

- Converts to lowercase
- Replaces spaces with hyphens
- Removes special characters
- Handles Unicode properly

**Examples:**
- `"Search API"` → `"search-api"`
- `"User Management System"` → `"user-management-system"`
- `"OAuth 2.0 Guide"` → `"oauth-20-guide"`

### Path Validation

All generated paths are validated using the central addressing system:

```typescript
parseDocumentAddress(docPath);  // Throws AddressingError if invalid
```

**Validation Checks:**
- No path traversal attempts (`..`)
- Valid absolute path format (starts with `/`)
- Proper markdown extension (`.md`)
- Valid filesystem characters only

## Namespace Validation

### Security Validation Rules

Custom namespaces undergo strict security validation:

1. **Non-Empty:** Namespace cannot be an empty string
2. **No Path Traversal:** Cannot contain `..` or `\` characters
3. **No Absolute Paths:** Cannot start with `/` or contain `:`
4. **Valid Characters:** Only letters, numbers, hyphens, underscores, and forward slashes
5. **Length Limit:** Maximum 100 characters

### Validation Error Examples

```json
// Path traversal attempt
{
  "stage": "error_fallback",
  "error": "Invalid namespace path",
  "provided_namespace": "custom/../secrets",
  "help": "Namespace cannot contain '..' or '\\' characters for security reasons"
}

// Absolute path attempt
{
  "stage": "error_fallback",
  "error": "Absolute paths not allowed in namespace",
  "provided_namespace": "/etc/config",
  "help": "Use relative namespace paths only, such as 'custom/my-namespace'"
}

// Invalid characters
{
  "stage": "error_fallback",
  "error": "Invalid characters in namespace",
  "provided_namespace": "custom/bad<name>",
  "help": "Namespace can only contain letters, numbers, hyphens, underscores, and forward slashes"
}
```

## Pipeline Architecture

### Pipeline Flow

The tool uses a modular pipeline architecture with clear separation of concerns:

```
executeCreateDocumentPipeline()
  ├─→ determineCreateDocumentStage(args)
  ├─→ updateSessionState(sessionStore)
  │
  ├─→ Stage 0: processDiscovery()
  │     └─→ getDocumentNamespaces()
  │
  ├─→ Stage 1: processInstructions(namespace)
  │     ├─→ validateCustomNamespacePath()
  │     ├─→ NAMESPACE_INSTRUCTIONS lookup
  │     └─→ generateNamespaceExample()
  │
  └─→ Stage 2: executeCreationStage()
        ├─→ validateCreationPrerequisites()
        ├─→ validateNamespaceForCreation()
        ├─→ processTemplate()
        │     ├─→ titleToSlug()
        │     ├─→ parseDocumentAddress() [validation]
        │     └─→ Template selection + variable substitution
        │
        └─→ createDocumentFile()
              ├─→ parseDocumentAddress() [final validation]
              ├─→ manager.createDocument()
              ├─→ writeDocumentContent()
              ├─→ refreshDocumentCache()
              ├─→ analyzeDocumentSuggestions()
              └─→ analyzeNamespacePatterns()
```

### Module Responsibilities

| Module | File | Responsibility |
|--------|------|----------------|
| **Pipeline Orchestrator** | `pipeline.ts` | Coordinates stage flow, session management, error handling |
| **Validation Processor** | `validation-processor.ts` | Stages 0-1, namespace validation, instructions generation |
| **Template Processor** | `template-processor.ts` | Template selection, variable substitution, path generation |
| **File Creator** | `file-creator.ts` | Stage 2 execution, file creation, suggestion generation |

### Error Handling Strategy

Each pipeline stage can return errors without throwing:

```typescript
type PipelineResult =
  | DiscoveryResult           // Stage 0 success
  | InstructionsResult        // Stage 1 success
  | DocumentCreationResult    // Stage 2 success
  | ValidationErrorResult     // Validation failure
  | CreationErrorResult;      // Creation failure
```

**Benefits:**
- No try-catch cascades
- Clear error context at each stage
- Recovery guidance in all error responses
- Type-safe result handling

## Suggestion Generation

### Related Documents Analysis

The tool analyzes existing documents to suggest related content:

```typescript
analyzeDocumentSuggestions(manager, namespace, title, overview)
  → Returns: {
      related_documents: RelatedDocumentSuggestion[],
      broken_references: BrokenReference[]
    }
```

**Suggestion Criteria:**
- Same namespace (higher relevance)
- Similar titles (text similarity)
- Shared terminology in overview
- Referenced by other documents
- Common task patterns

**Suggestion Fields:**
```typescript
interface RelatedDocumentSuggestion {
  path: string;              // Document path
  title: string;             // Document title
  namespace: string;         // Document namespace
  reason: string;            // Why this is relevant
  relevance: number;         // 0.0 to 1.0 relevance score
  sections_to_reference?: string[];     // Specific sections
  implementation_gap?: string;          // Missing implementation notes
}
```

### Namespace Pattern Analysis

Analyzes patterns across the namespace for contextual guidance:

```typescript
analyzeNamespacePatterns(manager, namespace)
  → Returns: {
      common_sections: string[],    // Frequently used section names
      frequent_links: string[],     // Common @references
      typical_tasks: string[]       // Common task patterns
    }
```

**Use Cases:**
- Discover common section structures in namespace
- Identify frequently referenced documents
- Learn typical task patterns for the document type
- Maintain consistency across similar documents

## Integration Points

### DocumentManager Integration

The tool uses DocumentManager for all document operations:

```typescript
// Document creation
await manager.createDocument(docPath, {
  title: string,
  template: 'blank',  // Using our own template
  features: {
    toc: true,              // Table of contents
    anchors: true,          // Section anchors
    codeHighlight: true,    // Code syntax highlighting
    mermaid: true,          // Mermaid diagrams
    searchIndex: true       // Full-text search indexing
  }
});

// Cache access
const document = await manager.getDocument(docPath);
const headings = document.headings;  // Parsed heading structure
```

### Document Cache Integration

The tool manages cache lifecycle:

```typescript
// Invalidate after creation
globalCache.invalidateDocument(docPath);

// Refresh to load new document
const document = await manager.getDocument(docPath);
```

**Cache Considerations:**
- Document created → cache invalidated → fresh load
- Ensures suggestion analysis uses latest data
- Heading structure cached for section operations

### Addressing System Integration

All document paths validated through central addressing:

```typescript
import { parseDocumentAddress, AddressingError } from '../shared/addressing-system.js';

try {
  const address = parseDocumentAddress(docPath);
  // address.path, address.slug, address.namespace, address.cacheKey
} catch (error) {
  if (error instanceof AddressingError) {
    // Handle with error code and context
  }
}
```

**Benefits:**
- Type-safe address parsing
- Consistent path validation
- LRU cache optimization
- Custom error types with context

## Use Cases & Examples

### Example 1: Creating an API Specification

**Step 1 - Discovery:**
```json
// Tool Call
{}

// Response
{
  "stage": "discovery",
  "namespaces": [
    { "id": "api/specs", "name": "API Specifications", ... },
    // ... other namespaces
  ],
  "next_step": "Call again with 'namespace' parameter..."
}
```

**Step 2 - Instructions:**
```json
// Tool Call
{
  "namespace": "api/specs"
}

// Response
{
  "stage": "instructions",
  "namespace": "api/specs",
  "instructions": [
    "Research current API patterns...",
    "Define clear request/response schemas...",
    // ... more instructions
  ],
  "starter_structure": "# {{title}}\n\n## Overview\n...",
  "example": {
    "namespace": "api/specs",
    "title": "Search API",
    "overview": "Full-text search with ranking capabilities"
  }
}
```

**Step 3 - Creation:**
```json
// Tool Call
{
  "namespace": "api/specs",
  "title": "Search API",
  "overview": "Full-text search API with ranking, filtering, and faceted search capabilities. Supports multiple query types and result customization."
}

// Response
{
  "stage": "creation",
  "success": true,
  "created": "/api/specs/search-api.md",
  "document": {
    "path": "/api/specs/search-api.md",
    "slug": "search-api",
    "title": "Search API",
    "namespace": "api/specs",
    "created": "2025-10-11T12:00:00.000Z"
  },
  "sections": ["#overview", "#authentication", "#base-url", "#endpoints", ...],
  "suggestions": {
    "related_documents": [
      {
        "path": "/api/specs/user-api.md",
        "title": "User API",
        "namespace": "api/specs",
        "reason": "Related API in same namespace",
        "relevance": 0.85,
        "sections_to_reference": ["#authentication"]
      }
    ]
  },
  "next_actions": [...]
}
```

### Example 2: Creating a Custom Namespace Document

**Step 1 - Instructions with Custom Namespace:**
```json
// Tool Call
{
  "namespace": "internal/design-docs"
}

// Response
{
  "stage": "instructions",
  "namespace": "internal/design-docs",
  "instructions": [
    "Create clear, concise documentation...",
    "Focus on essential information...",
    // ... generic instructions for custom namespace
  ],
  "starter_structure": "# {{title}}\n\n## Overview\n...",
  "example": {
    "namespace": "internal/design-docs",
    "title": "Design Docs Documentation",
    "overview": "Documentation for design-docs functionality and usage"
  }
}
```

**Step 2 - Creation:**
```json
// Tool Call
{
  "namespace": "internal/design-docs",
  "title": "Authentication System Design",
  "overview": "Design document for the new OAuth 2.0 authentication system with JWT tokens and refresh token rotation."
}

// Response
{
  "stage": "creation",
  "success": true,
  "created": "/internal/design-docs/authentication-system-design.md",
  "document": {
    "path": "/internal/design-docs/authentication-system-design.md",
    "slug": "authentication-system-design",
    "title": "Authentication System Design",
    "namespace": "internal/design-docs",
    "created": "2025-10-11T12:00:00.000Z"
  },
  "sections": ["#overview", "#additional-content", "#tasks"],
  "suggestions": { "related_documents": [], "broken_references": [] },
  "next_actions": [...]
}
```

### Example 3: Error Handling - Invalid Namespace

```json
// Tool Call
{
  "namespace": "custom/../secrets"
}

// Response
{
  "stage": "error_fallback",
  "error": "Invalid namespace path",
  "provided_namespace": "custom/../secrets",
  "help": "Namespace cannot contain '..' or '\\' characters for security reasons",
  "namespaces": [
    { "id": "api/specs", ... },
    // ... all available namespaces
  ],
  "next_step": "Call again with a safe namespace path",
  "example": { "namespace": "custom/safe-namespace" }
}
```

## Implementation Details

### Key Functions

#### `executeCreateDocumentPipeline(args, state, manager, onStageChange)`

**Purpose:** Main orchestrator for the progressive discovery workflow.

**Parameters:**
- `args` - Tool arguments from MCP client
- `state` - Session state with `createDocumentStage` tracking
- `manager` - DocumentManager instance for operations
- `onStageChange` - Callback to trigger tool list refresh

**Returns:** `PipelineResult` (union of all possible stage results)

**Stage Determination:**
1. Extract `namespace`, `title`, `overview` from args
2. Call `determineCreateDocumentStage(args)` to get current stage
3. Compare to `state.createDocumentStage`, update if different
4. Route to appropriate stage processor

#### `processDiscovery()`

**Purpose:** Handle Stage 0 - return available namespaces.

**Returns:** `DiscoveryResult` with namespace list and next step guidance.

**Implementation:**
- Calls `getDocumentNamespaces()` for predefined list
- Returns all namespaces with descriptions
- Provides example for next stage call

#### `processInstructions(namespace)`

**Purpose:** Handle Stage 1 - return namespace-specific guidance.

**Parameters:**
- `namespace` - The namespace to provide instructions for

**Returns:** `InstructionsResult` or `ValidationErrorResult`

**Implementation:**
1. Validate namespace with `validateCustomNamespacePath()`
2. Check if predefined namespace exists in `NAMESPACE_INSTRUCTIONS`
3. Return rich instructions + starter structure for predefined
4. Return generic instructions + simple structure for custom

#### `executeCreationStage(namespace, title, overview, manager)`

**Purpose:** Handle Stage 2 - create the document.

**Parameters:**
- `namespace`, `title`, `overview` - User-provided parameters
- `manager` - DocumentManager for operations

**Returns:** `DocumentCreationResult` or `CreationErrorResult`

**Implementation Flow:**
1. `validateCreationPrerequisites()` - Basic input validation
2. `validateNamespaceForCreation()` - Security validation
3. `processTemplate()` - Generate content from template
4. `createDocumentFile()` - Create file and analyze suggestions

#### `processTemplate(namespace, title, overview, manager)`

**Purpose:** Process template and generate document content.

**Returns:** `TemplateProcessingResult` or `TemplateProcessingError`

**Implementation:**
1. Generate slug from title using `titleToSlug()`
2. Check if predefined namespace (use rich template) or custom (use simple template)
3. Generate document path based on namespace type
4. Validate path with `parseDocumentAddress()`
5. Substitute template variables (`{{title}}`, overview section)

#### `createDocumentFile(namespace, title, overview, manager, content, docPath, slug)`

**Purpose:** Create the actual document file and generate suggestions.

**Returns:** `DocumentCreationResult` or `FileCreationError`

**Implementation:**
1. Validate final document path with addressing system
2. Create document with `manager.createDocument()`
3. Write content to file system
4. Invalidate and refresh document cache
5. Analyze suggestions with `analyzeDocumentSuggestions()`
6. Analyze namespace patterns with `analyzeNamespacePatterns()`
7. Return creation result with suggestions

### Stage Transitions

**Automatic Stage Advancement:**

```typescript
// After Stage 0 response
const nextStage = getNextCreateDocumentStage(0);  // Returns 1
sessionStore.updateSession(sessionId, { createDocumentStage: 1 });
onStageChange();  // Trigger tool list refresh

// After Stage 1 response
const nextStage = getNextCreateDocumentStage(1);  // Returns 2
sessionStore.updateSession(sessionId, { createDocumentStage: 2 });
onStageChange();  // Trigger tool list refresh

// After Stage 2 response
const nextStage = getNextCreateDocumentStage(2);  // Returns 2 (max stage)
// Stage remains at 2, no further advancement
```

**Stage Reset:**

The stage resets to 0 when:
- New MCP connection (new session)
- Explicit session reset (if implemented)
- Session timeout (TTL: 24 hours)

### Error Recovery

All error responses include comprehensive recovery guidance:

```typescript
{
  stage: 'error_fallback',
  error: 'Human-readable error message',
  details: 'Technical error details',
  provided_parameters: { /* What user provided */ },
  help: 'How to fix this issue',
  suggestion: 'Recommended next action',
  recovery_steps: [
    'Step 1: Do this',
    'Step 2: Then this',
    'Step 3: Finally this'
  ],
  example: { /* Working example */ }
}
```

**Error Types:**
- Validation errors (empty fields, invalid characters)
- Security errors (path traversal, absolute paths)
- Creation errors (file system issues, template errors)
- Unexpected errors (caught and wrapped with context)

## Testing Recommendations

### MCP Inspector Testing

```bash
# Build first
pnpm build

# Stage 0 - Discovery
npx @modelcontextprotocol/inspector --cli node dist/index.js \
  --method tools/call \
  --tool-name create_document

# Stage 1 - Instructions
npx @modelcontextprotocol/inspector --cli node dist/index.js \
  --method tools/call \
  --tool-name create_document \
  --tool-arg namespace=api/specs

# Stage 2 - Creation
npx @modelcontextprotocol/inspector --cli node dist/index.js \
  --method tools/call \
  --tool-name create_document \
  --tool-arg namespace=api/specs \
  --tool-arg title="Test API" \
  --tool-arg overview="Test API for testing"
```

### Unit Test Coverage

Key test scenarios from `create-document.test.ts`:

1. **Stage 0 Tests:**
   - Returns discovery stage with namespaces
   - Updates session state to stage 1
   - Triggers onStageChange callback

2. **Stage 1 Tests:**
   - Returns instructions for predefined namespace
   - Returns custom instructions for unknown namespace
   - Validates namespace security (path traversal, absolute paths, invalid chars)
   - Updates session state to stage 2

3. **Stage 2 Tests:**
   - Creates document successfully
   - Generates correct document path and slug
   - Returns creation result with sections and suggestions
   - Handles template processing errors
   - Handles file creation errors

4. **Validation Tests:**
   - Empty parameter validation
   - Invalid character handling
   - Length limit enforcement
   - Path traversal prevention

### Integration Test Scenarios

1. **Complete Progressive Flow:**
   - Call with no params → verify discovery response
   - Call with namespace → verify instructions response
   - Call with all params → verify document created

2. **Custom Namespace:**
   - Create document in custom namespace
   - Verify path generation
   - Verify simple template used

3. **Error Recovery:**
   - Trigger validation error → verify recovery steps
   - Fix and retry → verify success

4. **Suggestion Generation:**
   - Create document in populated namespace
   - Verify related document suggestions
   - Verify namespace pattern analysis

## Related Tools

### Downstream Tool Usage

After document creation, these tools are typically used:

1. **section tool** - Edit section content, add new sections
2. **task tool** - Create and manage tasks in Tasks section
3. **view_document tool** - Inspect document structure and stats
4. **manage_document tool** - Archive, rename, or move documents

### Cross-Tool Integration

The `create_document` tool output includes `next_actions` that guide users to appropriate follow-up tools:

```json
"next_actions": [
  "Use section tool with operation 'edit' to add content to any section",
  "Use task tool to populate the tasks section with specific items",
  "Use section tool with operation 'insert_after' to add new sections as needed",
  "Review suggestions above and use section tool to add @references to related documents"
]
```

## Performance Considerations

### Caching Strategy

- Document addressing results cached in LRU cache (1000 item limit)
- Template structures stored in memory (no file I/O per creation)
- Namespace configurations preloaded at server startup

### Async Operations

The creation stage performs parallel operations where possible:

```typescript
const [suggestions, namespacePatterns] = await Promise.all([
  analyzeDocumentSuggestions(manager, namespace, title, overview),
  analyzeNamespacePatterns(manager, namespace)
]);
```

### Resource Limits

- Namespace path limit: 100 characters
- Title length: No explicit limit (reasonable document titles expected)
- Overview length: No explicit limit (section content can be large)
- Maximum documents in cache: Per DocumentCache configuration

## Security Considerations

### Path Traversal Prevention

Multiple layers of protection:

1. **Namespace Validation:** Rejects `..`, `\`, absolute paths
2. **Path Generation Validation:** Generated paths validated through addressing system
3. **Final Path Validation:** Document path validated before file creation

### File System Safety

- All paths validated through `parseDocumentAddress()`
- Addresses must be absolute and within docs base path
- No user-provided raw file system paths accepted

### Resource Exhaustion Prevention

- Namespace length limited to 100 characters
- Session state capped by SessionStore limits (1000 sessions max)
- Document cache has size and eviction limits

## Future Enhancements

Potential future improvements:

1. **Template Customization:**
   - User-defined templates for namespaces
   - Template inheritance and composition

2. **Advanced Suggestions:**
   - ML-based document similarity
   - Automatic @reference insertion
   - Gap analysis between related documents

3. **Batch Creation:**
   - Create multiple related documents
   - Template-based document sets

4. **Interactive Templates:**
   - Dynamic section generation based on answers
   - Conditional template sections

## References

### Source Files

- **Main Implementation:** `/src/tools/implementations/create-document.ts`
- **Schemas:** `/src/tools/schemas/create-document-schemas.ts`
- **Pipeline:** `/src/tools/create/pipeline.ts`
- **Validation:** `/src/tools/create/validation-processor.ts`
- **Templates:** `/src/tools/create/template-processor.ts`
- **File Creation:** `/src/tools/create/file-creator.ts`
- **Session Types:** `/src/session/types.ts`
- **Session Store:** `/src/session/session-store.ts`

### Related Documentation

- **Progressive Discovery Pattern:** See CLAUDE.md "MCP Architecture & Tool Development"
- **Session Management:** See CLAUDE.md "MCP Architecture & Tool Development > Session State Management"
- **Addressing System:** See CLAUDE.md "Central Addressing System"
- **Unit Testing:** See `docs/UNIT-TEST-STRATEGY.md`
