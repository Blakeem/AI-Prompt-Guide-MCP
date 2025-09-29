# Document Discovery & Reference Validation - Work Plan

## Current Implementation Snapshot

### Related Document Discovery (`src/shared/document-analysis.ts` → `findRelatedDocuments`)
- Enumerates every markdown file via `DocumentManager.listDocuments()` on each run.
- Pulls metadata from the cache but attempts to fetch content with `manager.getSectionContent(docInfo.path, '')`, which fails because the slug is empty; relevance scores therefore rely almost entirely on titles.
- Uses `extractKeywords` + `calculateContentRelevance` (plain keyword overlap) and always returns a generic "Related documentation in {namespace}" reason.
- Suggestions power Stage 2.5 of the create-document workflow through `src/tools/create/suggestion-generator.ts`.

### Broken Reference Detection (`src/shared/document-analysis.ts` → `detectBrokenReferences`)
- Scans only the provided title + overview text.
- Uses an inline regex (`/@([^@\s]+(?:\.md)?(?:#[^\s]*)?)/g`) and manual string munging instead of the shared `ReferenceExtractor` / `ReferenceLoader` pipeline.
- Treats any lookup failure as a missing document, never flags missing sections, and does not de-duplicate work across calls.

### Shared Infrastructure
- `DocumentManager` exposes `listDocuments`, `getDocument`, and `getSectionContent`; there is no helper for whole-document reads or metadata-only queries.
- `DocumentCache` already computes `contentHash`, `wordCount`, `linkCount`, and `codeBlockCount`, but it does not maintain keyword fingerprints or namespace metadata and always parses the entire file to serve section content.
- No direct unit tests cover `document-analysis`; regressions would surface only through create-document integration tests (which currently do not exist).

## Key Gaps & Risks
- Related-document relevance never inspects real content because of the empty-slug lookup.
- Discovery re-reads the filesystem on every request, even when the cache is warm.
- Reference validation duplicates parsing logic and cannot distinguish document vs. section failures.
- Lack of module-level tests makes incremental changes risky.
- All responsibilities sit in `document-analysis.ts`, complicating subagent ownership.
- **Cache invalidation unclear**: No strategy for fingerprint updates when documents change externally.
- **Interface compatibility**: Restructuring may break existing `analyzeDocumentSuggestions` callers.
- **Performance validation missing**: No benchmarks or regression detection for claimed improvements.
- **Edge case handling**: Undefined behavior for documents with no content, extraction failures, or concurrent access.

## Workstreams (subagent-ready)
Each stage can be handed to a subagent. Pair behaviour changes with targeted tests under `src/shared/__tests__/`.

### Stage 1 – Stabilize current behaviours
- [ ] Add a dedicated helper for fetching full document content (e.g., `DocumentManager.getDocumentContent` delegating to a new `DocumentCache.readDocumentContent`) so we stop passing an empty slug.
- [ ] Update `findRelatedDocuments` to use the helper, fall back to metadata when content is unavailable, and surface which fields contributed to the relevance score.
- [ ] Add unit tests for keyword extraction + related document ranking at `src/shared/__tests__/document-analysis.test.ts` and an integration-style test for Stage 2.5 in `src/tools/__tests__/suggestion-generator.test.ts`.

### Stage 2 – Cache & metadata plumbing
- [ ] Extend `DocumentMetadata` with namespace + lightweight keyword fingerprints generated during cache population.
- [ ] Add `DocumentManager.listDocumentFingerprints()` that returns metadata without reparsing files (use cached entries when available).
- [ ] Rework `findRelatedDocuments` to consume fingerprints first and hydrate full content only for high-signal candidates, emitting debug logs via the existing logger at `debug` level (no new env flags).

### Stage 3 – Reference system integration
- [ ] Replace the inline regex in `detectBrokenReferences` with the shared `ReferenceExtractor`, validating both document existence and section slugs.
- [ ] Introduce a structured `BrokenReference` response (`missing_document`, `missing_section`, `malformed`) leveraging helpers from `src/shared/link-validation.ts`.
- [ ] Backfill tests covering missing documents, missing sections, malformed references, and happy paths.

