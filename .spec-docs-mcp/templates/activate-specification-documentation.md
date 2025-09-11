# Activate Specification Documentation Protocol

**Purpose:** Create comprehensive technical specifications for tools, APIs, and systems with authoritative accuracy and structured organization.

## Specification Documentation Workflow

### Phase 1: Research & Intelligence Gathering

**Find Authoritative Sources:**
1. **Official Documentation** - Search for framework/library/API official docs
   - Use search queries like: `[tool name] official documentation site:docs.*`
   - Look for: API references, OpenAPI specs, SDK documentation
   - Check version numbers and last updated dates
   
2. **Source Code & Repositories** - Examine actual implementations
   - GitHub official repos (README, examples, API definitions)
   - Package registries (npm, PyPI, crates.io) for latest versions
   - Release notes and changelogs for recent changes
   
3. **Technical Specifications** - Gather formal specs
   - OpenAPI/Swagger definitions
   - GraphQL schemas
   - Protocol specifications (RFCs, standards docs)
   - Database schemas and ERDs

**Validation Checklist:**
- [ ] Verified current version numbers
- [ ] Checked deprecation warnings
- [ ] Found breaking changes in recent releases
- [ ] Located official API endpoints/methods
- [ ] Identified authentication requirements
- [ ] Noted rate limits and quotas

### Phase 2: Document Structure & Organization

**Path Architecture for Specifications:**
- `/api/[service]/[endpoint]` - API endpoint documentation
- `/tools/[tool-name]/[feature]` - Tool specifications
- `/systems/[component]/[aspect]` - System architecture
- `/protocols/[protocol-name]` - Communication protocols
- `/schemas/[data-type]` - Data structure definitions

**Required Sections for Technical Specs:**
```markdown
# [Tool/API/System Name]

## Overview
Brief description of what this is and its purpose

## Technical Requirements
- Version: [specific version]
- Dependencies: [list]
- Platform: [requirements]

## Configuration
[Setup and configuration details]

## API Reference / Interface
[Detailed technical interface documentation]

## Data Structures
[Schemas, types, models]

## Examples
[Working code examples with expected outputs]

## Error Handling
[Error codes, exceptions, troubleshooting]

## Performance Considerations
[Limits, optimization, best practices]

## Security
[Authentication, authorization, security considerations]

## References
- [Official Documentation](link)
- [API Reference](link)
- [Source Code](link)
```

### Phase 3: Technical Content Creation

**Code Examples Requirements:**
- Include language-specific examples where relevant
- Show both request and response formats
- Include error handling scenarios
- Test all examples before documenting
- Add inline comments for clarity

**API Documentation Standards:**
- List all endpoints with HTTP methods
- Document all parameters (required/optional)
- Include request/response schemas
- Show authentication headers
- Document rate limits and quotas
- Include pagination details

**Data Structure Documentation:**
- Use JSON Schema or similar formal notation
- Include field types and constraints
- Document enums and constants
- Show relationships between entities
- Include validation rules

### Phase 4: Accuracy Verification

**Technical Validation:**
1. Test all API endpoints with actual calls
2. Verify response formats match documentation
3. Confirm error codes and messages
4. Check compatibility with specified versions
5. Validate against official specs (OpenAPI, etc.)

**Cross-Reference Check:**
- Compare with official documentation
- Verify against source code
- Check community feedback for gotchas
- Review recent issues/discussions

## Best Practices for Specification Documents

### Writing Style
- **Precise and unambiguous** - No room for interpretation
- **Technical accuracy** over simplification
- **Complete information** - All parameters, options, edge cases
- **Version-specific** - Always indicate applicable versions

### Maintenance
- **Date stamp** technical information
- **Track API versions** and deprecations  
- **Update immediately** for breaking changes
- **Archive** old versions separately

### Quality Standards
- All code examples must be executable
- All endpoints must be tested
- All data structures must be validated
- All links must be verified
- All version numbers must be current

## Common Specification Types

### API Specifications
Focus on: Endpoints, methods, parameters, authentication, rate limits, response formats, error codes

### Tool Specifications  
Focus on: Installation, configuration, CLI commands, options/flags, input/output formats, integration points

### System Specifications
Focus on: Architecture, components, interfaces, data flow, protocols, performance specs, scaling limits

### Protocol Specifications
Focus on: Message formats, handshake procedures, state machines, error handling, security measures

## Research Tips for Finding API Documentation

**Search Strategies:**
```
"[API name] REST API documentation"
"[Tool name] OpenAPI specification"
"[Service] API reference" site:docs.*
"[Platform] developer documentation"
intitle:"API Reference" [tool name]
```

**Key Documentation Sites:**
- docs.[company].com
- developer.[company].com
- api.[company].com
- [company].readme.io
- [tool].readthedocs.io

**For Latest Information:**
- Check GitHub releases within last 3 months
- Look for "What's New" or "Changelog" sections
- Search for migration guides from previous versions
- Review deprecation notices and sunset dates

Remember: **Always verify with multiple authoritative sources** and **test actual behavior** when documenting technical specifications.