---
description: Document 3rd party APIs/components from official sources
---

# Research and Document External API

## User Request

$ARGUMENTS

## Workflow

Use **spec-first-integration** via get_workflow:
```typescript
get_workflow({ workflow: "spec-first-integration" })
```

## Guides

Access research and documentation best practices via get_guide:
```typescript
get_guide({ guide: "specification-writing" })
get_guide({ guide: "research-guide" })
get_guide({ guide: "writing-standards" })
```

Researches official documentation and extracts complete API contracts before integration.

Use create_document, section, and view_document tools for documentation creation.
