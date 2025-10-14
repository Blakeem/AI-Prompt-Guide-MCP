---
description: Build feature/component/app with manual verification for zero-shot/iterative tasks
---

# Build (Iterate)

## User Request

$ARGUMENTS

## Workflow

Use **manual-verification-orchestration** via get_workflow:
```typescript
get_workflow({ workflow: "manual-verification-orchestration" })
```

Handles planning, manual verification checkpoints, iterative development, and silent execution. No test infrastructure required.
