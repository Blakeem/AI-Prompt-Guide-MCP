# Workflow Prompts System

## Overview

The **Workflow Prompts System** provides a structured way to guide AI agents through complex problem-solving methodologies and decision-making frameworks. Workflow prompts are reusable, structured instructions that help agents approach tasks systematically using proven patterns like multi-option trade-off analysis, spec-first integration, failure triage, and more.

**Key Benefits:**
- **Reusable Methodologies**: Define problem-solving frameworks once, use them across many tasks
- **Automatic Context Loading**: Workflows are automatically injected into task data when referenced
- **Hierarchical Organization**: Support both project-level (Main-Workflow) and task-specific (Workflow) guidance
- **Progressive Discovery**: Workflows are revealed to agents as they process tasks, providing just-in-time guidance
- **Extensibility**: Easy to create custom workflows for your team's unique processes

## System Architecture

### File Format

Workflow prompts are stored as `.md` (Markdown) files with YAML frontmatter:

```markdown
---
title: "Workflow Name"
description: "Brief, attention-grabbing description"
whenToUse:
  - "Scenario 1"
  - "Scenario 2"
tags:
  - "tag1"
  - "tag2"
---

# Workflow Name

## Process

1. **Step 1**: Description
   - Detail A
   - Detail B

2. **Step 2**: Description
   - Detail A
   - Detail B

## Example

Concrete example showing the workflow in action...
```

### File Naming

Workflow files MUST follow these naming conventions:
- **Lowercase only**: Use lowercase letters and numbers
- **Separators allowed**: Hyphens (`-`), underscores (`_`), or dots (`.`)
- **No spaces**: Use separators instead of spaces
- **Valid patterns**: `kebab-case`, `snake_case`, `dotted.notation`

**Valid Examples:**
- `multi-option-tradeoff.md`
- `spec_first_integration.md`
- `causal.flow.mapping.md`

**Invalid Examples:**
- `Multi Option Tradeoff.md` (spaces and capitals)
- `123workflow.md` (missing descriptive name)
- `My-Workflow!.md` (special characters)

### Directory Structure

Workflow files are stored in the `workflows` directory relative to your docs base path:

```
your-project/
├── .ai-prompt-guide/
│   ├── docs/              # Your documentation
│   └── workflows/         # Workflow prompt files
│       ├── multi-option-tradeoff.md
│       ├── spec-first-integration.md
│       ├── failure-triage-repro.md
│       └── custom-workflow.md
```

**Note**: The system automatically looks for workflows in `<DOCS_BASE_PATH>/../workflows/`.

## Frontmatter Schema

### Required Fields

**None** - All frontmatter fields are optional. The system uses sensible defaults if fields are omitted.

### Optional Fields

#### `title` (string)
Display name for the workflow. If omitted, the filename (without extension) is used.

```yaml
title: "Multi-Option Trade-off Protocol"
```

#### `description` (string)
Brief, attention-grabbing description shown when listing workflows. Should quickly convey the workflow's purpose.

**Best Practices:**
- Use emoji to make it visually distinctive
- Start with context indicator (🐛 BUG, ⚖️ DECISION, 📋 INTEGRATION)
- Keep it under 80 characters
- Make it actionable ("Choose between...", "Convert symptoms to...", "Ensure correctness before...")

```yaml
description: "⚖️ DECISION NEEDED: Choose between multiple approaches with structured trade-off analysis"
```

#### `whenToUse` (array of strings)
Array of specific scenarios when this workflow should be applied. Used by agents to discover relevant workflows.

**Best Practices:**
- Be specific and concrete
- Include real-world examples
- Cover different variations of the same pattern
- 3-5 scenarios is ideal

```yaml
whenToUse:
  - "Choosing between multiple refactoring approaches (extract function vs Strategy pattern)"
  - "Selecting performance optimizations (caching strategies, algorithm selection)"
  - "Making architecture decisions (sync vs async, monolith vs service)"
```

#### `tags` (array of strings)
Keywords for categorization and discovery. Lowercase recommended.

