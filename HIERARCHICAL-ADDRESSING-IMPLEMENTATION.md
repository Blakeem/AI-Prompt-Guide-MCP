# Hierarchical Slug Addressing Implementation Guide

## Overview

This document provides the complete implementation specification for adding hierarchical slug addressing support to the Spec-Docs MCP server. This enhancement will enable folder-like navigation patterns (e.g., `api/authentication/jwt-tokens`) while maintaining the existing flat addressing system.

## Current System Analysis

### **Existing Infrastructure (Ready to Use)**
The system already contains hierarchical slug utilities that aren't being leveraged:

**File:** `src/shared/slug-utils.ts`
- `generateHierarchicalSlug(parentSlug, childTitle)` - Creates hierarchical paths
- `splitSlugPath(slugPath)` - Splits "parent/child" into components
- `normalizeSlugPath(path)` - Normalizes paths with proper formatting

### **Core Issue Location**
**File:** `src/sections.ts:408-412`
```typescript
function matchHeadingBySlug(slug: string) {
  return (value: string): boolean => {
    return titleToSlug(value.trim()) === slug;  // ← Exact match only
  };
}
```

### **Addressing System Flow**
1. `parseSectionAddress()` in `addressing-system.ts` normalizes input
2. `getSectionContent()` in `document-cache.ts` calls `readSection()`
3. `readSection()` in `sections.ts` uses `matchHeadingBySlug()` for lookup
4. All 8 MCP tools use `ToolIntegration.validateAndParse()` for consistency

## Technical Implementation Strategy

### **Phase 1: Core Section Lookup Enhancement**

#### **1.1 Enhanced Section Matching**
**File:** `src/sections.ts`

**Current Implementation:**
```typescript
function matchHeadingBySlug(slug: string) {
  return (value: string): boolean => {
    return titleToSlug(value.trim()) === slug;
  };
}
```

**New Implementation:**
```typescript
function matchHeadingBySlug(slug: string, headings?: HeadingInfo[]) {
  return (value: string): boolean => {
    const basicSlug = titleToSlug(value.trim());

    // Direct flat match (current behavior)
    if (basicSlug === slug) return true;

    // Hierarchical match for paths containing "/"
    if (slug.includes('/') && headings) {
      return matchHierarchicalSlug(slug, basicSlug, headings);
    }

    return false;
  };
}

function matchHierarchicalSlug(targetPath: string, currentSlug: string, headings: HeadingInfo[]): boolean {
  const pathParts = targetPath.split('/');
  const finalSlug = pathParts[pathParts.length - 1];

  // Must match the final slug component
  if (currentSlug !== finalSlug) return false;

  // Verify hierarchical context if more than one component
  if (pathParts.length > 1) {
    return verifyHierarchicalContext(currentSlug, pathParts, headings);
  }

  return true;
}

function verifyHierarchicalContext(targetSlug: string, pathParts: string[], headings: HeadingInfo[]): boolean {
  // Find the target section in headings
  const targetSection = headings.find(h => h.slug === targetSlug);
  if (!targetSection) return false;

  // Build path from root to this section based on heading hierarchy
  const actualPath: string[] = [];
  let currentDepth = targetSection.depth;
  let currentIndex = targetSection.index;

  // Walk backwards through headings to build path
  for (let i = currentIndex - 1; i >= 0; i--) {
    const heading = headings[i];
    if (heading.depth < currentDepth) {
      actualPath.unshift(heading.slug);
      currentDepth = heading.depth;
    }
  }
  actualPath.push(targetSlug);

  // Compare expected path with actual path
  return actualPath.join('/') === pathParts.join('/');
}
```

#### **1.2 Section Function Updates**
**File:** `src/sections.ts`

Update all functions that use `matchHeadingBySlug`:

```typescript
// readSection() - Pass headings for context
export function readSection(markdown: string, slug: string): string | null {
  const tree = parseMarkdown(markdown);
  const headings = listHeadings(markdown); // Get heading context

  let captured: string | null = null;
  headingRange(tree, matchHeadingBySlug(slug, headings), (start, nodes, end) => {
    // ... existing logic
  });
  return captured;
}

// Similar updates needed for:
// - replaceSectionBody()
// - insertRelative()
// - getSectionContentForRemoval()
// - deleteSection()
```

### **Phase 2: Document Cache Integration**

#### **2.1 Enhanced getSectionContent**
**File:** `src/document-cache.ts:255-287`

