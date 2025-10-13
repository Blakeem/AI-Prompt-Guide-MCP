---
description: Document 3rd party APIs/components from official sources
---

# Research and Document External API/Component

## User Request

$ARGUMENTS

## Task Overview

Research and document a 3rd party API, library, or component by finding official documentation and creating comprehensive reference material.

## Workflow

Use the **spec-first-integration** workflow via the `get_workflow` tool:
```typescript
get_workflow({ workflow: "spec-first-integration" })
```

This workflow ensures you extract complete API contracts and integration requirements before implementation.

## Process

### 1. Identify Authorities
- Search for official documentation online
- Verify version matches your runtime/environment
- Find canonical source (not third-party tutorials)

### 2. Extract Complete API Contract
Document systematically:
- **Capabilities:** What's supported, what's not
- **Inputs:** All parameters, types, constraints
- **Outputs:** Return types, structures, edge cases
- **Error Handling:** Error codes, retry policies
- **Limits:** Rate limits, size limits, timeouts
- **Version Info:** Feature availability per version

### 3. Create Reference Documentation

Use these MCP tools:

**create_document** - Create new specification document:
```typescript
create_document({
  namespace: "api",  // or "specs", "integrations"
  title: "OAuth 2.0 Authentication",
  overview: "Complete reference for OAuth 2.0 integration...",
  includeTasks: false  // Set true if planning implementation tasks
})
```

**section** - Add detailed sections:
```typescript
section({
  document: "/api/oauth-spec.md",
  operations: [{
    section: "endpoints",
    operation: "append_child",
    title: "Authorization Endpoint",
    content: "## Authorization Endpoint\n\n**URL:** `/oauth/authorize`..."
  }]
})
```

**view_document** - Review structure:
```typescript
view_document({
  document: "/api/oauth-spec.md"
})
```

### 4. Include Integration Guidance
- Authentication patterns
- Rate limiting strategies
- Error handling best practices
- Example usage patterns

## Reference Guides

Use the `get_guide` tool for best practices:
```typescript
get_guide({ guide: "activate-specification-documentation" })
get_guide({ guide: "research_best_practices" })
get_guide({ guide: "documentation_standards" })
```

Available guides:
- **activate-specification-documentation** - How to write effective technical specs
- **research_best_practices** - Research methodology and validation
- **documentation_standards** - Writing style and formatting standards

## Deliverables

- Comprehensive API/component documentation
- Request/response examples
- Error codes and handling strategies
- Integration patterns and best practices
- Version-specific notes