```yaml
tags:
  - "decision-making"
  - "architecture"
  - "trade-offs"
```

### Complete Frontmatter Example

```yaml
---
title: "Spec-First Integration Protocol"
description: "📋 INTEGRATION TASK: Ensure correctness before implementing new features"
whenToUse:
  - "Integrating new SDKs, webhooks, or authentication flows"
  - "Implementing features that touch persistence or concurrency"
  - "Adopting new framework capabilities (router, streaming, workers)"
tags:
  - "integration"
  - "api"
  - "spec-driven"
---
```

## Workflow Loading

### Automatic Discovery

The system automatically loads workflow prompts at server startup:

1. **Initialization**: During server startup, the system scans the `workflows` directory
2. **File Discovery**: Finds all `.md` files
3. **Validation**: Validates filename format, frontmatter structure, and content
4. **Caching**: Loads workflows into memory for fast access
5. **Error Handling**: Logs warnings for invalid files but continues loading valid ones

**Validation Process:**
- Filename must match pattern: `/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/`
- Frontmatter must be valid YAML (if present)
- Content body must not be empty
- Field types must match schema (strings, arrays of strings)

### Loading Logs

Check server logs to verify workflows loaded correctly:

```
[INFO] Loading workflow prompts { directory: '/path/to/prompts', fileCount: 8 }
[DEBUG] Workflow prompts loaded { loaded: 8, failed: 0, total: 8 }
```

**Warning logs indicate issues:**

```
[WARN] Failed to load prompt file {
  filename: 'Bad-File.md',
  type: 'INVALID_FILENAME',
  message: 'Invalid filename "Bad-File". Filenames must be lowercase...'
}
```

## Workflow Injection

### Two Types of Workflows

The system supports two levels of workflow guidance:

#### 1. Main-Workflow (Project-Level)

**Purpose**: Provides overarching methodology for the entire task series.

**Location**: Specified in the **first task** of a document's Tasks section.

**Scope**: Applies to all tasks in the document unless overridden by task-specific workflows.

**Example Usage**:
```markdown
## Tasks

### Phase 1: Setup

- Status: pending
- Main-Workflow: multi-option-tradeoff
- Description: Initialize project structure...
```

#### 2. Workflow (Task-Specific)

**Purpose**: Provides specific guidance for completing an individual task.

**Location**: Specified in the metadata of any task.

**Scope**: Applies only to that specific task, takes precedence over Main-Workflow.

**Example Usage**:
```markdown
### Implement Authentication

- Status: in-progress
- Workflow: spec-first-integration
- Description: Add JWT authentication to API...
```

### How Injection Works

#### Task Creation/Viewing

When viewing or working with tasks, the system:

1. **Extracts Workflow References**: Parses task content for `Workflow:` and `Main-Workflow:` fields
2. **Resolves Names**: Looks up workflow prompts by name (filename without extension)
3. **Loads Full Content**: Retrieves complete workflow definition including all frontmatter
4. **Enriches Task Data**: Attaches workflow objects to task response

**Example Response**:
```json
{
  "task": {
    "slug": "implement-authentication",
    "title": "Implement Authentication",
    "status": "pending",
    "workflow": {
      "name": "spec-first-integration",
      "description": "📋 INTEGRATION TASK: Ensure correctness before implementing",
      "content": "# Spec-First Integration Protocol\n\n## Process\n...",
      "whenToUse": [
        "Integrating new SDKs, webhooks, or authentication flows",
        "..."
      ]
    }
  }
}
```

#### Task Completion

When completing a task with `complete_task`, the system:

1. **Marks current task complete**
2. **Finds next available task**
3. **Enriches next task with task-specific workflow** (not main workflow)
4. **Returns enriched task data** with workflow guidance

This provides just-in-time guidance as agents progress through tasks.

### Extraction Pattern

The system uses flexible regex patterns to extract workflow names from task metadata:

```typescript
// Matches these formats:
- Workflow: workflow-name
* Workflow: workflow-name
  - Workflow: workflow-name
- Workflow:                  // Empty value allowed
```

