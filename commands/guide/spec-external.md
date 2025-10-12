---
description: Document 3rd party APIs/components from official sources
---

# Research and Document External API/Component

## User Request

$ARGUMENTS

## Task Overview

Research and document a 3rd party API, library, or component by finding official documentation and creating comprehensive reference material.

## Workflow

Use the **Spec-First Integration** workflow:
- Read: `.ai-prompt-guide/workflows/spec-first-integration.md`

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

Use MCP tools to document:
- `create_document` - Create new spec document if needed
- `section` - Add comprehensive sections
- `view_document` - Review existing docs

### 4. Include Integration Guidance
- Authentication patterns
- Rate limiting strategies
- Error handling best practices
- Example usage patterns

## Reference Guides

For best practices on documentation:
- `.ai-prompt-guide/guides/activate-specification-documentation.md`
- `.ai-prompt-guide/guides/research_best_practices.md`
- `.ai-prompt-guide/guides/documentation_standards.md`

## Deliverables

- Comprehensive API/component documentation
- Request/response examples
- Error codes and handling strategies
- Integration patterns and best practices
- Version-specific notes
