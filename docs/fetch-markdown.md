# fetch_markdown Tool Specification

## Overview

MCP tool for fetching web pages and converting them to clean, readable Markdown. Uses Mozilla's Readability library to extract main content and Turndown to convert HTML to Markdown. Supports optional file persistence with configurable output modes.

## Purpose

Enable LLMs to fetch documentation, articles, and web content in a clean Markdown format that can be:
- Loaded directly into context for immediate use
- Saved to disk for later reference or handoff to sub-agents
- Used for building documentation snapshots

## Key Features

- **Smart Content Extraction**: Uses @mozilla/readability to extract article content, removing navigation, ads, and boilerplate
- **Clean Markdown Conversion**: Turndown library converts HTML to well-formatted Markdown
- **Cloudflare-Friendly**: Uses browser-like User-Agent to bypass common bot detection
- **Flexible Output**: Return content directly, save to file, or both
- **Rich Metadata**: Returns title, file size, save path, and word count
- **Error Handling**: Graceful handling of network errors, parsing failures, and timeouts

## Dependencies

### Required npm Packages

```json
{
  "@mozilla/readability": "^0.5.0",
  "jsdom": "^24.0.0",
  "turndown": "^7.1.3"
}
```

### Node.js Requirements

- **Node.js**: v18+ (for built-in fetch API)
- **Runtime**: ES modules

## Tool Schema

### Input Parameters

```typescript
interface FetchMarkdownParams {
  url: string;                    // URL to fetch (required)
  output_mode?: 'direct' | 'file' | 'both';  // Default: 'direct'
  save_path?: string;             // Custom save path (optional)
  timeout?: number;               // Request timeout in ms (default: 30000)
}
```

### Output Schema

```typescript
interface FetchMarkdownResult {
  success: boolean;
  url: string;                    // Original URL
  title?: string;                 // Extracted article title
  markdown?: string;              // Markdown content (if output_mode includes 'direct')
  saved_to?: string;              // File path (if output_mode includes 'file')
  file_size?: number;             // Size in bytes (if saved)
  word_count?: number;            // Approximate word count
  error?: string;                 // Error message if failed
}
```

## Behavior Specification

### Output Modes

1. **`direct`** (default): Returns markdown in response, no file saved
   - Use case: Immediate context loading
   - Best for: Short to medium documents (<50KB)

2. **`file`**: Saves to disk, returns path only
   - Use case: Large documents or persistent storage
   - Best for: Documentation archives, handoff to sub-agents

3. **`both`**: Saves to disk AND returns markdown
   - Use case: Immediate use + persistent backup
   - Best for: Important references

### Save Path Behavior

- **Default save location**: `${DOCS_BASE_PATH}/fetched/`
- **Filename generation**: Sanitized from page title + timestamp
- **Custom path**: If `save_path` provided, use as-is (must be within allowed directory)
- **Directory creation**: Auto-create parent directories if needed

### User-Agent Configuration

Use browser-like User-Agent to bypass Cloudflare and bot detection:

```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
```

## Implementation Pipeline

### Step 1: Fetch HTML

```typescript
const response = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  },
  signal: AbortSignal.timeout(timeout)
});

if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

const html = await response.text();
```

### Step 2: Parse with jsdom

```typescript
import { JSDOM } from 'jsdom';

const dom = new JSDOM(html, {
  url: url  // Important: provides base URL for relative links
});
```

### Step 3: Extract Content with Readability

```typescript
import { Readability } from '@mozilla/readability';

const reader = new Readability(dom.window.document);
const article = reader.parse();

if (!article) {
  throw new Error('Failed to extract article content');
}

// article.content contains cleaned HTML
// article.title contains the article title
```

### Step 4: Convert to Markdown with Turndown

```typescript
import TurndownService from 'turndown';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-'
});

const markdown = turndownService.turndown(article.content);
```

### Step 5: Save or Return

```typescript
let result: FetchMarkdownResult = {
  success: true,
  url,
  title: article.title,
  word_count: estimateWordCount(markdown)
};

if (output_mode === 'direct' || output_mode === 'both') {
  result.markdown = markdown;
}

if (output_mode === 'file' || output_mode === 'both') {
  const savePath = await saveToFile(markdown, save_path, article.title);
  result.saved_to = savePath;
  result.file_size = Buffer.byteLength(markdown, 'utf8');
}

return result;
```

## Error Handling

### Network Errors

- **Timeout**: Return error with timeout details
- **DNS failure**: Return error with clear DNS message
- **HTTP 403**: Suggest User-Agent issue
- **HTTP 404**: Return not found error
- **HTTP 5xx**: Return server error with retry suggestion

### Parsing Errors