**Key Features:**
- Case-insensitive field name
- Flexible whitespace handling
- Optional bullet points or list markers
- Empty values allowed (field exists but no workflow specified)

## Creating Custom Workflows

### Step 1: Choose a Name

Pick a descriptive name that follows the naming conventions:

```bash
# Good names
my-team-process.md
code_review_checklist.md
performance.optimization.guide.md

# Bad names
My Team Process.md    # Spaces and capitals
workflow.md           # Not descriptive
123.md                # Not descriptive
```

### Step 2: Create the File

Create your `.md` file in the workflows directory:

```bash
# Assuming DOCS_BASE_PATH is /project/.ai-prompt-guide/docs
cd /project/.ai-prompt-guide/workflows
touch my-custom-workflow.md
```

### Step 3: Add Frontmatter

Start with YAML frontmatter defining metadata:

```markdown
---
title: "My Custom Workflow"
description: "🎯 CUSTOM: Brief description of what this workflow does"
whenToUse:
  - "When facing situation A"
  - "When needing to accomplish goal B"
  - "When dealing with constraint C"
tags:
  - "custom"
  - "your-domain"
---
```

### Step 4: Write the Workflow Content

Add structured markdown content describing your process:

```markdown
# My Custom Workflow

## Purpose

Explain why this workflow exists and what problem it solves.

## When to Use

Detailed scenarios where this workflow is applicable:
- Scenario 1: [description]
- Scenario 2: [description]

## Process

1. **Step 1: [Action]**
   - Detail A
   - Detail B
   - Consideration C

2. **Step 2: [Action]**
   - Detail A
   - Detail B

3. **Step 3: [Action]**
   - Detail A
   - Detail B

## Example

### Scenario
Describe a concrete scenario...

### Application
Show how the workflow applies step by step...

### Outcome
Describe the expected result...

## Common Pitfalls

- ❌ **Pitfall 1**: Why it's wrong
  - ✅ **Instead**: What to do

- ❌ **Pitfall 2**: Why it's wrong
  - ✅ **Instead**: What to do

## Checklist

Use this checklist to verify you've completed all steps:
- [ ] Step 1 complete
- [ ] Step 2 complete
- [ ] Step 3 complete
```

### Step 5: Restart the Server

Workflows are loaded at server startup, so restart to load your new workflow:

```bash
# Stop the server (if running)
# Restart with your MCP client or manually
pnpm build
npx @modelcontextprotocol/inspector node dist/index.js
```

### Step 6: Reference in Tasks

Add the workflow reference to your task metadata:

```markdown
### My Task

- Status: pending
- Workflow: my-custom-workflow
- Description: Task requiring my custom workflow...

Task content here...
```

## Example Workflows

### Example 1: Multi-Option Trade-off Protocol

**File**: `multi-option-tradeoff.md`

```markdown
---
title: "Multi-Option Trade-off Protocol"
description: "⚖️ DECISION NEEDED: Choose between multiple approaches with structured trade-off analysis"
whenToUse:
  - "Choosing between multiple refactoring approaches (extract function vs Strategy pattern vs module split)"
  - "Selecting performance optimizations (caching strategies, algorithm selection, data structures)"
  - "Making architecture decisions (sync vs async, monolith vs service, singleton vs DI)"
tags:
  - "decision-making"
  - "trade-offs"
  - "architecture"
---

# Multi-Option Trade-off Protocol

## Process

1. **Generate 2-4 viable options**
   - Be specific about what each approach entails
   - Include both obvious and creative alternatives

2. **For each option, document:**
   - **Description** (1-2 sentences)
   - **Assumptions/Preconditions** (what must be true)
   - **Pros** (benefits, advantages, strengths)
   - **Cons** (drawbacks, risks, limitations)
   - **Effort/Complexity** (Small/Medium/Large)
   - **Evidence/References** (docs, prior art, examples)

3. **Compare quantitatively:**
   - Choose 4-6 criteria: correctness, risk, cost/time, maintainability, performance
   - Score each option on each criterion (0-10 scale)
   - Apply weights based on context
   - Calculate: Score = Σ weight_i · criterion_i

4. **Decide and justify:**
   - Select highest-scoring option
   - **State why NOT the others** (key disqualifiers)
   - Document decision rationale

## Example Decision Matrix

| Option | Correctness | Risk | Time | Maintainability | Score |
|--------|------------|------|------|-----------------|-------|
| A      | 9          | 7    | 8    | 6               | 7.5   |
| B      | 8          | 9    | 6    | 9               | 8.0 ✓ |
| C      | 7          | 6    | 9    | 5               | 6.8   |

**Decision: Option B** - Higher maintainability and lower risk outweigh slightly slower implementation.
```

