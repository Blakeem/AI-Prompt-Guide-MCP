# Document Discovery & Reference Validation - Improvement Plan

## Overview

This plan outlines improvements for the simplified document discovery features retained after cleanup:
1. **Related Document Discovery** - Finding relevant documents through keyword matching
2. **Broken Reference Detection** - Identifying invalid @references

## Current State (Post-Cleanup)

### ✅ What We Have
- **Simple keyword-based related document discovery** (top 5 results)
- **Basic broken reference detection** using regex parsing
- **Simplified interfaces** with minimal complexity
- **Performance-conscious limits** (5 results max)

### ⚠️ Current Issues
- **File System Hammering**: Reads full content of every document for analysis
- **Cache Inefficiency**: Doesn't leverage existing document cache optimally
- **Reference System Duplication**: Reimplements @reference parsing instead of using existing `ReferenceExtractor`
- **Basic Keyword Extraction**: Simple word splitting could be improved
- **No Content Fingerprinting**: Processes entire documents instead of using metadata

## Improvement Strategy

### Phase 1: Performance & Cache Optimization 🚀

#### 1.1 Implement Content Fingerprinting
**Goal**: Avoid reading full document content for every analysis

**Implementation**:
```typescript
interface DocumentFingerprint {
  path: string;
  title: string;
  keywords: string[];      // Pre-extracted keywords
  lastModified: Date;
  contentHash: string;     // Quick content signature
}
```

**Changes**:
- Add fingerprint generation during document caching
- Store fingerprints in document metadata
- Use fingerprints for relevance matching instead of full content
- Only read full content when fingerprint is missing/stale

**Benefits**:
- ~90% reduction in file system reads during analysis
- Leverages existing document cache system
- Maintains accuracy while improving speed

#### 1.2 Optimize Cache Integration
**Goal**: Better integration with existing `DocumentCache` system

**Implementation**:
- Modify `DocumentCache` to store keyword fingerprints
- Add cache invalidation for fingerprints when documents change
- Use cached metadata for analysis instead of repeated file reads

**Changes**:
```typescript
// In DocumentCache
interface CachedDocument {
  // ... existing fields
  fingerprint?: DocumentFingerprint;
}

// Update fingerprint during cache operations
private async updateFingerprint(document: CachedDocument): Promise<void>
```

#### 1.3 Batch Processing Optimization
**Goal**: Reduce redundant operations during analysis

**Implementation**:
- Pre-load all document metadata in single operation
- Filter candidates before expensive content analysis
- Process documents in relevance-sorted order with early termination

### Phase 2: Reference System Integration 🔗

#### 2.1 Leverage Existing ReferenceExtractor
**Goal**: Reuse proven @reference parsing instead of duplicating logic

**Current Duplication**:
```typescript
// detectBrokenReferences() duplicates this logic:
const referenceRegex = /@([^@\s]+(?:\.md)?(?:#[^\s]*)?)/g;
```

**Better Approach**:
```typescript
import { ReferenceExtractor } from '../shared/reference-extractor.js';

async function detectBrokenReferences(content: string): Promise<string[]> {
  const extractor = new ReferenceExtractor();
  const references = extractor.extractReferences(content);

  // Check existence using document manager
  // ... validation logic
}
```

**Benefits**:
- Consistent @reference parsing across all tools
- Maintains existing reference format support
- Reduces code duplication and test surface

#### 2.2 Enhanced Reference Validation
**Goal**: More comprehensive broken reference detection

**Features**:
- **Section-level validation**: Check if `@/doc.md#section` sections actually exist
- **Format validation**: Detect malformed @reference syntax
- **Circular reference detection**: Prevent infinite loops
- **Suggestion engine**: Propose corrections for broken references

**Implementation**:
```typescript
interface BrokenReference {
  original: string;           // "@/missing/doc.md#section"
  issue: 'missing_document' | 'missing_section' | 'malformed';
  suggestions?: string[];     // Possible corrections
}
```

### Phase 3: Intelligent Discovery Enhancement 🧠

#### 3.1 Improved Keyword Extraction
**Goal**: Better keyword identification and weighting

**Current Issues**:
- Basic word splitting with stop-word filtering
- No keyword importance weighting
- Ignores document structure (headings, emphasis)

