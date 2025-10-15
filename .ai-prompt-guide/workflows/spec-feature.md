---
title: "Spec Feature"
description: "📋 SPEC: Document internal feature specification"
whenToUse:
  - "Defining requirements for new features before implementation"
  - "Creating API contracts for internal services"
  - "Documenting feature behavior and acceptance criteria"
---

# Spec Feature

## Process

### 1. Gather Requirements
- Understand feature purpose and goals
- Identify stakeholders and use cases
- Collect functional and non-functional requirements
- Note constraints and dependencies

### 2. Define Feature Contract
Document complete specification:
- User-facing behavior and interactions
- API contracts (if applicable)
- Data models and schemas
- State transitions and workflows
- Error conditions and handling
- Performance requirements
- Security considerations

### 3. Create Specification Document
Build comprehensive spec using documentation tools:
- Feature overview and rationale
- Detailed functionality description
- API endpoints/methods with signatures
- Request/response formats with examples
- Error conditions and messages
- Edge cases and boundary conditions
- Non-functional requirements

Use create_document, section, and task tools for specification creation.

### 4. Define Acceptance Criteria
Create verifiable criteria for implementation:
- Happy path: normal, expected behavior
- Edge cases: boundaries, limits, unusual inputs
- Error handling: all error conditions specified
- Performance boundaries: latency/throughput requirements
- Security requirements: authentication, authorization, validation

### 5. Design Implementation Approach
**Map entry points:**
- Identify integration surfaces with existing system
- Consider data flow and state management
- Choose appropriate patterns and abstractions

**Propose 2-4 compliant designs:**
- All must satisfy requirements (correctness non-negotiable)
- Prefer smallest solution satisfying ALL requirements
- Add complexity only for measurable benefits
- Prefer reversible designs (easy to change later)
- Consider testability and maintainability

## Key Practices

**Documentation Guidelines:**
- Access documentation best practices via get_guide:
  ```typescript
  get_guide({ guide: "specification-writing" })
  get_guide({ guide: "writing-standards" })
  ```

**Specification Quality:**
- Clear, unambiguous requirements
- Complete coverage of functionality
- Specific, measurable acceptance criteria
- Consider security and error handling upfront
- Version and maintain specs alongside code

**Design Principles:**
- Requirements drive design, not assumptions
- Simplicity preferred after correctness
- Document design decisions and trade-offs
- Consider future extensibility without over-engineering
