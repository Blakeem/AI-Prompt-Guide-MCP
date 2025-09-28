# Documentation Standards

## Content Organization Standards

### Path Structure
- Use **lowercase** with **hyphens** for multi-word paths
- Keep paths **logical and hierarchical**
- Maximum **4 levels deep** for maintainability
- Examples: `/api/authentication`, `/guides/getting-started`

### Heading Hierarchy
- **H1**: Document title (one per document)
- **H2**: Main sections
- **H3**: Subsections
- **H4**: Sub-subsections (sparingly)
- **H5-H6**: Avoid except for special cases

### Content Structure Template
```markdown
# Document Title

Brief introduction explaining the purpose and scope.

## Prerequisites
- List any required knowledge
- Required tools or setup
- Version requirements

## Main Content Section

### Subsection
Detailed content with examples.

```code
// Code examples should be:
// - Syntactically correct
// - Runnable (when possible)
// - Well-commented
```

## Related Documents
- [Link to related doc](/path/to/related)
- [External resource](https://example.com)

## Troubleshooting
Common issues and solutions.
```

## Writing Style Guidelines

### Voice and Tone
- **Clear and direct** - Avoid unnecessary complexity
- **Active voice** - "Configure the server" vs "The server should be configured"
- **Present tense** - "The API returns..." vs "The API will return..."
- **Conversational but professional**

### Technical Writing Best Practices
- **Define acronyms** on first use: "Application Programming Interface (API)"
- **Use consistent terminology** throughout
- **Write scannable content** with bullets and short paragraphs
- **Include context** for code examples

### Code and Examples
- **Use syntax highlighting** with appropriate language tags
- **Include input and expected output** where relevant
- **Explain non-obvious code** with comments or prose
- **Test all examples** before publishing

## Formatting Standards

### Code Blocks
```language
// Always specify the language for syntax highlighting
// Include comments explaining non-obvious parts
function example() {
  return "formatted code";
}
```

### Lists and Bullets
- Use **parallel structure** in lists
- Start each item with the **same part of speech**
- Keep items **roughly equal in length**
- Use **numbered lists** for sequential steps

### Links and References
- Use **descriptive link text** instead of "click here"
- **Test all links** before publishing
- Use **relative paths** for internal documents
- Include **access dates** for time-sensitive external links

## Maintenance Standards

### Review Schedule
- **Monthly reviews** for rapidly changing topics
- **Quarterly reviews** for stable technical content  
- **Annual reviews** for foundational documentation
- **Immediate updates** for security-related changes

### Version Control
- **Document major changes** in commit messages
- **Use semantic versioning** for major doc overhauls
- **Tag releases** for coordinated documentation updates
- **Maintain changelog** for complex documents

### Quality Checklist
Before publishing any document:
- [ ] All code examples tested and working
- [ ] All links verified and functional
- [ ] Spelling and grammar checked
- [ ] Consistent with style guidelines
- [ ] Peer reviewed (when possible)
- [ ] Accurate and up-to-date information
- [ ] Clear purpose and target audience
- [ ] Logical flow and organization

Remember: **Consistency builds trust, accuracy builds reputation!** ✨