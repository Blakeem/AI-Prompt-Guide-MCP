---
description: Fix bug with systematic triage workflow
---

# Fix Bug

## User Request

$ARGUMENTS

## Workflow

Use **failure-triage-repro** via get_workflow:
```typescript
get_workflow({ workflow: "failure-triage-repro" })
```

Systematically isolates root cause through context capture, minimal reproduction, and bisection.