### Stage 4 – Deterministic discovery improvements
- [ ] Lift keyword utilities into `shared/document-analysis/keyword-utils.ts`, expand weighting (title, headings, emphasis) using cached fingerprints, and treat explicit `Keywords` frontmatter/sections as authoritative when present.
- [ ] Augment relevance scoring with namespace affinity and recency while keeping the algorithm deterministic and rule-based (no embeddings). Keep link-graph boosts optional and gated behind internal feature toggles, not user config.
- [ ] Update suggestion copy to explain why each document matched (e.g., shared keywords, same namespace, reciprocal links).

### Stage 5 – Testing, tooling, and documentation
- [ ] Add regression coverage for the create-document workflow to ensure Stage 2.5 returns both related documents and structured reference diagnostics.
- [ ] Document the discovery pipeline in `docs/development/document-discovery.md`, including how to seed keywords deterministically for LLM authors.
- [ ] Prune dead exports introduced during refactors and ensure lint/typecheck suites cover new modules.

## Critical Implementation Requirements

### Interface Compatibility & Migration
- **Maintain backward compatibility**: Keep existing `analyzeDocumentSuggestions` signature unchanged during refactor
- **Deprecation strategy**: Add new interfaces alongside old ones, migrate callers gradually
- **Version detection**: Tools can detect and use enhanced features when available
```typescript
// Maintain this signature:
export async function analyzeDocumentSuggestions(manager, namespace, title, overview): Promise<SmartSuggestions>

// Add enhanced version:
export async function analyzeDocumentSuggestionsV2(params: AnalysisParams): Promise<EnhancedSuggestions>
```

### Cache Invalidation Strategy
- **File modification detection**: Fingerprints must invalidate when source documents change
- **Multi-instance safety**: Handle concurrent MCP server instances gracefully
- **Incremental updates**: Update only changed fingerprints, not entire cache
```typescript
// Add to DocumentCache:
interface FingerprintEntry {
  keywords: string[];
  lastModified: Date;
  contentHash: string;
  namespace: string;
}

// Invalidation on file change:
private invalidateFingerprint(docPath: string): void
```

### Performance Benchmarking
Each stage must include performance validation:
- **Stage 1**: Measure current filesystem read count (baseline)
- **Stage 2**: Verify fingerprint cache hit rates (target: >80%)
- **Stage 3**: Measure reference validation speed (target: <50ms)
- **Stage 4**: Overall discovery response time (target: <100ms)

**Benchmark harness**:
```typescript
// Add to test suite:
describe('Performance Benchmarks', () => {
  it('should complete discovery in <100ms with warm cache');
  it('should reduce filesystem reads by >80%');
  it('should validate references in <50ms');
});
```

### Edge Case Requirements
- **Empty content handling**: Documents with no extractable keywords should use title/path fallback
- **Extraction failures**: Graceful degradation when keyword extraction fails
- **Concurrent access**: Thread-safe fingerprint updates and cache access
- **Large document handling**: Impose content size limits for keyword extraction (e.g., 100KB)
- **Binary file filtering**: Skip non-markdown files early in pipeline

## Enhanced Relevance Algorithm (Stage 4 Details)

### Multi-Factor Scoring Formula
```typescript
interface RelevanceFactors {
  keywordOverlap: number;      // 0.0-1.0: Current implementation
  titleSimilarity: number;     // 0.0-0.3: Boost for similar title words
  namespaceAffinity: number;   // 0.0-0.2: Boost for related namespaces
  recencyBoost: number;        // 0.0-0.1: Boost for recently modified docs
  linkGraphBoost: number;      // 0.0-0.3: Boost for documents that reference each other
}

// Final relevance = keywordOverlap + titleSimilarity + namespaceAffinity + recencyBoost + linkGraphBoost
// Capped at 1.0 maximum
```

