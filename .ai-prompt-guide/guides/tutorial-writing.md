---
title: "Tutorial & Guide Writing"
description: "Best practices for creating clear, actionable guides and tutorials"
---

# Tutorial & Guide Writing

**Purpose:** Create clear, actionable guides and tutorials for processes, workflows, and step-by-step instructions that users or LLMs can follow effectively.

## Audience & Purpose Analysis

**Define Your Guide:**

**Target Audience:**
- Technical level (beginner/intermediate/advanced)
- Background knowledge required
- Tools they have access to

**Guide Objectives:**
- What will users accomplish?
- What problems does this solve?
- What's the expected outcome?

**Prerequisites:**
- Required tools/software
- Necessary permissions
- Prior knowledge needed
- Time investment expected

## Research & Validation

**Gather Accurate Information:**
- Test the process: actually perform the steps yourself
- Check multiple sources: verify approaches with 2-3 sources
- Find common issues: search for FAQ/troubleshooting
- Identify variations: note platform/version differences

**Research Sources:**
- Official getting started guides
- Video tutorials (check comments for issues)
- Community forums and discussions
- Stack Overflow for common problems
- Blog posts from practitioners

**Validation priorities:**
- Tested the complete process end-to-end
- Identified potential failure points
- Found alternative approaches
- Collected troubleshooting tips
- Verified tool/version compatibility

## Structure & Organization

**Path Architecture:**
- `/guides/getting-started/` - Initial setup and basics
- `/tutorials/[topic]/` - Step-by-step tutorials
- `/how-to/[task]/` - Specific task instructions
- `/workflows/[process]/` - Multi-step processes
- `/troubleshooting/[issue]/` - Problem-solving guides

**Standard Template:**
- Title: action-oriented
- Overview: what this accomplishes (1-2 sentences)
- Prerequisites: required software, permissions, knowledge, time estimate
- Steps: clear actions with expected results
- Verification: how to confirm success
- Troubleshooting: common issues and solutions
- Next Steps: related guides and advanced topics
- Quick Reference: summary of key commands/actions

## Writing Effective Instructions

**Step-by-Step Clarity:**
- Start with a verb: "Click", "Run", "Configure"
- Be specific: "Click the blue 'Submit' button" not "Click submit"
- One action per step: break complex actions into substeps
- Include expected outcomes: "You should see a confirmation message"
- Add context when needed: explain why a step is important

**Visual Aids & Examples:**
- Include command examples with actual values
- Show expected output/results
- Use formatted code blocks
- Add screenshots for UI steps (when possible)
- Include decision trees for branching paths

**Progressive Disclosure:**
- Start with the happy path
- Add variations after basics
- Include advanced options separately
- Keep troubleshooting at the end

## User Experience Optimization

**Make Guides Scannable:**
- Use descriptive headings
- Include table of contents for long guides
- Highlight important warnings/notes
- Use consistent formatting
- Add summary/quick reference sections

**Accommodate Different Skill Levels:**
- Provide context for beginners
- Include shortcuts for experts
- Offer multiple approaches when applicable
- Link to background information

**Test Guide Usability:**
- Follow your own instructions exactly
- Note any ambiguous points
- Time the process
- Identify missing steps
- Add clarifications as needed

## Writing Style Priorities

**Voice and approach:**
- Action-oriented: focus on doing, not theory
- Conversational but clear: friendly yet precise
- Present tense: "Click" not "You will click"
- Active voice: direct and engaging
- Consistent terminology: same names throughout

## Common Guide Types

**Getting Started Guides:** Installation and setup, first-time configuration, hello world examples, basic feature tours

**How-To Guides:** Specific task completion, problem-solving approaches, feature implementation, integration procedures

**Tutorials:** Learning-focused walkthroughs, build something from scratch, progressive skill building, hands-on exercises

**Workflow Guides:** End-to-end processes, multi-tool procedures, team collaborations, deployment pipelines

## Quality Requirements

Before publishing:
- All steps tested and working
- Prerequisites clearly stated
- Time estimates accurate
- Troubleshooting section complete
- Examples use realistic data
- Links and references verified
- Version compatibility noted
- Next steps provided

## Audience-Specific Considerations

**For End Users:** Minimize technical jargon, provide GUI-based instructions, include plenty of examples, focus on outcomes over process, add glossary for technical terms

**For Developers/LLMs:** Include CLI commands, provide scriptable examples, document exit codes/returns, show API/programmatic approaches, include automation possibilities

**For System Administrators:** Document configuration files, include security considerations, provide backup/rollback steps, note performance impacts, include monitoring/logging

## Finding Information

**Search strategies:**
- "how to [task] [tool/platform]"
- "[tool] getting started guide"
- "[task] tutorial" site:youtube.com (check recent dates)
- "[error message]" + solution
- intitle:"tutorial" OR intitle:"guide" [topic]

**Quality indicators:**
- Recent publication date
- Positive community feedback
- Official or verified sources
- Step-by-step structure
- Includes troubleshooting

The best guides come from actually doing the task and documenting issues you encounter along the way.
