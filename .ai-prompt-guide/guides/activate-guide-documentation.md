# Activate Guide Documentation Protocol

**Purpose:** Create clear, actionable guides and tutorials for processes, workflows, and step-by-step instructions that users or LLMs can follow effectively.

## Guide Documentation Workflow

### Phase 1: Audience & Purpose Analysis

**Define Your Guide:**
1. **Target Audience**
   - Technical level (beginner/intermediate/advanced)
   - Background knowledge required
   - Tools they have access to
   
2. **Guide Objectives**
   - What will users accomplish?
   - What problems does this solve?
   - What's the expected outcome?

3. **Prerequisites Check**
   - Required tools/software
   - Necessary permissions
   - Prior knowledge needed
   - Time investment expected

### Phase 2: Research & Validation

**Gather Accurate Information:**
1. **Test the Process** - Actually perform the steps yourself
2. **Check Multiple Sources** - Verify approaches with 2-3 sources
3. **Find Common Issues** - Search for FAQ/troubleshooting
4. **Identify Variations** - Note platform/version differences

**Research Sources for Guides:**
- Official getting started guides
- Video tutorials (check comments for issues)
- Community forums and discussions
- Stack Overflow for common problems
- Blog posts from practitioners

**Validation Before Writing:**
- [ ] Tested the complete process end-to-end
- [ ] Identified potential failure points
- [ ] Found alternative approaches
- [ ] Collected troubleshooting tips
- [ ] Verified tool/version compatibility

### Phase 3: Guide Structure & Organization

**Path Architecture for Guides:**
- `/guides/getting-started/` - Initial setup and basics
- `/tutorials/[topic]/` - Step-by-step tutorials  
- `/how-to/[task]/` - Specific task instructions
- `/workflows/[process]/` - Multi-step processes
- `/troubleshooting/[issue]/` - Problem-solving guides

**Standard Guide Template:**
```markdown
# [Guide Title - Action-Oriented]

## Overview
What this guide helps you accomplish (1-2 sentences)

## Prerequisites
- [ ] Required software/tools
- [ ] Access/permissions needed  
- [ ] Prior knowledge assumed
- [ ] Estimated time: X minutes

## Steps

### Step 1: [Clear Action]
Brief explanation of what this step does

1. Specific instruction
2. Another specific instruction
3. Expected result

**Note:** Any warnings or important information

### Step 2: [Next Action]
[Continue pattern...]

## Verification
How to confirm successful completion:
- [ ] Check this condition
- [ ] Verify this output
- [ ] Test this functionality

## Troubleshooting

### Common Issue 1
**Problem:** Description
**Solution:** How to fix

### Common Issue 2
[Continue pattern...]

## Next Steps
- Related guides to continue learning
- Advanced topics to explore
- Additional resources

## Quick Reference
Summary of key commands/actions for easy reference
```

### Phase 4: Writing Effective Instructions

**Step-by-Step Clarity:**
1. **Start with a verb** - "Click", "Run", "Configure"
2. **Be specific** - "Click the blue 'Submit' button" not "Click submit"
3. **One action per step** - Break complex actions into substeps
4. **Include expected outcomes** - "You should see a confirmation message"
5. **Add context when needed** - Explain why a step is important

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

### Phase 5: User Experience Optimization

**Make Guides Scannable:**
- Use descriptive headings
- Include a table of contents for long guides
- Highlight important warnings/notes
- Use consistent formatting
- Add summary/quick reference sections

**Accommodate Different Skill Levels:**
- Provide context for beginners
- Include shortcuts for experts
- Offer multiple approaches when applicable
- Link to background information

**Test Guide Usability:**
1. Follow your own instructions exactly
2. Note any ambiguous points
3. Time the process
4. Identify missing steps
5. Add clarifications as needed

## Best Practices for Guide Documents

### Writing Style
- **Action-oriented** - Focus on doing, not theory
- **Conversational but clear** - Friendly yet precise
- **Present tense** - "Click" not "You will click"
- **Active voice** - Direct and engaging
- **Consistent terminology** - Same names throughout

### Common Guide Types

**Getting Started Guides**
- Installation and setup
- First-time configuration
- Hello world examples
- Basic feature tours

**How-To Guides**
- Specific task completion
- Problem-solving approaches
- Feature implementation
- Integration procedures

**Tutorials**
- Learning-focused walkthroughs
- Build something from scratch
- Progressive skill building
- Hands-on exercises

**Workflow Guides**
- End-to-end processes
- Multi-tool procedures
- Team collaborations
- Deployment pipelines

### Quality Checklist

Before publishing a guide:
- [ ] All steps tested and working
- [ ] Prerequisites clearly stated
- [ ] Time estimates accurate
- [ ] Troubleshooting section complete
- [ ] Examples use realistic data
- [ ] Links and references verified
- [ ] Version compatibility noted
- [ ] Next steps provided

## Tips for Different Audiences

### For End Users
- Minimize technical jargon
- Provide GUI-based instructions
- Include plenty of examples
- Focus on outcomes over process
- Add glossary for technical terms

### For Developers/LLMs
- Include CLI commands
- Provide scriptable examples  
- Document exit codes/returns
- Show API/programmatic approaches
- Include automation possibilities

### For System Administrators
- Document configuration files
- Include security considerations
- Provide backup/rollback steps
- Note performance impacts
- Include monitoring/logging

## Finding Information for Guides

**Search Strategies:**
```
"how to [task] [tool/platform]"
"[tool] getting started guide"
"[task] tutorial" site:youtube.com (check recent dates)
"[error message]" + solution
intitle:"tutorial" OR intitle:"guide" [topic]
```

**Quality Indicators:**
- Recent publication date
- Positive community feedback
- Official or verified sources
- Step-by-step structure
- Includes troubleshooting

Remember: **The best guides come from actually doing the task** and **documenting issues you encounter** along the way.