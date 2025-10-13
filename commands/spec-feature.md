---
description: Document internal feature specification
---

# Document Internal Feature Specification

## User Request

$ARGUMENTS

## Task Overview

Create comprehensive specification documentation for an internal feature, defining its design, API contracts, and behavior before implementation.

## Workflow

Use the **spec-first-integration** workflow via the `get_workflow` tool:
```typescript
get_workflow({ workflow: "spec-first-integration" })
```

Apply these principles to internal feature design, ensuring complete contracts before implementation.

## Process

### 1. Define Feature Scope
- Feature purpose and goals
- User-facing functionality
- Internal architecture requirements

### 2. Document API Contracts
Define all interfaces:
- **Inputs:** Parameters, types, validation rules
- **Outputs:** Return types, structures, formats
- **State Changes:** Side effects, persistence
- **Error Conditions:** Failure modes, error types
- **Performance:** Expected latency, throughput

### 3. Create Specification Document

Use these MCP tools:

**create_document** - Create feature specification:
```typescript
create_document({
  namespace: "specs",  // or "features", "api"
  title: "User Authentication System",
  overview: "Complete specification for authentication feature...",
  includeTasks: true  // Creates Tasks section for implementation tracking
})
```

**task** - Add implementation tasks with workflow references:
```typescript
task({
  document: "/specs/auth-system.md",
  operations: [{
    operation: "create",
    title: "Implement JWT Token Generation",
    content: "Implement JWT token generation.\n\nWorkflow: spec-first-integration\n\n@/specs/auth-system.md#jwt-requirements"
  }]
})
```

**section** - Add detailed specification sections:
```typescript
section({
  document: "/specs/auth-system.md",
  operations: [{
    section: "api-contracts",
    operation: "append_child",
    title: "Login Endpoint",
    content: "### POST /api/login\n\n**Inputs:**\n- email: string\n- password: string..."
  }]
})
```

**view_document** - Review structure:
```typescript
view_document({
  document: "/specs/auth-system.md"
})
```

### 4. Define Acceptance Criteria
- Observable behaviors that prove correctness
- Test scenarios (happy path, edge cases, errors)
- Non-functional requirements (performance, security)

## Reference Guides

Use the `get_guide` tool for specification best practices:
```typescript
get_guide({ guide: "activate-specification-documentation" })
get_guide({ guide: "documentation_standards" })
```

Available guides:
- **activate-specification-documentation** - How to write effective technical specifications
- **documentation_standards** - Writing style and formatting standards

## Deliverables

- Complete feature specification
- API contracts (inputs/outputs/errors)
- Acceptance criteria
- Design decisions documented
- Ready for implementation