### Example 2: Spec-First Integration Protocol

**File**: `spec-first-integration.md`

```markdown
---
title: "Spec-First Integration Protocol"
description: "📋 INTEGRATION TASK: Ensure correctness before implementing new features"
whenToUse:
  - "Integrating new SDKs, webhooks, or authentication flows"
  - "Implementing features that touch persistence or concurrency"
  - "Adopting new framework capabilities (router, streaming, workers)"
tags:
  - "integration"
  - "api"
  - "spec-driven"
---

# Spec-First Integration Protocol (SFI)

## Process

1. **Identify authorities:**
   - Find canonical specs, API docs, RFCs
   - Note versions relevant to your runtime/environment
   - Verify documentation is current

2. **Extract constraints:**
   - Capability matrix (what's supported, what's not)
   - Invariants (must-hold conditions)
   - Limits (rate, size, timeout boundaries)
   - Error semantics (status codes, error formats)

3. **Define acceptance criteria:**
   - Observable behaviors proving conformance
   - Happy path tests
   - Edge case tests
   - Error handling tests

4. **Map entry points:**
   - Candidate integration surfaces
   - Choose sync vs async based on latency/throughput/ordering needs

5. **Propose 2-4 compliant designs:**
   - All must meet constraints
   - Prefer smallest solution satisfying ALL requirements
   - Apply Occam's Razor AFTER compliance/safety/compatibility

6. **Quick conformance checklist:**
   - ✓ Inputs validated per spec
   - ✓ Outputs match spec format
   - ✓ Errors handled per spec
   - ✓ Timeouts configured
   - ✓ Retries implemented if needed
   - ✓ Idempotency considered
```

### Example 3: Failure Triage & Minimal Repro

**File**: `failure-triage-repro.md`

```markdown
---
title: "Failure Triage & Minimal Repro Protocol"
description: "🐛 BUG REPORT: Convert symptoms into minimal reproduction and actionable fix"
whenToUse:
  - "Bug reports without clear reproduction steps"
  - "Flaky tests that fail inconsistently"
  - "Incidents requiring quick root cause identification"
tags:
  - "debugging"
  - "bug-fixing"
  - "triage"
---

# Failure Triage & Minimal Repro Protocol (FTR)

## Process

1. **Capture context:**
   - Inputs (data, parameters, state)
   - Environment (OS, runtime, versions)
   - Config (settings, feature flags)
   - Artifacts (logs, screenshots)

2. **Reproduce locally:**
   - Set up identical environment
   - Follow exact reproduction steps
   - Confirm failure occurs consistently

3. **Minimize iteratively:**
   - Remove one input/condition at a time
   - Keep removing until failure disappears
   - Add back last element
   - Result: minimal failing case

4. **Localize by bisection:**
   - Binary search through commits (git bisect)
   - Toggle feature flags
   - Halve input data
   - Isolate responsible component

5. **Classify the failure:**
   - Logic error (algorithm, off-by-one)
   - Data contract violation (type, null)
   - Concurrency issue (race, deadlock)
   - Resource exhaustion (memory, connections)
   - Environment difference (config, deps)

6. **Design discriminating test:**
   - Write test that fails on bad path
   - Passes on correct path
   - Unit/property/integration as appropriate

7. **Fix → Validate → Harden:**
   - Implement fix
   - Verify test passes
   - Add assertions to catch earlier
   - Add metrics/logging for detection
```

