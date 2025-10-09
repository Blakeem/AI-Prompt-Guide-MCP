# File-System Based Workflow Prompts - Implementation Plan

## Overview

Replace hard-coded workflow prompts with file-system based prompts loaded from `.ai-prompt-guide/prompts/` directory. This enables users to edit existing prompts or create custom prompts without modifying code.

## Goals

1. **User Extensibility** - Users can add/edit/remove prompts by managing files
2. **Simplicity** - Minimal required schema, maximum flexibility
3. **Complete Replacement** - All hard-coded prompts replaced with filesystem loading
4. **Developer Experience** - Clear error messages, graceful degradation
5. **MCP Compliance** - Map to existing MCP prompt resource spec

## File Format Specification

### Extension & Naming
- **Extension**: `.wfp.md` (workflow prompt markdown)
- **Filename Pattern**: `^[a-z0-9]+(?:[._-][a-z0-9]+)*$` (kebab-case, snake_case, or dots)
- **Canonical Name**: Derived from filename (without extension)
  - Example: `multi-option-tradeoff.wfp.md` → name: `multi-option-tradeoff`

### Schema Design

#### Minimal Schema (Recommended)
```yaml
---
title: "Multi-Option Trade-off Protocol"
description: "Choose between multiple approaches with structured trade-offs."
whenToUse:
  - "Choosing between multiple refactoring approaches"
  - "Selecting performance optimizations"
---
# Actual prompt content

Your workflow instructions here...
```

#### Ultra-Minimal Support
Plain markdown with no frontmatter should also work:
```markdown
# Multi-Option Trade-off Protocol

Your workflow instructions here...
```

**Fallback behavior:**
- `title`: Use filename (without extension) as fallback
- `description`: Empty string if not provided
- `whenToUse`: Default to empty array

### Field Definitions

| Field | Required | Type | Purpose | MCP Mapping |
|-------|----------|------|---------|-------------|
| `title` | No | string | Display name | `prompt.name` |
| `description` | No | string | Brief description | `prompt.description` |
| `whenToUse` | No | string[] | Usage guidance | Custom metadata |
| `content` | Yes | markdown | Actual prompt body | `prompt.content` |

**Removed from original proposal:**
- ❌ `author` - Not used by MCP spec
- ❌ `version` - Not tracking versions for core prompts
- ❌ `deprecated` - Just delete the file instead
- ❌ `tags` - Not displayed anywhere in current implementation

## Technical Implementation

### 1. File Structure
```
.ai-prompt-guide/
└── prompts/
    ├── multi-option-tradeoff.wfp.md
    ├── spec-first-integration.wfp.md
    ├── causal-flow-mapping.wfp.md
    ├── failure-triage-repro.wfp.md
    ├── guardrailed-rollout.wfp.md
    ├── evidence-based-experiment.wfp.md
    ├── simplicity-gate.wfp.md
    └── interface-diff-adaptation.wfp.md
```

### 2. Core Components

#### Component: `PromptLoader`
**Location**: `src/prompts/prompt-loader.ts`

**Responsibilities:**
- Scan `.ai-prompt-guide/prompts/` directory
- Parse `.wfp.md` files (frontmatter + markdown body)
- Validate filename format
- Build `WorkflowPrompt` objects
- Handle errors gracefully

**Dependencies:**
- `gray-matter` - YAML frontmatter parsing
- `fs/promises` - File system operations
- Existing logger utilities

#### Component: `PromptValidator`
**Location**: `src/prompts/prompt-validator.ts`

**Responsibilities:**
- Validate filename format against regex
- Validate frontmatter schema
- Check for required fields
- Provide clear error messages

#### Updated Component: `workflow-prompts.ts`
**Current**: Hard-coded prompt exports
**New**: Export loader function instead

```typescript
// OLD:
export const WORKFLOW_PROMPTS: WorkflowPrompt[] = [
  MULTI_OPTION_TRADEOFF,
  SPEC_FIRST_INTEGRATION,
  // ...
];

// NEW:
export async function loadWorkflowPrompts(): Promise<WorkflowPrompt[]> {
  const loader = new PromptLoader();
  return await loader.loadAll();
}
```

### 3. Implementation Steps

