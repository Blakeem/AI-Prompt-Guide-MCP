/**
 * Template processor for create-document pipeline
 * Handles template processing and content generation
 */

/**
 * Template processing result
 */
export interface TemplateProcessingResult {
  content: string;
  slug: string;
  docPath: string;
}

/**
 * Template processing error
 */
export interface TemplateProcessingError {
  error: string;
  details: string;
  provided_namespace: string;
}

/**
 * Namespace template definitions
 */
const NAMESPACE_TEMPLATES: Record<string, {starterStructure: string}> = {
  'api/specs': {
    starterStructure: `# {{title}}

## Overview
Brief description of the API's purpose and key capabilities.

## Authentication
Authentication method and requirements.

## Base URL
\`\`\`
https://api.example.com/v1
\`\`\`

## Endpoints

### GET /example
Description of the endpoint.

**Request:**
\`\`\`http
GET /example HTTP/1.1
Host: api.example.com
Authorization: Bearer {token}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {}
}
\`\`\`

## Error Handling
Standard error response format and common error codes.

## Rate Limits
Rate limiting policies and headers.

## Tasks
- [ ] Implement endpoint validation
- [ ] Add comprehensive error handling
- [ ] Set up rate limiting`
  },
  'api/guides': {
    starterStructure: `# {{title}}

## Overview
What this guide will help you implement and why.

## Prerequisites
- Required tools and versions
- Background knowledge needed
- Dependencies to install

## Setup
Initial setup and configuration steps.

## Step-by-Step Implementation

### Step 1: Foundation
Basic setup and core components.

### Step 2: Core Logic
Main implementation details.

### Step 3: Integration
Connecting components together.

## Testing
How to test and validate the implementation.

## Troubleshooting
Common issues and their solutions.

## Next Steps
What to implement next and additional resources.

## Tasks
- [ ] Complete basic setup
- [ ] Implement core functionality
- [ ] Add comprehensive tests`
  },
  'frontend/components': {
    starterStructure: `# {{title}}

## Overview
Component purpose and main functionality.

## Props Interface
\`\`\`typescript
interface ComponentProps {
  // Define prop types here
}
\`\`\`

## Usage Examples

### Basic Usage
\`\`\`jsx
<Component />
\`\`\`

### Advanced Usage
\`\`\`jsx
<Component prop="value" />
\`\`\`

## Styling
Styling approaches and theme integration.

## Accessibility
Accessibility features and ARIA patterns.

## Testing
Testing strategies and examples.

## Tasks
- [ ] Implement basic component structure
- [ ] Add comprehensive prop types
- [ ] Create usage examples`
  },
  'backend/services': {
    starterStructure: `# {{title}}

## Overview
High-level description of the system and its purpose.

## System Context
How this system fits into the broader ecosystem.

## Architecture Overview

\`\`\`mermaid
graph TB
    A[Component A] --> B[Component B]
    B --> C[Component C]
\`\`\`

## Components

### Core Components
Key system components and their responsibilities.

### Data Layer
Database design and data management approach.

### External Integrations
Third-party services and APIs.

## Design Decisions
Key architectural choices and their rationale.

## Deployment
Infrastructure and deployment considerations.

## Security
Security measures and considerations.

## Performance
Performance characteristics and optimization strategies.

## Tasks
- [ ] Finalize component interfaces
- [ ] Document data schemas
- [ ] Create deployment guide`
  },
  'docs/troubleshooting': {
    starterStructure: `# {{title}}

## Overview
Common issues and their solutions.

## Quick Diagnostics
Fast checks to identify the problem category.

## Common Issues

### Setup and Configuration
Problems that occur during initial setup.

#### Issue: Configuration Not Loading
**Symptoms:** Application fails to start with config errors.

**Diagnosis:**
1. Check configuration file exists
2. Validate configuration syntax
3. Verify file permissions

**Solutions:**
- Solution A: Fix configuration syntax
- Solution B: Reset to default configuration

### Runtime Errors
Issues that occur during normal operation.

### Performance Issues
Slow response times and resource problems.

## Advanced Diagnostics
Detailed debugging procedures for complex issues.

## Prevention
Best practices to avoid common problems.

## Escalation
When and how to escalate unresolved issues.

## Tasks
- [ ] Document all known error patterns
- [ ] Create diagnostic scripts
- [ ] Test solution procedures`
  }
};

/**
 * Process template content with variable substitution
 */
export async function processTemplate(
  namespace: string,
  title: string,
  overview: string
): Promise<TemplateProcessingResult | TemplateProcessingError> {
  try {
    // Import slug utilities
    const { titleToSlug } = await import('../../slug.js');
    const { getNamespaceConfig } = await import('../schemas/create-document-schemas.js');

    // Generate path from title and namespace
    const slug = titleToSlug(title);

    // Get template for namespace - check predefined first, then fallback to custom
    const templateInfo = NAMESPACE_TEMPLATES[namespace];
    let content: string;
    let docPath: string;

    if (templateInfo != null) {
      // Predefined namespace - use rich template and configured path
      const namespaceConfig = getNamespaceConfig(namespace);

      if (namespaceConfig == null) {
        return {
          error: 'Invalid predefined namespace configuration',
          details: 'Namespace configuration not found',
          provided_namespace: namespace
        };
      }

      docPath = `${namespaceConfig.folder}/${slug}.md`;

      // Process rich template with variable substitution
      content = templateInfo.starterStructure.replace(/\{\{title\}\}/g, title);

      // Replace overview section with provided content if available
      if (overview.trim() !== '') {
        content = content.replace(
          /## Overview\n[^\n#]*/,
          `## Overview\n${overview}`
        );
      }
    } else {
      // Custom namespace - use simple template and generate path
      docPath = `/${namespace}/${slug}.md`;

      // Simple template for custom namespaces
      content = `# ${title}

## Overview
${overview}

## Additional Content
Add sections relevant to your specific use case.

## Tasks
- [ ] Review and expand content
- [ ] Add specific examples
- [ ] Include relevant details`;
    }

    return {
      content,
      slug,
      docPath
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: 'Template processing failed',
      details: message,
      provided_namespace: namespace
    };
  }
}

