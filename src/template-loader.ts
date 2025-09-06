/**
 * Template loader for onboarding and instructional messages
 * Safely loads markdown templates from the templates directory
 */

import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { ensureDirectoryExists, fileExists } from './fsio.js';
import { getGlobalLogger } from './utils/logger.js';

/**
 * Template types for different onboarding flows
 */
export type TemplateType = 
  | 'architect-specification-document'
  | 'construct-professional-guide'
  | 'investigate-and-validate'
  | 'standardize-content-format';

/**
 * Template metadata
 */
export interface Template {
  readonly type: TemplateType;
  readonly title: string;
  readonly description: string;
  readonly content: string;
  readonly lastModified: Date;
}

/**
 * Template loader with caching and error handling
 */
export class TemplateLoader {
  private readonly templatesDir: string;
  private readonly cache = new Map<TemplateType, Template>();

  constructor(baseDir: string = '.spec-docs-mcp') {
    this.templatesDir = resolve(baseDir, 'templates');
  }

  /**
   * Initialize the templates directory structure
   */
  async initialize(): Promise<void> {
    const logger = getGlobalLogger();
    
    try {
      await ensureDirectoryExists(this.templatesDir);
      logger.debug('Templates directory ready', { path: this.templatesDir });

      // Create default templates if they don't exist
      await this.ensureDefaultTemplates();
    } catch (error) {
      logger.error('Failed to initialize templates directory', { error });
      throw error;
    }
  }