### Practical Examples
**Creating**: `/api/guides/user-authentication.md` with keywords: `["user", "auth", "jwt", "api"]`

**Document A**: `/api/specs/auth-api.md`
- Keywords match: `auth`, `api` → **keywordOverlap: 0.5**
- Title similarity: "auth" in both → **titleSimilarity: 0.2**
- Same namespace family: `api/*` → **namespaceAffinity: 0.2**
- Modified yesterday → **recencyBoost: 0.05**
- No cross-references → **linkGraphBoost: 0.0**
- **Total relevance: 0.95**

**Document B**: `/security/jwt-implementation.md`
- Keywords match: `jwt` → **keywordOverlap: 0.25**
- No title similarity → **titleSimilarity: 0.0**
- Different namespace → **namespaceAffinity: 0.0**
- Modified last week → **recencyBoost: 0.02**
- Referenced by auth docs → **linkGraphBoost: 0.3**
- **Total relevance: 0.57**

### Namespace Affinity Rules
```typescript
// Simple prefix matching with decay:
function calculateNamespaceAffinity(sourceNamespace: string, targetNamespace: string): number {
  if (sourceNamespace === targetNamespace) return 0.2;        // Same: api/specs === api/specs
  if (targetNamespace.startsWith(sourceNamespace + '/')) return 0.15; // Parent: api/* contains api/guides/*
  if (sourceNamespace.startsWith(targetNamespace + '/')) return 0.15; // Child: api/guides/* in api/*
  if (shareCommonPrefix(sourceNamespace, targetNamespace)) return 0.1; // Sibling: api/specs vs api/guides
  return 0.0;                                              // Unrelated: api/* vs frontend/*
}
```

This keeps scoring **deterministic, fast, and explainable** - no black box algorithms.

## Suggested file/module restructuring
- Split `src/shared/document-analysis.ts` into focused modules:
  - `shared/document-analysis/index.ts` (orchestrators)
  - `shared/document-analysis/related-docs.ts`
  - `shared/document-analysis/reference-validation.ts`
  - `shared/document-analysis/keyword-utils.ts`
- Move shared types (e.g., `RelatedDocumentSuggestion`, `BrokenReference`) into `src/shared/types/document-discovery.ts` to avoid circular imports.
- Create `docs/development/document-discovery.md` capturing architecture notes, performance tuning tips, and debugging steps for subagents.

## Configuration expectations
Keep MCP server configuration minimal—most users should never touch discovery knobs. Only expose settings with clear use cases:

Environment variables (defaults in parentheses):
- `MAX_RELATED_DOCUMENTS` (`5`) – advanced override when a workspace needs more/fewer suggestions.
- `DISCOVERY_RELEVANCE_THRESHOLD` (`0.2`) – advanced override for noisy corpora.

Everything else (fingerprints, reference validation, debugging) rides on existing infrastructure:
- Use the global `LOG_LEVEL=debug` to inspect cache behaviour instead of a bespoke flag.
- Reference extraction depth continues to honour the established `REFERENCE_EXTRACTION_DEPTH` variable from the broader system.
- New deterministic scoring features ship enabled by default; internal feature toggles (temporary guards while staging changes) live in code and are removed once stable.

Runtime config shape for internal use:
```typescript
interface DiscoveryConfig {
  maxResults: number;
  relevanceThreshold: number;
  enableFingerprints: boolean;
  includeSectionValidation: boolean;
  debugLogging: boolean;
}
```
`enableFingerprints` and `includeSectionValidation` are code-level switches managed by feature flags during rollout rather than user-facing env vars.

## Risks & mitigations
- **Cache growth**: Trim fingerprints to fixed size and rely on existing LRU eviction.
- **Cross-module churn**: Ship stages sequentially, keeping orchestrator exports stable for downstream tools.
- **Test brittleness**: Use lightweight fixtures/builders for cached documents rather than full filesystem snapshots.

## Future considerations (out of scope for now)
- Semantic embeddings or vector similarity for discovery.
- Cross-repository discovery.
- Feedback loops that learn from accepted suggestions.
