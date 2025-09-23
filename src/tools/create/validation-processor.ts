/**
 * Validation processor for create-document pipeline
 * Handles Stage 0 (Discovery) and Stage 1 (Instructions) validation
 */

import {
  getDocumentNamespaces
} from '../schemas/create-document-schemas.js';

/**
 * Stage 0: Discovery validation result
 */
export interface DiscoveryResult {
  stage: 'discovery';
  namespaces: ReturnType<typeof getDocumentNamespaces>;
  next_step: string;
  example: { namespace: string };
}

/**
 * Stage 1: Instructions validation result
 */
export interface InstructionsResult {
  stage: 'instructions';
  namespace: string;
  instructions: string[];
  starter_structure: string;
  next_step: string;
  example: {
    namespace: string;
    title: string;
    overview: string;
  };
  smart_suggestions_note: string;
}

/**
 * Error fallback result for validation issues
 */
export interface ValidationErrorResult {
  stage: 'error_fallback';
  error: string;
  provided_namespace?: string;
  valid_namespaces?: string[];
  help: string;
  namespaces?: ReturnType<typeof getDocumentNamespaces>;
  next_step: string;
  example: Record<string, unknown>;
}

export type ValidationResult = DiscoveryResult | InstructionsResult | ValidationErrorResult;

/**
 * Namespace instruction templates
 */
