# Response Field Naming Conventions

**Version:** 1.0
**Last Updated:** 2025-09-30
**Status:** Active Standard

## Overview

This document establishes standardized response field naming conventions for all MCP tools in the AI-Prompt-Guide MCP Server. These conventions ensure consistency, predictability, and ease of use for LLM clients consuming tool responses.

## Core Principles

### 1. Snake Case for All Field Names
- **Rule:** Use `snake_case` for all response field names
- **Rationale:** Consistent with JSON API conventions and easier for LLMs to parse
- **Examples:**
  - ✅ `document_info`, `task_created`, `hierarchical_context`
  - ❌ `documentInfo`, `TaskCreated`, `hierarchical-context`

### 2. Descriptive and Unambiguous Names
- **Rule:** Field names should clearly indicate their content without requiring context
- **Examples:**
  - ✅ `removed_content` (clear what was removed)
  - ❌ `content` (ambiguous in removal context)
  - ✅ `new_section` (clear this is newly created)
  - ❌ `section` (ambiguous if new or existing)

### 3. Consistent Terminology Across Tools
- **Rule:** Use the same term for the same concept across all tools
- **Key Terms:**
  - `document_info` - Document metadata object (not `doc_info`, `document_data`)
  - `hierarchical_context` - Hierarchical address information (not `hierarchical_info`, `hierarchy`)
  - `referenced_documents` - Loaded @reference content (not `linked_documents`, `references`)
  - `section` - Section slug (not `section_slug`, `slug`)
  - `task` - Task slug (not `task_slug`, `slug`)

### 4. Status Indicators Use Past Tense Verbs
- **Rule:** Operation status fields use past tense for completed actions
- **Examples:**
  - ✅ `created`, `updated`, `removed`, `archived`
  - ❌ `create`, `update`, `remove`, `archive`

## Standard Field Patterns

### Document Information Object
```typescript
{
  document_info: {
    slug: string;        // Document slug (filename without extension)
    title: string;       // Document title from metadata
    namespace: string;   // Namespace (folder path or 'root')
  }
}
```
**Usage:** Include in all tool responses that operate on documents
**Helper:** `ToolIntegration.formatDocumentInfo()`

### Hierarchical Context Object
```typescript
{
  hierarchical_context: {
    full_path: string;      // Complete hierarchical path
    parent_path: string;    // Parent section path
    section_name: string;   // Leaf section name
    depth: number;          // Nesting depth
  } | null
}
```
**Usage:** Include when section addresses contain forward slashes
**Helper:** `ToolIntegration.formatHierarchicalContext()`

### Referenced Documents Array
```typescript
{
  referenced_documents: Array<{
    path: string;
    title: string;
    content: string;
    depth: number;
    namespace: string;
    children: Array<...>;  // Recursive structure
  }>
}
```
**Usage:** Include when @references are extracted and loaded
**Source:** `ReferenceLoader.loadReferences()`

### Operation Status Fields
```typescript
{
  // For creation operations
  created: boolean;
  new_section?: string;
  task_created?: {
    slug: string;
    title: string;
  };

  // For update operations
  updated: boolean;
  sections_modified?: number;

  // For deletion operations
  removed: boolean;
  removed_content?: string;

  // For archive operations
  archived: boolean;
  archived_to?: string;
}
```

### Timestamp Fields
```typescript
{
  timestamp: string;  // ISO 8601 format: new Date().toISOString()
}
```
**Usage:** Include in all tool responses for audit trail

## Tool-Specific Standards

### Section Tool Response Patterns

#### Creation Response
```typescript
{
  created: true,
  document: string,
  new_section: string,          // Snake case with 'new_' prefix
  depth?: number,
  operation: string,
  timestamp: string,
  hierarchical_info: {          // Backward compatibility (deprecated)
    slug_depth: number,
    parent_slug: string | null
  },
  hierarchical_context?: {      // Standardized format (preferred)
    full_path: string,
    parent_path: string,
    section_name: string,
    depth: number
  },
  link_assistance: {...},
  document_info?: {...}
}
```

#### Update Response
```typescript
{
  updated: true,
  document: string,
  section: string,              // No prefix for existing sections
  operation: string,
  timestamp: string,
  hierarchical_info: {...},
  hierarchical_context?: {...},
  link_assistance: {...},
  document_info?: {...}
}
```

#### Removal Response
```typescript
{
  removed: true,
  document: string,
  section: string,
  removed_content: string,      // Snake case, descriptive
  operation: string,
  timestamp: string,
  document_info?: {...}
}
```

#### Batch Response
```typescript
{
  batch_results: Array<{        // Snake case for array field
    success: boolean,
    section: string,
    action?: 'edited' | 'created' | 'removed',
    depth?: number,
    error?: string,
    removed_content?: string
  }>,
  document?: string,
  sections_modified: number,    // Snake case, descriptive count
  total_operations: number,
  timestamp: string,
  document_info?: {...}
}
```

### Task Tool Response Patterns

#### List Response
```typescript
{
  operation: 'list',
  document: string,
  tasks: Array<{
    slug: string,
    title: string,
    status: string,
    priority?: string,
    link?: string,
    referenced_documents?: [...],
    hierarchical_context?: {...}
  }>,
  hierarchical_summary?: {
    by_phase: {...},
    by_category: {...},
    critical_path: string[]
  },
  next_task?: {
    slug: string,
    title: string,
    link?: string
  },
  document_info?: {...},
  timestamp: string
}
```