## Best Practices

### Writing Effective Workflows

1. **Be Specific and Actionable**
   - Use concrete steps, not vague guidance
   - Include examples showing application
   - Provide checklists where appropriate

2. **Structure for Scanning**
   - Use clear headings and subheadings
   - Bullet points for lists
   - Bold for key terms
   - Tables for comparisons

3. **Include Context**
   - Explain WHY, not just WHAT
   - Show when NOT to use this workflow
   - Highlight common pitfalls
   - Provide decision criteria

4. **Make It Visual**
   - Use emoji in descriptions (sparingly)
   - Include example tables/matrices
   - Show before/after comparisons
   - Use code blocks for examples

5. **Keep It Focused**
   - One workflow = one methodology
   - Break complex processes into multiple workflows
   - Reference other workflows when appropriate
   - Aim for 200-500 lines max

### Naming Conventions

1. **Descriptive Names**
   - Convey purpose clearly
   - Use domain terminology
   - Avoid abbreviations unless standard

2. **Consistent Patterns**
   - `[action]-[subject]`: `multi-option-tradeoff`
   - `[domain]-[process]`: `spec-first-integration`
   - `[problem]-[solution]`: `failure-triage-repro`

3. **Avoid Generic Names**
   - ❌ `workflow.md`
   - ❌ `process.md`
   - ✅ `code-review-checklist.md`
   - ✅ `incident-response-runbook.md`

### Frontmatter Guidelines

1. **Description Best Practices**
   - Start with emoji context indicator
   - Use active voice
   - 40-80 characters ideal
   - Make it "sticky" (memorable)

2. **whenToUse Best Practices**
   - 3-5 scenarios optimal
   - Be concrete and specific
   - Include real-world examples
   - Cover different variations

3. **Tags Best Practices**
   - 2-5 tags per workflow
   - Use lowercase
   - Prefer existing tags for consistency
   - Include domain and type tags

## Configuration

### Environment Variable

Control reference loading depth (affects workflows with @references):

```bash
# .env
REFERENCE_EXTRACTION_DEPTH=3  # Default: 3, Range: 1-5
```

**Impact on Workflows:**
- Workflows themselves are loaded at startup (not affected by this setting)
- This controls how deeply the system follows @references in workflow content
- Most workflows don't use @references, so this typically doesn't matter

### File Location

The system looks for workflows at:
```
<DOCS_BASE_PATH>/../workflows/*.md
```

**Example:**
- DOCS_BASE_PATH: `/project/.ai-prompt-guide/docs`
- Workflows directory: `/project/.ai-prompt-guide/workflows`

## Troubleshooting

### Workflow Not Loading

**Check filename:**
```bash
# Must be lowercase with valid separators
✓ my-workflow.md
✗ My-Workflow.md
✗ my workflow.md
```

**Check frontmatter:**
```yaml
# Valid types only
✓ title: "String"
✓ whenToUse: ["string1", "string2"]
✗ whenToUse: "not an array"
✗ tags: [1, 2, 3]  # Must be strings
```

**Check server logs:**
```bash
# Look for warnings
[WARN] Failed to load prompt file {
  filename: 'my-workflow.md',
  type: 'VALIDATION_ERROR',
  message: 'whenToUse must be an array of strings'
}
```

### Workflow Not Appearing in Tasks

**Check reference syntax:**
```markdown
# Correct
- Workflow: workflow-name

# Also correct
* Workflow: workflow-name
- Workflow:               # Empty but field exists

# Incorrect
- Workflow workflow-name  # Missing colon
Workflow: workflow-name   # Missing list marker
```

**Check workflow name matches filename:**
```bash
# File: spec-first-integration.md
# Reference: spec-first-integration (NO .md extension)
```

**Verify workflow loaded:**
```bash
# Check server startup logs
[DEBUG] Workflow prompts loaded { loaded: 8, failed: 0, total: 8 }
```

### Workflow Content Empty

**Check content body:**
```markdown
---
title: "Workflow"
---

# This content is required!

Workflows must have non-empty content after frontmatter.
```

