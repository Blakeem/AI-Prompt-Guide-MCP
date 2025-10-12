---
description: Document internal feature specification
---

# Document Internal Feature Specification

## User Request

$ARGUMENTS

## Task Overview

Create comprehensive specification documentation for an internal feature, defining its design, API contracts, and behavior before implementation.

## Workflow

Use the **Spec-First Integration** workflow principles:
- Read: `.ai-prompt-guide/workflows/spec-first-integration.md`

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

Use MCP tools:
- `create_document` - Create feature spec (use `includeTasks: true` if planning implementation tasks)
- `section` - Add detailed sections for each aspect
- `view_document` - Review and refine

### 4. Define Acceptance Criteria
- Observable behaviors that prove correctness
- Test scenarios (happy path, edge cases, errors)
- Non-functional requirements (performance, security)

## Reference Guides

For specification best practices:
- `.ai-prompt-guide/guides/activate-specification-documentation.md`
- `.ai-prompt-guide/guides/documentation_standards.md`

## Deliverables

- Complete feature specification
- API contracts (inputs/outputs/errors)
- Acceptance criteria
- Design decisions documented
- Ready for implementation