**Improvements**:
```typescript
interface WeightedKeyword {
  term: string;
  weight: number;    // 0.1 to 1.0 based on source importance
  source: 'title' | 'heading' | 'emphasis' | 'content';
}

function extractWeightedKeywords(title: string, content: string): WeightedKeyword[] {
  // Extract from title (weight: 1.0)
  // Extract from headings (weight: 0.8)
  // Extract from **bold** and *italic* (weight: 0.6)
  // Extract from regular content (weight: 0.3)
}
```

#### 3.2 Relevance Scoring Enhancement
**Goal**: More sophisticated document relationship scoring

**Multi-Factor Scoring**:
```typescript
interface RelevanceFactors {
  keywordOverlap: number;      // Current implementation
  titleSimilarity: number;     // Title word overlap bonus
  namespaceSimilarity: number; // Same/related namespace bonus
  recentActivity: number;      // Recently modified docs bonus
  referenceConnections: number; // Documents that reference each other
}

function calculateEnhancedRelevance(factors: RelevanceFactors): number {
  // Weighted combination of factors
  // Returns 0.0 to 1.0 relevance score
}
```

#### 3.3 Contextual Discovery
**Goal**: Understand document relationships beyond keywords

**Features**:
- **Reference graph analysis**: Documents that reference each other are more relevant
- **Namespace relationship scoring**: Related namespaces get relevance boost
- **Temporal relevance**: Recently modified documents get priority
- **Content structure analysis**: Documents with similar heading structures

## Implementation Timeline

### Sprint 1 (Week 1): Foundation
- [ ] Add content fingerprinting to `DocumentCache`
- [ ] Implement batch metadata loading
- [ ] Basic performance optimization

### Sprint 2 (Week 2): Reference Integration
- [ ] Replace custom regex with `ReferenceExtractor`
- [ ] Add section-level reference validation
- [ ] Implement reference suggestion engine

### Sprint 3 (Week 3): Enhanced Discovery
- [ ] Implement weighted keyword extraction
- [ ] Add multi-factor relevance scoring
- [ ] Performance testing and optimization

### Sprint 4 (Week 4): Polish & Testing
- [ ] Comprehensive unit test coverage
- [ ] Integration testing with MCP Inspector
- [ ] Documentation and usage examples

## Success Metrics

### Performance Goals
- **90% reduction** in file system reads during analysis
- **Sub-100ms response time** for related document discovery
- **Zero file system reads** for repeat analyses (cache hits)

### Quality Goals
- **95% accuracy** for broken reference detection
- **Relevant suggestions** in top 3 results for keyword-based discovery
- **Zero false positives** for broken reference detection

### Maintainability Goals
- **Single source of truth** for @reference parsing (reuse ReferenceExtractor)
- **Comprehensive test coverage** (>90% for new code)
- **Clear separation** between performance and business logic

## Configuration Options

### Environment Variables
```bash
# Enable/disable discovery features
ENABLE_DOCUMENT_DISCOVERY=true
ENABLE_REFERENCE_VALIDATION=true

# Performance tuning
MAX_RELATED_DOCUMENTS=5
RELEVANCE_THRESHOLD=0.2
CACHE_FINGERPRINTS=true

# Feature flags for gradual rollout
USE_ENHANCED_KEYWORDS=false
USE_REFERENCE_GRAPH_SCORING=false
```

### Runtime Configuration
```typescript
interface DiscoveryConfig {
  maxResults: number;           // Default: 5
  relevanceThreshold: number;   // Default: 0.2
  enableFingerprinting: boolean; // Default: true
  enableSectionValidation: boolean; // Default: true
}
```

## Risk Mitigation

### Performance Risks
- **Risk**: Cache memory usage growth
- **Mitigation**: LRU eviction with configurable limits, fingerprint size optimization

### Accuracy Risks
- **Risk**: False broken reference detection
- **Mitigation**: Comprehensive test suite, gradual feature rollout, user feedback loops

### Complexity Risks
- **Risk**: Feature creep and maintenance burden
- **Mitigation**: Strict scope adherence, comprehensive documentation, regular refactoring

## Future Considerations

### Advanced Features (Not in Scope)
- **Machine learning relevance**: Document embeddings for semantic similarity
- **User behavior analysis**: Track which suggestions are actually used
- **Cross-project discovery**: Finding related documents across multiple repositories
- **Real-time collaboration**: Multi-user document relationship tracking

### Integration Opportunities
- **Task management integration**: Link discovery to task dependencies
- **Workflow automation**: Auto-create references during document creation
- **Quality metrics**: Track documentation completeness via reference analysis

---

*This plan focuses on practical improvements that enhance performance and accuracy while maintaining the simplicity achieved through the recent cleanup.*