**Validation error:**
```
[WARN] Failed to load prompt file {
  filename: 'empty.md',
  type: 'VALIDATION_ERROR',
  message: 'Prompt content cannot be empty'
}
```

## API Reference

### Core Functions

#### `loadWorkflowPrompts()`

Loads all workflow prompts from the filesystem at server startup.

**Returns**: `Promise<WorkflowPrompt[]>`

**Behavior:**
- Caches results (subsequent calls return cached data)
- Validates all files before loading
- Logs errors for invalid files but continues loading valid ones

#### `getWorkflowPrompt(name: string)`

Retrieves a single workflow prompt by name.

**Parameters:**
- `name`: Workflow name (filename without `.md` extension)

**Returns**: `WorkflowPrompt | undefined`

**Example:**
```typescript
const workflow = getWorkflowPrompt('multi-option-tradeoff');
if (workflow) {
  console.log(workflow.content);
}
```

#### `findPromptsByTag(tag: string)`

Finds all workflows with a specific tag.

**Parameters:**
- `tag`: Tag to search for (case-insensitive)

**Returns**: `WorkflowPrompt[]`

**Example:**
```typescript
const debugWorkflows = findPromptsByTag('debugging');
```

#### `findPromptsForSituation(situation: string)`

Searches workflows by situation description.

**Parameters:**
- `situation`: Search term (matches against `whenToUse`, `description`, `tags`)

**Returns**: `WorkflowPrompt[]`

**Example:**
```typescript
const workflows = findPromptsForSituation('API integration');
```

### Type Definitions

#### `WorkflowPrompt`

```typescript
interface WorkflowPrompt {
  name: string;           // Filename without extension
  description: string;    // From frontmatter or empty
  content: string;        // Full markdown content
  tags: string[];         // From frontmatter or empty array
  whenToUse: string[];    // From frontmatter or empty array
}
```

#### `PromptFrontmatter`

```typescript
interface PromptFrontmatter {
  title?: string;         // Display title
  description?: string;   // Brief description
  whenToUse?: string[];   // Usage scenarios
  tags?: string[];        // Categorization tags
}
```

## Advanced Usage

### Combining Workflows

You can reference multiple workflows in a single task by combining Main-Workflow and Workflow:

```markdown
## Tasks

### Phase 1: API Integration

- Status: pending
- Main-Workflow: spec-first-integration
- Description: Project-level methodology

Content...

### Implement Auth Endpoint

- Status: pending
- Workflow: multi-option-tradeoff
- Main-Workflow: spec-first-integration  # Can reference both
- Description: Task-specific + project-level guidance

Content...
```

**Behavior:**
- `Main-Workflow` provides overarching methodology
- `Workflow` provides task-specific guidance
- Task-specific workflow takes precedence for that task

### Workflow Chaining

Create workflows that reference other workflows:

```markdown
# My Workflow

## Process

1. **Evaluate options**
   - Use the Multi-Option Trade-off Protocol for this step
   - See @/workflows/multi-option-tradeoff.md

2. **Implement chosen option**
   - Use Spec-First Integration if working with APIs
   - See @/workflows/spec-first-integration.md
```

### Dynamic Workflow Selection

Tasks can update their workflow as they progress:

```markdown
### Research Task

- Status: in-progress
- Workflow: multi-option-tradeoff
- Description: Research options...

Content...

<!-- After research completes, update workflow -->

### Implementation Task

- Status: pending
- Workflow: spec-first-integration
- Description: Implement chosen option...

Content...
```

## Summary

The Workflow Prompts System provides a powerful, extensible framework for guiding AI agents through complex problem-solving processes:

- **Simple Format**: YAML frontmatter + Markdown content
- **Automatic Loading**: Discovered and loaded at startup
- **Progressive Disclosure**: Injected into tasks as needed
- **Easy Extension**: Create custom workflows for your team
- **Type-Safe**: Full TypeScript support with validation

Start by exploring the built-in workflows, then create your own custom workflows to codify your team's unique processes and methodologies.