#### Phase 1: Core Infrastructure
**Tasks:**
1. Create `src/prompts/prompt-loader.ts` with file scanning logic
2. Create `src/prompts/prompt-validator.ts` with validation rules
3. Add `gray-matter` dependency: `pnpm add gray-matter`
4. Create `src/prompts/types.ts` for shared interfaces
5. Write unit tests for loader and validator

**Acceptance Criteria:**
- ✅ Can load valid `.wfp.md` files
- ✅ Handles missing frontmatter gracefully
- ✅ Validates filename format
- ✅ Provides clear error messages for invalid files
- ✅ All unit tests pass

#### Phase 2: Migration
**Tasks:**
1. Create `.ai-prompt-guide/prompts/` directory
2. Migrate each hard-coded prompt to individual `.wfp.md` file
3. Update `workflow-prompts.ts` to use loader
4. Update server initialization to await prompt loading
5. Test MCP prompt resources still work correctly

**Acceptance Criteria:**
- ✅ All 8 existing prompts migrated
- ✅ MCP inspector shows identical prompt list
- ✅ Prompt content identical to original
- ✅ Server starts successfully

#### Phase 3: Error Handling & Polish
**Tasks:**
1. Add graceful degradation for missing prompts directory
2. Add warning logs for skipped invalid files
3. Add loader performance logging
4. Update documentation (README, CLAUDE.md)
5. Add example custom prompt template

**Acceptance Criteria:**
- ✅ Server starts even if prompts directory missing
- ✅ Clear warnings for invalid/skipped files
- ✅ Documentation updated
- ✅ Example template provided

### 4. Error Handling Strategy

**File Not Found:**
- Log warning
- Skip file
- Continue loading other prompts

**Invalid Frontmatter:**
- Log error with filename and line number
- Skip file
- Continue loading other prompts

**Invalid Filename:**
- Log error with filename and regex pattern
- Skip file
- Continue loading other prompts

**Directory Missing:**
- Log warning
- Return empty array
- Server continues with no workflow prompts

**Philosophy**: Never crash the server due to prompt loading failures. Always provide actionable error messages.

## Migration Strategy

### Step 1: Create Prompt Files
For each existing hard-coded prompt:
1. Extract title, description, whenToUse, content
2. Create `.wfp.md` file with appropriate frontmatter
3. Verify content is identical

### Step 2: Update Loader
1. Replace `WORKFLOW_PROMPTS` constant with loader function
2. Update server initialization to call loader
3. Update any direct prompt references

### Step 3: Validation
1. Run MCP inspector
2. Verify all prompts appear
3. Test prompt content rendering
4. Verify "when to use" metadata

### Step 4: Cleanup
1. Remove old hard-coded prompt files
2. Remove unused imports
3. Run dead code detection: `pnpm check:dead-code`
4. Update documentation

## Testing Strategy

### Unit Tests
**File**: `src/prompts/__tests__/prompt-loader.test.ts`
- ✅ Load valid prompt with full frontmatter
- ✅ Load minimal prompt (no frontmatter)
- ✅ Handle missing frontmatter fields
- ✅ Validate filename format
- ✅ Skip invalid files gracefully
- ✅ Handle empty directory
- ✅ Handle missing directory

**File**: `src/prompts/__tests__/prompt-validator.test.ts`
- ✅ Valid filename patterns
- ✅ Invalid filename patterns
- ✅ Valid frontmatter schemas
- ✅ Invalid frontmatter schemas

### Integration Tests
**MCP Inspector Testing:**
1. List prompts: Verify all 8 prompts appear
2. Get prompt: Verify content matches original
3. Create custom prompt: Add new file, restart, verify appears
4. Invalid prompt: Add malformed file, verify graceful skip

## Performance Considerations

**Caching Strategy:**
- Load prompts once at server startup
- Cache in memory for request duration
- No hot-reloading (restart server to pick up changes)

**Rationale:**
- Workflow prompts change infrequently
- Startup-time loading is acceptable
- Simplifies implementation
- No file watchers needed

**Future Enhancement (Optional):**
If needed, add file watcher for hot-reloading in development mode.

## User Documentation

### Creating Custom Prompts