  /**
   * Load a template by type
   */
  async loadTemplate(type: TemplateType): Promise<Template> {
    const logger = getGlobalLogger();

    try {
      // Check cache first
      if (this.cache.has(type)) {
        const cached = this.cache.get(type);
        if (cached != null) {
          return cached;
        }
      }

      const filePath = join(this.templatesDir, `${type}.md`);
      
      if (!(await fileExists(filePath))) {
        throw new Error(`Template not found: ${type}`);
      }

      const content = await fs.readFile(filePath, 'utf8');
      const stats = await fs.stat(filePath);

      const template: Template = {
        type,
        title: this.getTemplateTitle(type),
        description: this.getTemplateDescription(type),
        content: content.trim(),
        lastModified: stats.mtime,
      };

      // Cache the template
      this.cache.set(type, template);
      
      logger.debug('Template loaded', { type, size: content.length });
      return template;
    } catch (error) {
      logger.error('Failed to load template', { type, error });
      throw error;
    }
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get all available template types
   */
  getAvailableTemplates(): TemplateType[] {
    return [
      'architect-specification-document',
      'construct-professional-guide', 
      'investigate-and-validate',
      'standardize-content-format'
    ];
  }

  /**
   * Create default templates if they don't exist
   */
  private async ensureDefaultTemplates(): Promise<void> {
    const templates: Record<TemplateType, string> = {
      'architect-specification-document': this.getDefaultWorkflowIntro(),
      'construct-professional-guide': this.getDefaultCreateGuide(),
      'investigate-and-validate': this.getDefaultResearchGuide(),
      'standardize-content-format': this.getDefaultStandardsGuide(),
    };

    for (const [type, content] of Object.entries(templates)) {
      const filePath = join(this.templatesDir, `${type}.md`);
      
      if (!(await fileExists(filePath))) {
        await fs.writeFile(filePath, content, 'utf8');
      }
    }
  }

  private getTemplateTitle(type: TemplateType): string {
    const titles: Record<TemplateType, string> = {
      'architect-specification-document': 'Architect Specification Document',
      'construct-professional-guide': 'Construct Professional Guide',
      'investigate-and-validate': 'Investigate and Validate',
      'standardize-content-format': 'Standardize Content Format',
    };
    return titles[type];
  }

  private getTemplateDescription(type: TemplateType): string {
    const descriptions: Record<TemplateType, string> = {
      'architect-specification-document': 'Advanced technical documentation architecture for complex systems and APIs',
      'construct-professional-guide': 'Systematic professional document construction with enterprise-grade quality',
      'investigate-and-validate': 'Advanced intelligence gathering and source validation for technical accuracy',
      'standardize-content-format': 'Enterprise-grade content standardization and professional formatting engine',
    };
    return descriptions[type];
  }

  private getDefaultWorkflowIntro(): string {
    return `# Document Workflow Introduction

Welcome to the Spec-Docs document management system! This tool helps you create, maintain, and organize high-quality technical documentation.

## Overview

You're about to unlock powerful document management capabilities. This system enables you to:

- **Create structured documents** with hierarchical organization
- **Research and gather** the most current information
- **Maintain consistency** across your documentation
- **Organize content** using logical path-based structures

## Document Organization

This system uses **path-based organization** similar to file systems:

- \`/api/authentication/\` - API authentication docs
- \`/guides/getting-started/\` - User guides
- \`/architecture/database/\` - Technical architecture
- \`/policies/security/\` - Organizational policies

## Best Practices for Document Creation

### 1. Research First
Before creating any document:
- **Research current information** - Use web search to find the latest versions, APIs, and best practices
- **Verify accuracy** - Cross-reference multiple authoritative sources
- **Check dates** - Ensure you're working with current information, not outdated docs

### 2. Structure Content Logically
- Start with a clear **purpose statement**
- Use **hierarchical headings** (H1, H2, H3) appropriately
- Include **examples and code samples** where relevant
- Add **cross-references** to related documents

### 3. Keep Information Current
- **Include timestamps** when relevant (e.g., "As of 2025...")
- **Link to official sources** for latest updates
- **Note version dependencies** for technical content

### 4. Write for Your Audience
- **Define technical terms** on first use
- **Provide context** for decisions and recommendations
- **Include troubleshooting** for common issues

## Next Steps

Run the \`start_document_workflow\` tool to unlock the full document management suite and begin creating your first document.

Ready to get started? Let's build some great documentation! 🚀`;
  }

  private getDefaultCreateGuide(): string {
    return `# Document Creation Guide

## Step-by-Step Document Creation Process

### Phase 1: Planning and Research
1. **Define the document's purpose**
   - What problem does this solve?
   - Who is the target audience?
   - What actions should readers be able to take?

2. **Research thoroughly**
   - Search for official documentation and latest versions
   - Identify authoritative sources
   - Gather examples and real-world use cases
   - Note any breaking changes or deprecations

3. **Plan the structure**
   - Outline main sections and subsections
   - Determine the logical flow of information
   - Consider cross-references to other docs

### Phase 2: Content Creation
1. **Start with a strong introduction**
   - Clear purpose statement
   - Prerequisites or assumptions
   - What readers will learn

2. **Build content hierarchically**
   - Use consistent heading levels
   - Keep sections focused and scannable
   - Include practical examples

3. **Add supporting elements**
   - Code samples with explanations
   - Diagrams or flowcharts when helpful
   - Links to additional resources

### Phase 3: Review and Polish
1. **Technical accuracy**
   - Test all code examples
   - Verify links and references
   - Check version compatibility

2. **Content quality**
   - Clear, concise language
   - Logical flow between sections
   - Appropriate level of detail

3. **Consistency**
   - Follow established conventions
   - Use consistent terminology
   - Match the style of related docs

## Document Path Strategy

Choose paths that are:
- **Intuitive** - Easy to guess and remember
- **Hierarchical** - Reflect logical relationships
- **Consistent** - Follow established patterns
- **Scalable** - Allow for future expansion

Examples:
- \`/api/v2/endpoints/users\` - API reference
- \`/guides/deployment/docker\` - How-to guides  
- \`/architecture/data-flow\` - System design
- \`/troubleshooting/common-errors\` - Support docs`;
  }

  private getDefaultResearchGuide(): string {
    return `# Research Best Practices

## Finding Authoritative Sources

### Primary Sources (Most Reliable)
- **Official documentation** - Framework, library, or service docs
- **API specifications** - OpenAPI, GraphQL schemas
- **GitHub repositories** - Official project repos, README files
- **Official blogs/changelogs** - Product announcements, release notes

### Secondary Sources (Verify Carefully)
- **Stack Overflow** - For specific implementation questions
- **Developer blogs** - Individual experiences and tutorials
- **Community forums** - Discord, Reddit, specialized communities
- **Video tutorials** - Recent content from reputable creators

## Research Methodology

### 1. Start with Official Sources
Always begin with:
- Project homepage and documentation
- Official API references
- Release notes and changelogs
- Migration guides

### 2. Verify Information Currency
- Check publication/update dates
- Look for "last modified" timestamps
- Cross-reference version numbers
- Note any deprecation warnings

### 3. Cross-Reference Multiple Sources
- Compare information across 2-3 authoritative sources
- Look for consensus on best practices
- Note any conflicting information for further investigation

### 4. Test and Validate
- Run code examples yourself when possible
- Verify API endpoints and responses
- Test compatibility with current versions
- Document any discrepancies found

## Staying Current

### For Technical Documentation
- **Subscribe to official channels** (newsletters, RSS feeds)
- **Follow project maintainers** on social media
- **Monitor GitHub releases** for breaking changes
- **Join community discussions** for early insights

### For Best Practices
- **Industry reports and surveys** (State of JS, Stack Overflow Survey)
- **Conference talks and presentations**
- **Peer-reviewed articles** in technical publications
- **Expert practitioner blogs** with strong track records

## Red Flags to Avoid

### Outdated Information
- Old tutorial dates (2+ years for fast-moving tech)
- References to deprecated APIs or methods
- Screenshots of old UI versions
- Missing recent security considerations

### Unreliable Sources
- Anonymous or unverified authors
- Content farms optimized for SEO over accuracy
- Tutorials with many negative comments/feedback
- Information that contradicts official docs without explanation

## Documentation Research Checklist

Before writing:
- [ ] Found official documentation for all mentioned tools/APIs
- [ ] Verified current version numbers and compatibility
- [ ] Tested key code examples or procedures
- [ ] Identified any recent breaking changes or deprecations
- [ ] Located authoritative sources for best practices
- [ ] Noted any security or performance considerations
- [ ] Found examples of real-world implementations

Remember: **Great documentation starts with great research!** 📚`;
  }

  private getDefaultStandardsGuide(): string {
    return `# Documentation Standards

## Content Organization Standards

### Path Structure
- Use **lowercase** with **hyphens** for multi-word paths
- Keep paths **logical and hierarchical**
- Maximum **4 levels deep** for maintainability
- Examples: \`/api/authentication\`, \`/guides/getting-started\`

### Heading Hierarchy
- **H1**: Document title (one per document)
- **H2**: Main sections
- **H3**: Subsections
- **H4**: Sub-subsections (sparingly)
- **H5-H6**: Avoid except for special cases

### Content Structure Template
\`\`\`markdown
# Document Title

Brief introduction explaining the purpose and scope.

## Prerequisites
- List any required knowledge
- Required tools or setup
- Version requirements

## Main Content Section

### Subsection
Detailed content with examples.

\`\`\`code
// Code examples should be:
// - Syntactically correct
// - Runnable (when possible)
// - Well-commented
\`\`\`

## Related Documents
- [Link to related doc](/path/to/related)
- [External resource](https://example.com)

## Troubleshooting
Common issues and solutions.
\`\`\`

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
\`\`\`language
// Always specify the language for syntax highlighting
// Include comments explaining non-obvious parts
function example() {
  return "formatted code";
}
\`\`\`

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

Remember: **Consistency builds trust, accuracy builds reputation!** ✨`;
  }
}

/**
 * Global template loader instance
 */
let globalTemplateLoader: TemplateLoader | null = null;

/**
 * Get or create the global template loader
 */
export function getTemplateLoader(baseDir?: string): TemplateLoader {
  globalTemplateLoader ??= new TemplateLoader(baseDir);
  return globalTemplateLoader;
}