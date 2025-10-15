---
title: "Review"
description: "🔍 REVIEW: Targeted review of specific changes, PRs, or components"
whenToUse:
  - "Reviewing pull requests before merge"
  - "Analyzing specific code changes or commits"
  - "Evaluating individual modules or components"
  - "Quick quality check of targeted code areas"
---

# Review

## Process

### 1. Define Review Scope
Identify what to review:
- Specific pull request or commit range
- Individual files or modules
- Particular components or features
- Recent changes in focused area

Use view_document, view_section, search_documents, and browse_documents for code examination.

### 2. Review Across Quality Dimensions

**Correctness:**
- Logic accuracy and algorithmic correctness
- Edge case handling
- Error handling and recovery
- Input validation and sanitization

**Code Quality:**
- Readability and clarity
- Maintainability and structure
- Naming conventions
- Documentation and comments (where needed)

**Testing:**
- Test coverage for changes
- Test quality and assertions
- Edge cases covered
- Integration test needs

**Security:**
- Authentication and authorization
- Input validation
- Sensitive data handling
- Vulnerability patterns

**Performance:**
- Algorithm efficiency
- Resource usage (memory, CPU)
- Database query optimization
- Caching opportunities

**Pattern Consistency:**
- Aligns with codebase conventions
- Follows established patterns
- Consistent with project style
- Appropriate abstraction level

### 3. Identify Issues by Severity

**Critical:**
- Security vulnerabilities
- Data loss or corruption risks
- Breaking changes
- Production-impacting bugs

**High:**
- Significant performance issues
- Major logic errors
- Missing critical tests
- Architectural concerns

**Medium:**
- Code smells and maintainability issues
- Moderate improvements possible
- Minor bugs or edge cases
- Documentation gaps

**Low:**
- Style inconsistencies
- Minor optimizations
- Naming suggestions
- Refactoring opportunities

### 4. Provide Actionable Feedback
For each finding:
- Specific location (file and line numbers)
- Clear description of the issue
- Explanation of impact and risk
- Concrete, actionable recommendation
- Code examples for suggested fixes (if applicable)

### 5. Summarize Findings
Create review summary:
- Overall assessment (approve/request changes/comment)
- Count of issues by severity
- Key strengths and positive aspects
- Priority recommendations
- Blocking vs non-blocking feedback

## Key Practices

**Focus on What Matters:**
- Prioritize correctness and security
- Don't nitpick minor style issues
- Consider maintainability impact
- Balance thoroughness with efficiency

**Constructive Feedback:**
- Be specific and actionable
- Explain the "why" behind suggestions
- Offer alternatives when criticizing
- Acknowledge good practices

**Context Awareness:**
- Consider project constraints
- Respect existing patterns
- Understand feature requirements
- Account for technical debt decisions

**Efficiency:**
- Focus on changed code primarily
- Don't re-review unchanged code
- Use automated tools where available
- Timely feedback enables progress
