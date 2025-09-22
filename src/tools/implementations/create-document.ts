/**
 * Implementation for the create_document tool
 */

import type { SessionState } from '../../session/types.js';
import { getDocumentManager, analyzeDocumentSuggestions, analyzeNamespacePatterns } from '../../shared/utilities.js';
import {
  determineCreateDocumentStage,
  getNextCreateDocumentStage,
  getDocumentNamespaces,
  getNamespaceConfig
} from '../schemas/create-document-schemas.js';
import { getGlobalSessionStore } from '../../session/session-store.js';

export async function createDocument(
  args: Record<string, unknown>,
  state: SessionState,
  onStageChange?: () => void
): Promise<unknown> {
  // Progressive Discovery Pattern - 4 Stages (0, 1, 2.5, 3)
  const namespace = args['namespace'] as string | undefined;
  const title = args['title'] as string | undefined;
  const overview = args['overview'] as string | undefined;
  const create = args['create'] as boolean | undefined;

  // Get the global session store singleton
  const sessionStore = getGlobalSessionStore();

  // Determine current stage and update session if needed
  const currentStage = determineCreateDocumentStage(args);
  if (currentStage !== state.createDocumentStage) {
    sessionStore.updateSession(state.sessionId, { createDocumentStage: currentStage });

    // Trigger tool list update notification
    if (onStageChange != null) {
      onStageChange();
    }
  }

  // STAGE 0: Discovery - Return available document namespaces
  if (namespace == null) {
    // Update to next stage for tool list
    const nextStage = getNextCreateDocumentStage(currentStage);
    if (nextStage !== currentStage) {
      sessionStore.updateSession(state.sessionId, { createDocumentStage: nextStage });

      if (onStageChange != null) {
        onStageChange();
      }
    }

    return {
      stage: 'discovery',
      namespaces: getDocumentNamespaces(),
      next_step: "Call again with 'namespace' parameter to get specific instructions",
      example: { namespace: "api/specs" }
    };
  }

  // STAGE 1: Instructions - Return namespace-specific guidance
  if (title == null || overview == null) {
    // Update to next stage for tool list
    const nextStage = getNextCreateDocumentStage(1);
    if (nextStage !== state.createDocumentStage) {
      sessionStore.updateSession(state.sessionId, { createDocumentStage: nextStage });

      if (onStageChange != null) {
        onStageChange();
      }
    }
    const namespaceInstructions: Record<string, {instructions: string[], starterStructure: string}> = {
      'api/specs': {
        instructions: [
          'Research current API patterns and industry standards for your domain',
          'Define clear request/response schemas using JSON Schema or OpenAPI',
          'Include realistic examples with actual data structures',
          'Document all error conditions with proper HTTP status codes',
          'Specify authentication and authorization requirements',
          'Add rate limiting and pagination details'
        ],
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
        instructions: [
          'Break down the implementation into clear, sequential steps',
          'Include all prerequisite setup and dependencies',
          'Provide complete, working code examples for each step',
          'Add troubleshooting sections for common issues',
          'Include testing and validation steps',
          'Reference related documentation and external resources'
        ],
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
        instructions: [
          'Define component purpose, props interface, and usage patterns',
          'Include interactive examples with different prop combinations',
          'Document accessibility features and ARIA patterns',
          'Provide styling guidelines and theme integration',
          'Add testing strategies for component behavior',
          'Include performance considerations and optimization tips'
        ],
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
        instructions: [
          'Start with a high-level system overview and context',
          'Define clear component boundaries and responsibilities',
          'Document data flows and integration patterns',
          'Include architectural decisions and trade-offs made',
          'Add deployment and infrastructure considerations',
          'Provide diagrams using Mermaid for visual clarity'
        ],
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
        instructions: [
          'Organize problems by categories (e.g., setup, runtime, performance)',
          'Provide step-by-step diagnostic procedures',
          'Include specific error messages and log examples',
          'Offer multiple solution approaches for complex issues',
          'Add preventive measures and best practices',
          'Include escalation paths for unresolved issues'
        ],
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

    const namespaceInfo = namespaceInstructions[namespace];
    if (namespaceInfo == null) {
      // Instead of throwing error, provide helpful fallback with discovery info
      return {
        stage: 'error_fallback',
        error: 'Invalid document namespace',
        provided_namespace: namespace,
        valid_namespaces: Object.keys(namespaceInstructions),
        help: 'Please choose from the available document namespaces below',
        namespaces: getDocumentNamespaces(),
        next_step: "Call again with a valid 'namespace' parameter",
        example: { namespace: "api/specs" }
      };
    }

    return {
      stage: 'instructions',
      namespace,
      instructions: namespaceInfo.instructions,
      starter_structure: namespaceInfo.starterStructure,
      next_step: "Call again with namespace, title, and overview to create the document",
      example: {
        namespace,
        title: namespace === 'api/specs' ? 'Search API' :
               namespace === 'api/guides' ? 'React Component Setup' :
               namespace === 'frontend/components' ? 'Button Component' :
               namespace === 'backend/services' ? 'User Service Architecture' :
               'Common Deployment Issues',
        overview: namespace === 'api/specs' ? 'Full-text search with ranking capabilities' :
                  namespace === 'api/guides' ? 'Guide to setting up reusable React components' :
                  namespace === 'frontend/components' ? 'Reusable button component with multiple variants' :
                  namespace === 'backend/services' ? 'Design for scalable user management service' :
                  'Solutions for frequent deployment problems'
      },
      smart_suggestions_note: "After providing title and overview, you'll receive intelligent suggestions about related documents, similar implementations, and logical next steps before creating the document."
    };
  }

  // STAGE 2.5: Smart Suggestions - Analyze and suggest related documents
  if (create !== true) {
    // We have namespace, title, and overview but no create flag - provide suggestions
    try {
      const manager = await getDocumentManager();

      // Analyze suggestions in parallel with namespace patterns
      const [suggestions, namespacePatterns] = await Promise.all([
        analyzeDocumentSuggestions(manager, namespace, title, overview),
        analyzeNamespacePatterns(manager, namespace)
      ]);

      // Update to next stage for tool list
      const nextStage = getNextCreateDocumentStage(2.5);
      if (nextStage !== state.createDocumentStage) {
        sessionStore.updateSession(state.sessionId, { createDocumentStage: nextStage });

        if (onStageChange != null) {
          onStageChange();
        }
      }

      return {
        stage: 'smart_suggestions',
        suggestions,
        namespace_patterns: namespacePatterns,
        next_step: "Review suggestions, then call again with 'create: true' to proceed with document creation",
        example: {
          namespace,
          title,
          overview,
          create: true
        }
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        stage: 'error_fallback',
        error: 'Failed to analyze suggestions',
        details: message,
        provided_parameters: {
          namespace,
          title,
          overview
        },
        help: 'Suggestion analysis failed. You can still proceed with document creation.',
        recovery_steps: [
          "Call again with 'create: true' to skip suggestions and create the document",
          'Check that the namespace, title, and overview are valid',
          'Try with a simpler title or overview if the analysis is having issues'
        ],
        example: { namespace, title, overview, create: true }
      };
    }
  }

  // STAGE 3: Creation - Create the actual document
  try {
    const manager = await getDocumentManager();

    // Import slug utilities
    const { titleToSlug } = await import('../../slug.js');

    // Generate path from title and namespace
    const slug = titleToSlug(title);
    const namespaceConfig = getNamespaceConfig(namespace);

    if (namespaceConfig == null) {
      return {
        stage: 'error_fallback',
        error: 'Invalid namespace configuration',
        provided_namespace: namespace,
        help: 'Please use a valid document namespace. Here are the available options:',
        namespaces: getDocumentNamespaces(),
        next_step: "Call again with a valid 'namespace' parameter",
        example: { namespace: "api/specs", title: "Your Title", overview: "Your overview" }
      };
    }

    const docPath = `${namespaceConfig.folder}/${slug}.md`;

    // Get the starter structure and replace title placeholder
    const namespaceTemplates: Record<string, {starterStructure: string}> = {
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

    const templateInfo = namespaceTemplates[namespace];
    if (templateInfo == null) {
      // Provide fallback response for unsupported namespace in creation stage
      return {
        stage: 'error_fallback',
        error: 'Unsupported document namespace in creation stage',
        provided_namespace: namespace,
        help: 'Please use a valid document namespace. Here are the available options:',
        namespaces: getDocumentNamespaces(),
        next_step: "Call again with a valid 'namespace' parameter",
        example: { namespace: "api/specs", title: "Your Title", overview: "Your overview" }
      };
    }

    // Create the document with the basic title first
    await manager.createDocument(docPath, {
      title,
      template: 'blank', // We're providing our own structure
      features: {
        toc: true,
        anchors: true,
        codeHighlight: true,
        mermaid: true,
        searchIndex: true
      }
    });

    // Now read the created document and replace its content with our structured template
    let content = templateInfo.starterStructure.replace(/\{\{title\}\}/g, title);

    // Replace overview section with provided content if available
    if (overview.trim() !== '') {
      content = content.replace(
        /## Overview\n[^\n#]*/,
        `## Overview\n${overview}`
      );
    }

    // Write the structured content to the file
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const config = await import('../../config.js');
    const loadedConfig = config.loadConfig();
    const fullPath = path.join(loadedConfig.docsBasePath, docPath);
    await fs.writeFile(fullPath, content, 'utf8');

    // Refresh the cache to get the updated document
    const cache = await import('../../document-cache.js');
    const globalCache = cache.getGlobalCache();
    globalCache.invalidateDocument(docPath);

    // Get created document info
    const document = await manager.getDocument(docPath);
    const headings = document?.headings ?? [];

    return {
      stage: 'creation',
      success: true,
      created: docPath,
      document: {
        path: docPath,
        slug,
        title,
        namespace,
        created: new Date().toISOString()
      },
      sections: headings.map(h => `#${h.slug}`),
      next_actions: [
        'Use edit_section to add detailed content to each section',
        'Use add_task to populate the tasks section with specific items',
        'Use insert_section to add additional sections as needed',
        'Use search_documents to research related content and add references'
      ]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Provide helpful fallback response instead of throwing error
    return {
      stage: 'error_fallback',
      error: 'Failed to create document',
      details: message,
      provided_parameters: {
        namespace,
        title,
        overview
      },
      help: 'Document creation failed. Please check your parameters and try again.',
      suggestion: 'Start over with the discovery flow for guidance',
      recovery_steps: [
        'Call create_document with no parameters to see available namespaces',
        'Call create_document with just { "namespace": "your_namespace" } for instructions',
        'Call create_document with all required parameters: namespace, title, and overview'
      ],
      example: { namespace: "api/specs", title: "Search API", overview: "Full-text search capabilities" }
    };
  }
}