**Example: `.ai-prompt-guide/prompts/my-custom-workflow.wfp.md`**
```yaml
---
title: "My Custom Workflow"
description: "A custom workflow for my specific use case"
whenToUse:
  - "When dealing with specific scenario A"
  - "When you need custom approach B"
---

# My Custom Workflow

## Step 1: Analysis
[Your instructions here...]

## Step 2: Implementation
[Your instructions here...]

## Step 3: Validation
[Your instructions here...]
```

**Usage:**
1. Create `.wfp.md` file in `.ai-prompt-guide/prompts/`
2. Add frontmatter (or just use plain markdown)
3. Restart MCP server
4. Prompt appears in MCP prompt list

### Editing Existing Prompts

**Workflow:**
1. Edit `.wfp.md` file directly
2. Save changes
3. Restart MCP server
4. Changes take effect

### Removing Prompts

**Workflow:**
1. Delete `.wfp.md` file
2. Restart MCP server
3. Prompt no longer appears

## Quality Gates

Before considering this feature complete:
- ✅ `pnpm test:run` - All tests pass
- ✅ `pnpm lint` - Zero errors/warnings
- ✅ `pnpm typecheck` - Zero type errors
- ✅ `pnpm check:dead-code` - Zero unused exports
- ✅ `pnpm build` - Successful build
- ✅ MCP Inspector - All prompts load correctly
- ✅ Documentation updated (README, CLAUDE.md)

## Open Questions & Decisions

### Q1: Should `description` be required?
**Recommendation**: Optional, default to empty string
**Rationale**: Maximum flexibility, some prompts may not need descriptions

### Q2: What if prompts directory doesn't exist?
**Recommendation**: Log warning, return empty array
**Rationale**: Development environments may not have prompts initially

### Q3: Should we validate markdown content structure?
**Recommendation**: No validation of content
**Rationale**: Users should have freedom to structure prompts as needed

### Q4: Should we support subdirectories?
**Recommendation**: Not in initial implementation
**Rationale**: Flat structure is simpler, categories can use filename prefixes

### Q5: Should we expose loader errors to MCP clients?
**Recommendation**: No, just log server-side
**Rationale**: Client shouldn't need to know about loading failures

## Success Metrics

**Feature is successful if:**
1. ✅ All existing prompts work identically
2. ✅ Users can add custom prompts without code changes
3. ✅ Invalid prompts don't crash server
4. ✅ Clear error messages for common mistakes
5. ✅ Zero regression in existing functionality
6. ✅ All quality gates pass

## Timeline Estimate

**Phase 1 (Core Infrastructure)**: 2-3 hours
- Loader implementation
- Validator implementation
- Unit tests

**Phase 2 (Migration)**: 1-2 hours
- Create prompt files
- Update loader integration
- Verification testing

**Phase 3 (Polish & Documentation)**: 1 hour
- Error handling refinement
- Documentation updates
- Final testing

**Total Estimate**: 4-6 hours

## Appendices

### Appendix A: Example Minimal Prompt
```markdown
# Quick Decision Framework

When you need to make a quick decision:
1. List options
2. Identify constraints
3. Choose simplest solution
4. Document decision
```

### Appendix B: Example Full-Featured Prompt
```yaml
---
title: "Comprehensive Analysis Protocol"
description: "Deep-dive analysis for complex technical decisions"
whenToUse:
  - "Making architectural decisions with long-term impact"
  - "Evaluating multiple competing approaches"
  - "Analyzing trade-offs between performance and maintainability"
---

# Comprehensive Analysis Protocol

## Phase 1: Problem Definition
[Detailed instructions...]

## Phase 2: Option Generation
[Detailed instructions...]

## Phase 3: Trade-off Analysis
[Detailed instructions...]

## Phase 4: Decision & Documentation
[Detailed instructions...]
```

### Appendix C: Filename Validation Regex
```typescript
const VALID_FILENAME_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

// Valid examples:
// ✅ multi-option-tradeoff
// ✅ spec_first_integration
// ✅ causal.flow.mapping
// ✅ failure-triage-repro

// Invalid examples:
// ❌ MultiOptionTradeoff (no uppercase)
// ❌ multi--option (no double separators)
// ❌ -multi-option (no leading separator)
// ❌ multi-option- (no trailing separator)
```
