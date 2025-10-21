---
description: Orchestrate multi-agent development with TDD and quality gates
---

# Develop (TDD)

⚠️ **REQUIRED WORKFLOW - You MUST follow these instructions:**

**Task Management:**
- ✅ **REQUIRED:** Use `coordinator_task` tool for your TODO list
- 🚫 **FORBIDDEN:** DO NOT use TodoWrite tool (this workflow replaces it)
- ❌ **FORBIDDEN:** DO NOT use Write/Edit to modify workflow files directly

**Delegation:**
- ✅ **REQUIRED:** Give subagents literal instructions to run start_subagent_task
- 🚫 **FORBIDDEN:** DO NOT run start_subagent_task yourself (coordinator only delegates)

**Load workflow via get_workflow:**
```typescript
get_workflow({ workflow: "develop-tdd" })
```

This workflow orchestrates multi-agent development with test-driven development and quality gates.