```typescript
async getSectionContent(docPath: string, slug: string): Promise<string | null> {
  const document = await this.getDocument(docPath);
  if (!document) return null;

  document.sections ??= new Map();

  // Check cache for both flat and hierarchical keys
  const cacheKeys = [slug];
  if (slug.includes('/')) {
    // Also try the final component as a fallback
    cacheKeys.push(slug.split('/').pop()!);
  }

  for (const key of cacheKeys) {
    if (document.sections.has(key)) {
      return document.sections.get(key) ?? null;
    }
  }

  // Load section from file with hierarchical support
  try {
    const absolutePath = this.getAbsolutePath(docPath);
    const content = await fs.readFile(absolutePath, 'utf8');

    const { readSection } = await import('./sections.js');
    const sectionContent = readSection(content, slug);

    if (sectionContent != null) {
      // Cache under both hierarchical and flat keys for efficiency
      document.sections.set(slug, sectionContent);
      if (slug.includes('/')) {
        const flatKey = slug.split('/').pop()!;
        document.sections.set(flatKey, sectionContent);
      }
    }

    return sectionContent;
  } catch (error) {
    logger.error('Failed to load section content', { path: docPath, slug, error });
    return null;
  }
}
```

### **Phase 3: Addressing System Updates**

#### **3.1 Enhanced Section Address Parsing**
**File:** `src/shared/addressing-system.ts:185-245`

```typescript
export async function parseSectionAddress(sectionRef: string, contextDoc?: string): Promise<SectionAddress> {
  // ... existing validation logic ...

  let documentPath: string;
  let sectionSlug: string;

  if (sectionRef.includes('#')) {
    const [docPart, ...slugParts] = sectionRef.split('#');
    sectionSlug = slugParts.join('#');

    if (docPart === '' || docPart == null) {
      if (contextDoc == null || contextDoc === '') {
        throw new InvalidAddressError(sectionRef, 'Section reference "#section" requires context document');
      }
      documentPath = contextDoc;
    } else {
      documentPath = docPart;
    }
  } else {
    if (contextDoc == null || contextDoc === '') {
      throw new InvalidAddressError(sectionRef, 'Section reference requires context document or full path');
    }
    documentPath = contextDoc;
    sectionSlug = sectionRef;
  }

  // Enhanced slug normalization for hierarchical paths
  const normalizedSlug = await normalizeHierarchicalSlug(sectionSlug);

  if (normalizedSlug === '') {
    throw new InvalidAddressError(sectionRef, 'Section slug cannot be empty');
  }

  const document = parseDocumentAddress(documentPath);
  const address: SectionAddress = {
    document,
    slug: normalizedSlug,
    fullPath: `${document.path}#${normalizedSlug}`,
    cacheKey: `${sectionRef}|${contextDoc ?? ''}`
  };

  cache.setSection(address.cacheKey, address);
  return address;
}

async function normalizeHierarchicalSlug(slug: string): Promise<string> {
  // Remove # prefix if present
  let normalized = slug.startsWith('#') ? slug.substring(1) : slug;

  // Normalize hierarchical path components
  if (normalized.includes('/')) {
    const { normalizeSlugPath } = await import('./slug-utils.js');
    normalized = normalizeSlugPath(normalized);
  }

  return normalized;
}
```

### **Phase 4: MCP Tool Updates**

All 8 MCP tools need updates to handle hierarchical addressing. The addressing system changes above handle most complexity, but tools need validation updates:

#### **4.1 Standard Tool Pattern**
**Files:** All tools in `src/tools/implementations/`

```typescript
// Enhanced validation pattern for all tools
export async function myTool(params: Record<string, unknown>) {
  const { addresses } = ToolIntegration.validateAndParse({
    document: params.document as string,
    ...(params.section && { section: params.section as string })
  });

  // Hierarchical addressing now works transparently through addressing system
  const document = await manager.getDocument(addresses.document.path);
  const content = addresses.section
    ? await manager.getSectionContent(addresses.document.path, addresses.section.slug)
    : document.sections?.get('') ?? '';

  return {
    document_info: ToolIntegration.formatDocumentInfo(addresses.document, {
      title: document.metadata.title
    }),
    content,
    // Include hierarchical context in responses
    hierarchical_path: addresses.section?.slug.includes('/')
      ? addresses.section.slug
      : null
  };
}
```

#### **4.2 Specific Tool Updates**

**File:** `src/tools/implementations/section.ts`
- Update section operations to support hierarchical paths
- Enhance batch operations for hierarchical addressing
- Add hierarchical context to response objects

**File:** `src/tools/implementations/view-section.ts`
- Support hierarchical section viewing
- Display hierarchical context in responses
- Handle hierarchical path validation

**File:** `src/tools/implementations/task.ts`
- Support hierarchical task addressing
- Update task identification for hierarchical context
- Handle hierarchical task listing

**File:** `src/tools/implementations/complete-task.ts`
- Support hierarchical task completion
- Update next task suggestions with hierarchical paths

**Files:** All other MCP tools
- Update to use enhanced addressing system
- Add hierarchical path support to responses
- Validate hierarchical inputs properly

### **Phase 5: Enhanced Response Formatting**

#### **5.1 ToolIntegration Updates**
**File:** `src/shared/addressing-system.ts`

```typescript
export class ToolIntegration {
  static formatSectionPath(section: SectionAddress): string {
    // Include hierarchical indicator for clarity
    const path = `${section.document.path}#${section.slug}`;
    return section.slug.includes('/') ? `${path} (hierarchical)` : path;
  }

