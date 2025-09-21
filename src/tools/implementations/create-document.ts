/**
 * Implementation for the create_document tool
 */

import type { SessionState } from '../../session/types.js';
import { getDocumentManager } from '../../shared/utilities.js';
import { determineCreateDocumentStage, getNextCreateDocumentStage } from '../schemas/create-document-schemas.js';
import { getGlobalSessionStore } from '../../session/session-store.js';

export async function createDocument(
  args: Record<string, unknown>,
  state: SessionState,
  onStageChange?: () => void
): Promise<unknown> {
  // Progressive Discovery Pattern - 3 Stages
  const documentType = args['type'] as string | undefined;
  const title = args['title'] as string | undefined;
  const overview = args['overview'] as string | undefined;

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

  // STAGE 0: Discovery - Return available document types
  if (documentType == null) {
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
      types: [
        {
          id: 'api_spec',
          name: 'API Specification',
          description: 'Document REST APIs with endpoints, schemas, and examples'
        },
        {
          id: 'implementation_guide',
          name: 'Implementation Guide',
          description: 'Step-by-step implementation instructions with code examples'
        },
        {
          id: 'architecture_doc',
          name: 'Architecture Document',
          description: 'System design, components, and architectural decisions'
        },
        {
          id: 'troubleshooting',
          name: 'Troubleshooting Guide',
          description: 'Problem diagnosis, solutions, and debugging workflows'
        }
      ],
      next_step: "Call again with 'type' parameter to get specific instructions",
      example: { type: "api_spec" }
    };
  }

  // STAGE 1: Instructions - Return type-specific guidance
  if (title == null || overview == null) {
    // Update to next stage for tool list
    const nextStage = getNextCreateDocumentStage(1);
    if (nextStage !== state.createDocumentStage) {
      sessionStore.updateSession(state.sessionId, { createDocumentStage: nextStage });

      if (onStageChange != null) {
        onStageChange();
      }
    }
    const typeInstructions: Record<string, {instructions: string[], starterStructure: string}> = {
      api_spec: {
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
      implementation_guide: {
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
      architecture_doc: {
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
      troubleshooting: {
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

    const typeInfo = typeInstructions[documentType];
    if (typeInfo == null) {
      // Instead of throwing error, provide helpful fallback with discovery info
      return {
        stage: 'error_fallback',
        error: 'Invalid document type',
        provided_type: documentType,
        valid_types: Object.keys(typeInstructions),
        help: 'Please choose from the available document types below',
        types: [
          {
            id: 'api_spec',
            name: 'API Specification',
            description: 'Document REST APIs with endpoints, schemas, and examples'
          },
          {
            id: 'implementation_guide',
            name: 'Implementation Guide',
            description: 'Step-by-step implementation instructions with code examples'
          },
          {
            id: 'architecture_doc',
            name: 'Architecture Document',
            description: 'System design, components, and architectural decisions'
          },
          {
            id: 'troubleshooting',
            name: 'Troubleshooting Guide',
            description: 'Problem diagnosis, solutions, and debugging workflows'
          }
        ],
        next_step: "Call again with a valid 'type' parameter",
        example: { type: "api_spec" }
      };
    }

    return {
      stage: 'instructions',
      type: documentType,
      instructions: typeInfo.instructions,
      starter_structure: typeInfo.starterStructure,
      next_step: "Call again with type, title, and overview to create the document",
      example: {
        type: documentType,
        title: documentType === 'api_spec' ? 'Search API' :
               documentType === 'implementation_guide' ? 'React Component Setup' :
               documentType === 'architecture_doc' ? 'Microservices Architecture' :
               'Common Deployment Issues',
        overview: documentType === 'api_spec' ? 'Full-text search with ranking capabilities' :
                  documentType === 'implementation_guide' ? 'Guide to setting up reusable React components' :
                  documentType === 'architecture_doc' ? 'Design for scalable microservices system' :
                  'Solutions for frequent deployment problems'
      }
    };
  }

  // STAGE 3: Creation - Create the actual document
  try {
    const manager = await getDocumentManager();

    // Import slug utilities
    const { titleToSlug } = await import('../../slug.js');

    // Generate path from title and type
    const slug = titleToSlug(title);
    const typeToDir: Record<string, string> = {
      api_spec: '/specs',
      implementation_guide: '/guides',
      architecture_doc: '/architecture',
      troubleshooting: '/troubleshooting'
    };

    const baseDir = typeToDir[documentType] ?? '/docs';
    const docPath = `${baseDir}/${slug}.md`;

    // Get the starter structure and replace title placeholder
    const typeInstructions: Record<string, {starterStructure: string}> = {
      api_spec: {
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
      implementation_guide: {
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
      architecture_doc: {
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
      troubleshooting: {
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

    const typeInfo = typeInstructions[documentType];
    if (typeInfo == null) {
      // Provide fallback response for unsupported type in creation stage
      return {
        stage: 'error_fallback',
        error: 'Unsupported document type in creation stage',
        provided_type: documentType,
        help: 'Please use a valid document type. Here are the available options:',
        types: [
          {
            id: 'api_spec',
            name: 'API Specification',
            description: 'Document REST APIs with endpoints, schemas, and examples'
          },
          {
            id: 'implementation_guide',
            name: 'Implementation Guide',
            description: 'Step-by-step implementation instructions with code examples'
          },
          {
            id: 'architecture_doc',
            name: 'Architecture Document',
            description: 'System design, components, and architectural decisions'
          },
          {
            id: 'troubleshooting',
            name: 'Troubleshooting Guide',
            description: 'Problem diagnosis, solutions, and debugging workflows'
          }
        ],
        next_step: "Call again with a valid 'type' parameter",
        example: { type: "api_spec", title: "Your Title", overview: "Your overview" }
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
    let content = typeInfo.starterStructure.replace(/\{\{title\}\}/g, title);

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
        title,
        type: documentType,
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
        type: documentType,
        title,
        overview
      },
      help: 'Document creation failed. Please check your parameters and try again.',
      suggestion: 'Start over with the discovery flow for guidance',
      recovery_steps: [
        'Call create_document with no parameters to see available types',
        'Call create_document with just { "type": "your_type" } for instructions',
        'Call create_document with all required parameters: type, title, and overview'
      ],
      example: { type: "api_spec", title: "Search API", overview: "Full-text search capabilities" }
    };
  }
}