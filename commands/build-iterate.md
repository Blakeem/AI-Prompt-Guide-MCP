---
description: Build feature/component/app with manual verification for zero-shot/iterative tasks
---

# Iterate

## User Request

$ARGUMENTS

## Workflow

This workflow uses manual verification and iterative development, ideal for:
- Zero-shot greenfield projects
- Lightweight prototypes and exploratory work
- Static sites and landing pages
- Projects without test infrastructure
- When user wants to iterate with LLM feedback

## Core Flow

### 1. Plan & Decompose (Coordinator)
- Use TodoWrite for high-level milestones and coordinator tracking
- Create MCP task document for subagent work queue using `task` tool
- Break requirement into logical, independent work units
- Identify dependencies and sequence accordingly
- Define specific, verifiable acceptance criteria for each unit (what to manually check)

**Tool Selection:**
- **TodoWrite**: Coordinator planning (high-level milestones)
- **task**: Subagent work queue (implementation units with full context)

### 2. Assign to Agent (Silent Execution)

**Subagent Selection:**
Choose the most specialized subagent for the work type:
- Code implementation/debugging → code-focused subagents
- Frontend/UI work → frontend-focused subagents
- Backend/API work → API-focused subagents
- Infrastructure/environment → appropriate specialized subagents
- Refer to available subagent types in your context

**Assignment Pattern:**
Provide subagent with:
1. **Unified task path** - Full path to task in MCP system
2. **start_task() instruction** - Subagent retrieves full context
3. **Non-overlapping guidance** - Only verification requirements, response format (not task details)
4. **Completion requirements** - Must add detailed notes via complete_task()

**Agent Response Format:**
- "Done" or "Blocked: [reason]"
- No summaries or progress updates

**Context Conservation:**
- Task context lives in MCP system (retrieved via start_task)
- Coordinator provides only non-overlapping instructions
- Eliminates duplication, maximizes token efficiency

### 3. Manual Verification Checkpoint (Coordinator)

**Primary Verification - Direct Testing:**
- **Run the code/feature manually** using available tools:
  - Browser for frontend (inspect UI, interactions, responsiveness)
  - curl/API client for backend (test endpoints, data flow)
  - Command line execution for CLI tools
  - Direct file inspection for configuration/content
- **Verify acceptance criteria met** (defined in planning phase)
- **Check for obvious issues:**
  - Visual bugs, broken layouts
  - Runtime errors, console warnings
  - Missing functionality
  - Data correctness
- **[Git available]** Review diffs to understand changes
- **[Tests exist]** Run existing test suites if present
- **[Linters available]** Run linters if configured

**Secondary Review - Task Completion Notes:**
Check notes in MCP task system (added via complete_task):
- Verify what was implemented
- Check for warnings or issues flagged by subagent
- Review implementation decisions
- Note any technical debt or follow-up needed

**Decision Point:**
- ✅ **Approve** → Continue to staging
- ❌ **Issues Found** → Document problems, assign fix task, repeat from step 2

### 4. Stage Completed Work (Coordinator)

**If Git Available:**
- Stage changes using version control
- Verify staged files correct and complete
- Ensure no unintended files staged

**If No Git:**
- Mark completion in TodoWrite
- Document changes in task notes
- Continue to next unit

### 5. Repeat Until Complete (Coordinator)
- Mark TodoWrite item complete (coordinator milestone)
- Task already complete in MCP system (marked by subagent)
- Assign next task to new agent using unified path
- Update context based on observed changes and verification results
- Adjust plan if issues or blockers discovered

### 6. Final Verification & Report (Coordinator)

**Final Integration Checks:**
- **End-to-end manual testing** of complete feature
- **Cross-browser/environment testing** if applicable
- **Verify all acceptance criteria met** from original request
- **[Git available]** Review complete changeset
- **[Tests available]** Run full test suite
- **Check for integration issues** between components

**Report to User:**
- [Feature/Task] complete. Ready for review.
- Optional: Issues encountered (only if unexpected)
- Optional: Testing guidance (areas needing special attention)

**Exclude from Report:**
- Files changed (visible in version control if available)
- Implementation details (visible in code review)
- Subagent information (internal orchestration)

## Why This Works

**Context Conservation:**
- Task details stored once in MCP system
- Subagents retrieve via `start_task()` - no duplication
- Coordinator provides only non-overlapping guidance
- Massive token savings on complex features

**Silent Execution:**
- Eliminates bias in coordinator review
- Forces clear, self-documenting code
- Minimizes unnecessary communication

**Manual Verification Advantage:**
- No test infrastructure overhead
- Natural for exploratory development
- Catches visual and UX issues automated tests miss
- Flexible verification methods per task type

**Iterative Philosophy:**
- Build → Test → Fix → Repeat cycle
- User can guide and iterate based on results
- Adapts to available tools (git, tests, linters)
- Works in any environment

**Explicit Step Separation:**
- Verification → Stage split prevents skipping quality checks
- One action per step ensures attention
- Manual checkpoints catch issues early

**Tool Role Clarity:**
- **TodoWrite**: Coordinator's planning (high-level milestones)
- **task**: Subagent work queue (implementation units with full context)
- **start_task**: Subagent context loading (retrieves from MCP)
- **complete_task**: Subagent completion with detailed notes

## Key Considerations

**Manual Verification Strategy:**
- Define clear acceptance criteria upfront (what to check)
- Use appropriate tools for each task type:
  - Browser DevTools for frontend
  - curl/Postman for APIs
  - Terminal for CLI tools
  - Direct inspection for configs/content
- Document verification results in task notes
- Create follow-up tasks for discovered issues

**When to Use Automated Tests:**
- If test infrastructure exists, use it!
- Add tests for complex logic or business rules
- Consider tests for frequently-changed areas
- But don't block on test creation for simple tasks

**Sequencing:**
- Never parallelize dependent components
- Sequence strictly when dependencies exist
- Parallel only for truly independent work

**Git Usage:**
- Use git if available for safety and reviewability
- Track changes manually (in notes) if no git
- Commit after each verified unit for rollback safety

**Flexibility:**
- Adapt verification method to task complexity
- Simple tasks = quick manual check
- Complex features = thorough testing protocol
- Use available tools opportunistically