- **Readability fails**: Return error suggesting content may not be article-like
- **Invalid HTML**: Return error with DOM parsing details
- **Empty content**: Return error indicating no extractable content

### File System Errors

- **Permission denied**: Return error with path details
- **Disk full**: Return error with disk space message
- **Invalid path**: Return error with path validation details

## Security Considerations

### Path Traversal Protection

- Validate all `save_path` parameters against allowed base directory
- Reject paths containing `..` or absolute paths outside allowed directory
- Use `path.resolve()` and `path.relative()` for validation

### Content Sanitization

- Readability provides basic sanitization
- Consider adding DOMPurify for untrusted sources
- Log security events for audit trail

### Rate Limiting

- Implement per-domain rate limiting (e.g., 5 requests per minute)
- Return rate limit error with retry-after information
- Track requests in memory cache with TTL

## Performance Characteristics

### Memory Usage

- **HTML parsing**: ~10-50MB for typical pages
- **Markdown conversion**: Additional ~5-20MB
- **Mitigation**: Stream large responses, limit concurrent requests

### Timing Expectations

- **Network fetch**: 500ms - 5s (depends on page size and latency)
- **Parsing**: 100ms - 500ms (depends on page complexity)
- **Total**: ~1-6 seconds for typical page

### Optimization Opportunities

- Cache parsed results by URL (with TTL)
- Reuse JSDOM and Turndown instances
- Parallel processing for batch operations (future enhancement)

## Testing Strategy

### Unit Tests

- Mock fetch responses for various HTTP status codes
- Test Readability with sample HTML fixtures
- Verify Turndown output formatting
- Test save path generation and sanitization
- Validate error handling for all error types

### Integration Tests

- Test against real websites (use test fixtures for CI)
- Verify Cloudflare bypass with browser User-Agent
- Test large page handling (>1MB HTML)
- Verify file system operations with temp directories

### Edge Cases

- Pages with no extractable content
- Pages with complex JavaScript (won't render)
- Malformed HTML
- Extremely large pages (>10MB)
- Unicode and emoji handling
- Relative vs absolute URL handling

## Usage Examples

### Example 1: Fetch Documentation (Direct Mode)

```typescript
const result = await mcp.callTool('fetch_markdown', {
  url: 'https://nodejs.org/api/fs.html',
  output_mode: 'direct'
});

// result.markdown contains the cleaned markdown
// Can be used immediately in context
```

### Example 2: Archive Documentation (File Mode)

```typescript
const result = await mcp.callTool('fetch_markdown', {
  url: 'https://docs.example.com/api-reference',
  output_mode: 'file'
});

// result.saved_to: '/path/to/docs/fetched/api-reference-20250111.md'
// result.file_size: 45632
```

### Example 3: Fetch and Archive (Both Mode)

```typescript
const result = await mcp.callTool('fetch_markdown', {
  url: 'https://github.com/user/repo/blob/main/README.md',
  output_mode: 'both',
  save_path: 'vendor-docs/repo-readme.md'
});

// result.markdown: Available immediately
// result.saved_to: Custom path used
```

## Implementation Tasks

### Phase 1: Core Functionality
- [ ] Set up TypeScript project structure with ESM
- [ ] Install and configure dependencies (jsdom, readability, turndown)
- [ ] Implement basic fetch with custom User-Agent
- [ ] Integrate Readability for content extraction
- [ ] Integrate Turndown for Markdown conversion
- [ ] Add timeout handling with AbortController

### Phase 2: File System Integration
- [ ] Implement save path generation from title
- [ ] Add path traversal validation
- [ ] Create directory structure automatically
- [ ] Handle file write errors gracefully
- [ ] Return file size and path metadata

### Phase 3: Error Handling
- [ ] Add network error handling (timeout, DNS, HTTP)
- [ ] Add parsing error handling (Readability failures)
- [ ] Add file system error handling (permissions, disk space)
- [ ] Implement structured error responses
- [ ] Add security audit logging

### Phase 4: Testing
- [ ] Write unit tests for all error paths
- [ ] Create HTML fixtures for parser testing
- [ ] Test against real websites
- [ ] Add integration tests with temp file system
- [ ] Verify Cloudflare bypass functionality

### Phase 5: Performance & Polish
- [ ] Add result caching (optional)
- [ ] Implement per-domain rate limiting
- [ ] Optimize memory usage for large pages
- [ ] Add word count estimation
- [ ] Complete MCP tool schema and registration

## Related Documents

- @/api/specs/fetch-raw-html.md - Companion tool for raw HTML fetching
- Project implementation will reference both specifications

## Notes

- Default to `output_mode: 'direct'` since immediate context loading is the most common use case
- File size reporting helps LLMs decide whether to load content into context
- Word count provides quick content length assessment
- Browser User-Agent is critical for Cloudflare bypass