  static formatHierarchicalContext(section: SectionAddress): HierarchicalContext | null {
    if (!section.slug.includes('/')) return null;

    const parts = section.slug.split('/');
    return {
      full_path: section.slug,
      parent_path: parts.slice(0, -1).join('/'),
      section_name: parts[parts.length - 1],
      depth: parts.length
    };
  }
}

interface HierarchicalContext {
  full_path: string;
  parent_path: string;
  section_name: string;
  depth: number;
}
```

## Testing Strategy

### **Unit Tests**
**File:** `src/sections.test.ts` (new comprehensive test suite)

```typescript
describe('Hierarchical Section Addressing', () => {
  describe('matchHeadingBySlug with hierarchical support', () => {
    test('should match flat slugs (backward compatibility)', () => {
      // Test current behavior still works
    });

    test('should match hierarchical paths', () => {
      // Test api/auth/tokens matches "Tokens" under "Auth" under "API"
    });

    test('should verify hierarchical context correctly', () => {
      // Test that api/auth/tokens doesn't match "Tokens" under "Frontend"
    });
  });

  describe('readSection with hierarchical addressing', () => {
    test('should read sections by hierarchical path', () => {
      // Test full hierarchical section reading
    });

    test('should handle ambiguous section names', () => {
      // Test disambiguation through hierarchical context
    });
  });
});
```

### **Integration Tests**
**File:** `src/hierarchical-addressing.integration.test.ts` (new)

```typescript
describe('Hierarchical Addressing Integration', () => {
  test('full workflow: create → access → modify hierarchical sections', () => {
    // Test complete hierarchical workflow
  });

  test('MCP inspector compatibility', () => {
    // Test that MCP inspector can use hierarchical paths
  });

  test('addressing system caching with hierarchical keys', () => {
    // Test caching works correctly for hierarchical addresses
  });
});
```

### **MCP Inspector Testing**
1. **Create test document** with hierarchical structure:
   ```markdown
   # API Documentation
   ## Authentication
   ### JWT Tokens
   #### Validation Process
   ## Endpoints
   ### User Management
   #### Create User
   ```

2. **Test addressing patterns:**
   - `authentication/jwt-tokens` → should find "JWT Tokens" section
   - `endpoints/user-management/create-user` → should find "Create User" section
   - `jwt-tokens` → should still work (flat addressing)

3. **Verify error handling:**
   - `authentication/nonexistent` → clear error message
   - `wrong-parent/jwt-tokens` → should not match

## Implementation Checklist

### **Phase 1: Core Enhancement**
- [ ] Update `matchHeadingBySlug()` in `src/sections.ts`
- [ ] Add `matchHierarchicalSlug()` and `verifyHierarchicalContext()` helper functions
- [ ] Update all section functions to pass heading context
- [ ] Add comprehensive unit tests for section matching

### **Phase 2: Document Cache**
- [ ] Update `getSectionContent()` in `src/document-cache.ts`
- [ ] Implement hierarchical caching strategy
- [ ] Add cache invalidation for hierarchical keys
- [ ] Test cache performance with hierarchical lookups

### **Phase 3: Addressing System**
- [ ] Update `parseSectionAddress()` in `src/shared/addressing-system.ts`
- [ ] Add `normalizeHierarchicalSlug()` function
- [ ] Update caching keys for hierarchical support
- [ ] Add addressing system unit tests

### **Phase 4: MCP Tools**
- [ ] Update `section.ts` for hierarchical operations
- [ ] Update `view-section.ts` for hierarchical viewing
- [ ] Update `task.ts` for hierarchical task management
- [ ] Update `complete-task.ts` for hierarchical task completion
- [ ] Update `view-task.ts` for hierarchical task viewing
- [ ] Update `manage-document.ts` if needed
- [ ] Update `create-document.ts` if needed
- [ ] Update `browse-documents.ts` if needed

### **Phase 5: Response Enhancement**
- [ ] Add `formatHierarchicalContext()` to ToolIntegration
- [ ] Update response objects to include hierarchical information
- [ ] Add hierarchical path indicators to formatted responses
- [ ] Update error messages for hierarchical context

### **Phase 6: Testing & Validation**
- [ ] Run `pnpm test:run` - all tests pass
- [ ] Run `pnpm lint` - zero errors/warnings
- [ ] Run `pnpm typecheck` - zero type errors
- [ ] Run `pnpm check:dead-code` - zero unused exports
- [ ] Test with MCP inspector - all hierarchical patterns work
- [ ] Integration test - full hierarchical workflow
- [ ] Performance test - hierarchical caching efficiency

## Error Handling & Edge Cases

### **Ambiguous References**
```typescript
// Multiple sections named "Overview" - hierarchical path disambiguates
"api/overview" → finds Overview under API section
"frontend/overview" → finds Overview under Frontend section
"overview" → finds first Overview section (backward compatibility)
```

### **Invalid Hierarchical Paths**
```typescript
// Wrong parent context
"wrong-parent/child" → error: "Section 'child' not found under 'wrong-parent'"

