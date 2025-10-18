---
title: "Coverage"
description: "🧪 TEST: Add comprehensive test coverage to existing code"
whenToUse: "Adding tests to legacy code or improving coverage for critical code paths"
---

# Coverage

## Process

### 1. Analyze Existing Code
- Understand functionality and critical paths
- Identify complex logic, edge cases, and error conditions
- Review existing test coverage (if any)
- Determine high-value areas for testing

### 2. Prioritize Test Cases
Focus on highest-value tests first:
- **Critical paths**: Core functionality users depend on
- **Complex logic**: Algorithms, business rules, calculations
- **Error handling**: Validation, exceptions, edge cases
- **Edge cases**: Boundary conditions, unusual inputs
- **Integration points**: External dependencies, APIs, data stores

### 3. Follow Project Test Patterns
- Review existing test structure and conventions
- Use same test framework and utilities
- Follow established naming conventions
- Match existing test organization (unit/integration/e2e)
- Maintain consistent assertion style

### 4. Write Clear, Maintainable Tests
Use Arrange-Act-Assert pattern:
- **Arrange**: Set up test data and preconditions
- **Act**: Execute the code under test
- **Assert**: Verify expected outcomes

Test characteristics:
- Focused: One concept per test
- Independent: Tests don't depend on each other
- Repeatable: Same results every run
- Fast: Quick feedback loop
- Self-documenting: Clear test names and structure

### 5. Cover All Scenarios
Ensure comprehensive coverage:
- **Happy paths**: Normal, expected behavior
- **Edge cases**: Boundaries, limits, unusual inputs
- **Error conditions**: Invalid input, failures, exceptions
- **State transitions**: Different system states
- **Integration**: Interaction with dependencies

### 6. Verify and Validate
- Run tests to ensure they pass
- Verify coverage metrics improved
- Check for test quality (not just quantity)
- Ensure tests are maintainable and readable

## Key Practices

**Test Quality Over Quantity:**
- Focus on meaningful assertions
- Avoid brittle tests tied to implementation details
- Test behavior, not implementation
- Keep tests simple and readable

**Coverage Gaps:**
- Use coverage tools to identify untested code
- Prioritize gaps in critical paths
- Don't chase 100% coverage blindly
- Focus on valuable tests

**Maintainability:**
- Clear test names describe what's being tested
- Minimal setup and teardown
- Avoid test interdependencies
- Use test helpers for common patterns

**Common Test Types:**
- Unit tests: Isolated component testing
- Integration tests: Component interaction testing
- Property-based tests: Generate test cases automatically
- Snapshot tests: UI/output verification