#### Create Response
```typescript
{
  operation: 'create',
  document: string,
  task_created: {               // Snake case with action suffix
    slug: string,
    title: string,
    hierarchical_context?: {...}
  },
  document_info?: {...},
  timestamp: string
}
```

#### Edit Response
```typescript
{
  operation: 'edit',
  document: string,
  document_info?: {...},
  timestamp: string
}
```

### Complete Task Response Pattern
```typescript
{
  completed_task: {             // Snake case with status prefix
    slug: string,
    title: string,
    note: string,
    completed_date: string      // Snake case for compound field
  },
  next_task?: {
    slug: string,
    title: string,
    priority?: string,
    link?: string,
    referenced_documents?: [...]
  },
  document_info: {...},
  timestamp: string
}
```

### View Tools Response Patterns

#### View Document
```typescript
{
  documents: Array<{
    path: string,
    slug: string,
    title: string,
    namespace: string,
    sections: Array<{
      slug: string,
      title: string,
      depth: number,
      full_path: string,        // Snake case
      parent?: string,
      hasContent: boolean,       // camelCase for boolean (legacy)
      links: string[]
    }>,
    documentLinks: {             // camelCase for nested object (legacy)
      total: number,
      internal: number,
      external: number,
      broken: number,
      sectionsWithoutLinks: string[]  // camelCase (legacy)
    },
    tasks?: {...},
    lastModified: string,        // camelCase (legacy)
    wordCount: number,           // camelCase (legacy)
    headingCount: number         // camelCase (legacy)
  }>,
  summary: {
    total_documents: number,     // Snake case for new fields
    total_sections: number,
    total_words: number,
    total_tasks?: number,
    section_filter?: string
  },
  linked_context?: [...],
  section_context?: {...}
}
```

#### View Section
```typescript
{
  document: string,
  sections: Array<{
    slug: string,
    title: string,
    content: string,
    depth: number,
    full_path: string,          // Snake case
    parent?: string,
    word_count: number,         // Snake case
    links: string[],
    hierarchical_context: {...} | null
  }>,
  summary: {
    total_sections: number,     // Snake case
    total_words: number,
    has_content: boolean,
    hierarchical_stats?: {...}
  }
}
```

#### View Task
```typescript
{
  document: string,
  tasks: Array<{
    slug: string,
    title: string,
    status: string,
    priority?: string,
    link?: string,
    content: string,
    word_count: number,         // Snake case
    referenced_documents?: [...],
    hierarchical_context?: {...}
  }>,
  summary: {
    total_tasks: number,        // Snake case
    total_words: number,
    has_references: boolean
  },
  document_info: {...}
}
```

## Migration Path for Legacy Fields

### Deprecated Patterns (Maintain for Backward Compatibility)
The following patterns exist in the codebase but should not be used in new code:

1. **camelCase in view_document**: `hasContent`, `lastModified`, `wordCount`, `headingCount`
   - **Migration:** Add snake_case alternatives in future major version
   - **Timeline:** v2.0.0

2. **Inconsistent hierarchical fields**: `hierarchical_info` vs `hierarchical_context`
   - **Current:** Both included for transition period
   - **Future:** Remove `hierarchical_info` in v2.0.0

3. **Ambiguous field names**: `section` without context
   - **Guidance:** Use `new_section`, `removed_section`, or context-specific names

## Validation Checklist

When implementing or reviewing tool responses, verify:

- [ ] All field names use `snake_case`
- [ ] Status fields use past tense (`created`, not `create`)
- [ ] Consistent terminology matches this guide
- [ ] `document_info` format matches standard pattern
- [ ] `hierarchical_context` format matches standard pattern
- [ ] `referenced_documents` format matches standard pattern
- [ ] `timestamp` included in ISO 8601 format
- [ ] New/modified items use descriptive prefixes (`new_section`, `removed_content`)
- [ ] Count fields are descriptive (`sections_modified`, not `count`)
- [ ] Optional fields use TypeScript optional `?` operator

## ToolIntegration Helper Methods

The `ToolIntegration` class provides standardized formatting methods:

```typescript
import { ToolIntegration } from '../shared/addressing-system.js';

// Document info formatting
const documentInfo = ToolIntegration.formatDocumentInfo(addresses.document, {
  title: document.metadata.title
});

// Section path formatting
const sectionPath = ToolIntegration.formatSectionPath(addresses.section);

// Task path formatting
const taskPath = ToolIntegration.formatTaskPath(addresses.task);

// Hierarchical context formatting
const hierarchicalContext = ToolIntegration.formatHierarchicalContext(addresses.section);

// Error formatting
const errorResponse = ToolIntegration.formatErrorResponse(error, 'tool_name', 'suggestion');

// Success response wrapper
const response = ToolIntegration.formatSuccessResponse(data, 'tool_name', metadata);
```

## References

- **Source:** `src/shared/addressing-system.ts` - ToolIntegration class
- **Related:** `docs/UNIT-TEST-STRATEGY.md` - Testing response formats
- **Related:** `CLAUDE.md` - Project-wide conventions

## Version History

- **1.0.0** (2025-09-30): Initial standardized conventions document
- Consolidates existing patterns from production codebase
- Establishes migration path for legacy inconsistencies