// Non-existent parent
"nonexistent/child" → error: "Parent section 'nonexistent' not found"
```

### **Caching Strategy**
- Cache both hierarchical and flat keys for efficiency
- Invalidate related cache keys when document structure changes
- Use LRU eviction to manage cache size with hierarchical keys

## Migration Strategy

### **Alpha Phase (No Backward Compatibility Required)**
1. **Deploy hierarchical support** with comprehensive testing
2. **Update existing references** to use hierarchical paths where beneficial
3. **Validate all tools** work with new addressing system
4. **Performance test** with complex hierarchical documents

### **Future Compatibility Mode**
If backward compatibility becomes needed:
- Maintain flat addressing support (already built-in)
- Add configuration flag for addressing mode
- Support both addressing styles simultaneously

## Quality Gates

### **Mandatory Requirements**
- [ ] All existing tests continue to pass
- [ ] New hierarchical tests achieve 100% coverage
- [ ] `pnpm check:all` shows zero issues
- [ ] MCP inspector supports all hierarchical patterns
- [ ] No performance regression in section lookup
- [ ] Cache efficiency maintained or improved

### **Success Criteria**
1. **Hierarchical addressing works**: `api/auth/tokens` finds correct section
2. **Flat addressing preserved**: `tokens` still works for unique sections
3. **Disambiguation works**: Multiple "tokens" sections accessible via hierarchy
4. **Error handling clear**: Helpful messages for invalid hierarchical paths
5. **Performance maintained**: No significant slowdown in section operations
6. **Tool compatibility**: All 8 MCP tools support hierarchical addressing

## Implementation Notes

### **Key Files to Monitor**
- `src/sections.ts` - Core section lookup logic
- `src/document-cache.ts` - Caching with hierarchical support
- `src/shared/addressing-system.ts` - Address parsing and validation
- All files in `src/tools/implementations/` - MCP tool updates

### **Testing Priority**
1. **Section matching accuracy** - Correct hierarchical lookups
2. **Backward compatibility** - Existing flat addressing works
3. **Cache efficiency** - No memory leaks or performance issues
4. **MCP tool integration** - All tools support new addressing
5. **Error handling** - Clear messages for invalid paths

### **Performance Considerations**
- Hierarchical context verification adds minimal overhead
- Caching strategy reduces repeated hierarchy walks
- Early exit conditions optimize common cases
- Memory usage controlled by LRU cache limits

This implementation will provide a robust hierarchical addressing system while maintaining the existing flat addressing capabilities, giving users the best of both worlds for document navigation.