const NAMESPACE_INSTRUCTIONS: Record<string, {instructions: string[], starterStructure: string}> = {
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

/**
 * Process Stage 0: Discovery - Return available namespaces
 */
export function processDiscovery(): DiscoveryResult {
  return {
    stage: 'discovery',
    namespaces: getDocumentNamespaces(),
    next_step: "Call again with 'namespace' parameter to get specific instructions",
    example: { namespace: "api/specs" }
  };
}

/**
 * Process Stage 1: Instructions - Return namespace-specific guidance
 */
export function processInstructions(namespace: string): ValidationResult {
  // Validate namespace is safe for file system
  const pathValidation = validateCustomNamespacePath(namespace);
  if (pathValidation != null) {
    return pathValidation;
  }

  // Check if it's a predefined namespace
  const namespaceInfo = NAMESPACE_INSTRUCTIONS[namespace];
  if (namespaceInfo != null) {
    // Use rich template for predefined namespaces
    const exampleData = generateNamespaceExample(namespace);

    return {
      stage: 'instructions',
      namespace,
      instructions: namespaceInfo.instructions,
      starter_structure: namespaceInfo.starterStructure,
      next_step: "Call again with namespace, title, and overview to create the document",
      example: {
        namespace,
        title: exampleData.title,
        overview: exampleData.overview
      },
      smart_suggestions_note: "After providing title and overview, you'll receive intelligent suggestions about related documents, similar implementations, and logical next steps before creating the document."
    };
  }

  // Handle custom namespace with simple template
  const customExampleData = generateCustomNamespaceExample(namespace);

  return {
    stage: 'instructions',
    namespace,
    instructions: [
      'Create clear, concise documentation for your custom namespace',
      'Focus on the essential information needed by users',
      'Use simple, straightforward language and structure',
      'Add specific sections relevant to your use case',
      'Include practical examples and real-world scenarios',
      'Keep the content focused and avoid unnecessary complexity'
    ],
    starter_structure: `# {{title}}

## Overview
Brief description of the purpose and key points.

{{overview}}

## Additional Content
Add sections relevant to your specific use case.

## Tasks
- [ ] Review and expand content
- [ ] Add specific examples
- [ ] Include relevant details`,
    next_step: "Call again with namespace, title, and overview to create the document",
    example: {
      namespace,
      title: customExampleData.title,
      overview: customExampleData.overview
    },
    smart_suggestions_note: "After providing title and overview, you'll receive intelligent suggestions about related documents, similar implementations, and logical next steps before creating the document."
  };
}

/**
 * Validate namespace for creation stage
 */
export function validateNamespaceForCreation(namespace: string): ValidationErrorResult | null {
  // Use the same path validation as stage 1
  return validateCustomNamespacePath(namespace);
}


/**
 * Generate example data based on namespace
 */
function generateNamespaceExample(namespace: string): {title: string, overview: string} {
  switch (namespace) {
    case 'api/specs':
      return {
        title: 'Search API',
        overview: 'Full-text search with ranking capabilities'
      };
    case 'api/guides':
      return {
        title: 'React Component Setup',
        overview: 'Guide to setting up reusable React components'
      };
    case 'frontend/components':
      return {
        title: 'Button Component',
        overview: 'Reusable button component with multiple variants'
      };
    case 'backend/services':
      return {
        title: 'User Service Architecture',
        overview: 'Design for scalable user management service'
      };
    case 'docs/troubleshooting':
      return {
        title: 'Common Deployment Issues',
        overview: 'Solutions for frequent deployment problems'
      };
    default:
      return {
        title: 'Example Document',
        overview: 'Example overview for this document'
      };
  }
}

/**
 * Generate example data for custom namespaces
 */
function generateCustomNamespaceExample(namespace: string): {title: string, overview: string} {
  // Generate contextual examples based on namespace pattern
  const namespaceParts = namespace.split('/');
  const lastPart = namespaceParts[namespaceParts.length - 1] ?? 'document';

  // Create contextual examples
  if (namespace.includes('spec') || namespace.includes('api')) {
    return {
      title: `${lastPart.charAt(0).toUpperCase() + lastPart.slice(1)} Specification`,
      overview: `Specification document for ${lastPart} functionality and requirements`
    };
  }

  if (namespace.includes('guide') || namespace.includes('tutorial')) {
    return {
      title: `${lastPart.charAt(0).toUpperCase() + lastPart.slice(1)} Guide`,
      overview: `Step-by-step guide for implementing ${lastPart}`
    };
  }

  if (namespace.includes('design') || namespace.includes('architecture')) {
    return {
      title: `${lastPart.charAt(0).toUpperCase() + lastPart.slice(1)} Design`,
      overview: `Design document for ${lastPart} architecture and implementation`
    };
  }

  // Default example
  return {
    title: `${lastPart.charAt(0).toUpperCase() + lastPart.slice(1)} Documentation`,
    overview: `Documentation for ${lastPart} functionality and usage`
  };
}

/**
 * Validate custom namespace path for security and structure
 */
function validateCustomNamespacePath(namespace: string): ValidationErrorResult | null {
  // Check for empty namespace
  if (namespace.trim() === '') {
    return {
      stage: 'error_fallback',
      error: 'Empty namespace not allowed',
      help: 'Please provide a valid namespace. Use predefined namespaces or create custom ones like "myproject/docs"',
      namespaces: getDocumentNamespaces(),
      next_step: "Call again with a valid 'namespace' parameter",
      example: { namespace: "custom/my-namespace" }
    };
  }

  // Check for path traversal attempts
  if (namespace.includes('..') || namespace.includes('\\')) {
    return {
      stage: 'error_fallback',
      error: 'Invalid namespace path',
      provided_namespace: namespace,
      help: 'Namespace cannot contain ".." or "\\" characters for security reasons',
      namespaces: getDocumentNamespaces(),
      next_step: "Call again with a safe namespace path",
      example: { namespace: "custom/safe-namespace" }
    };
  }

  // Check for absolute paths
  if (namespace.startsWith('/') || namespace.includes(':')) {
    return {
      stage: 'error_fallback',
      error: 'Absolute paths not allowed in namespace',
      provided_namespace: namespace,
      help: 'Use relative namespace paths only, such as "custom/my-namespace"',
      namespaces: getDocumentNamespaces(),
      next_step: "Call again with a relative namespace path",
      example: { namespace: "custom/my-namespace" }
    };
  }

  // Check for invalid characters
  const invalidChars = /[<>"|*?:]/;
  if (invalidChars.test(namespace)) {
    return {
      stage: 'error_fallback',
      error: 'Invalid characters in namespace',
      provided_namespace: namespace,
      help: 'Namespace can only contain letters, numbers, hyphens, underscores, and forward slashes',
      namespaces: getDocumentNamespaces(),
      next_step: "Call again with a valid namespace using only allowed characters",
      example: { namespace: "custom/my-namespace" }
    };
  }

  // Validate length and structure
  if (namespace.length > 100) {
    return {
      stage: 'error_fallback',
      error: 'Namespace too long',
      provided_namespace: namespace,
      help: 'Namespace must be 100 characters or less',
      namespaces: getDocumentNamespaces(),
      next_step: "Call again with a shorter namespace",
      example: { namespace: "custom/shorter-name" }
    };
  }

  // No validation errors
  return null;
}