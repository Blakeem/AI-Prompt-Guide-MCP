# fetch_raw_html Tool Specification

## Overview

MCP tool for fetching raw HTML content from web pages without processing or conversion. Serves as a diagnostic tool and fallback when Markdown conversion fails or when raw HTML inspection is needed.

## Purpose

Enable LLMs to:
- Debug parsing issues by inspecting raw HTML
- Build custom parsing logic for special cases
- Diagnose why Markdown conversion failed
- Extract specific data using custom HTML parsing
- Validate content before Readability processing

## Key Features

- **Raw HTML Retrieval**: Returns unprocessed HTML exactly as received
- **Cloudflare-Friendly**: Uses browser-like User-Agent
- **Flexible Output**: Return content directly, save to file, or both
- **Metadata Rich**: Returns content length, encoding, and HTTP headers
- **Safety Valve**: Use when fetch_markdown fails or produces unexpected results

## Dependencies

### Required Packages

```json
{
  // Only built-in Node.js fetch API needed - no external dependencies
}
```

### Node.js Requirements

- **Node.js**: v18+ (for built-in fetch API)
- **Runtime**: ES modules

## Tool Schema

### Input Parameters

```typescript
interface FetchRawHtmlParams {
  url: string;                    // URL to fetch (required)
  output_mode?: 'direct' | 'file' | 'both';  // Default: 'direct'
  save_path?: string;             // Custom save path (optional)
  timeout?: number;               // Request timeout in ms (default: 30000)
  include_headers?: boolean;      // Include HTTP headers in response (default: false)
}
```

### Output Schema

```typescript
interface FetchRawHtmlResult {
  success: boolean;
  url: string;                    // Original URL
  html?: string;                  // Raw HTML content (if output_mode includes 'direct')
  saved_to?: string;              // File path (if output_mode includes 'file')
  file_size?: number;             // Size in bytes
  content_length?: number;        // Content-Length header value
  content_type?: string;          // Content-Type header value
  encoding?: string;              // Detected or specified encoding
  headers?: Record<string, string>;  // HTTP headers (if include_headers: true)
  error?: string;                 // Error message if failed
}
```

## Behavior Specification

### Output Modes

1. **`direct`** (default): Returns HTML in response, no file saved
   - Use case: Quick inspection, debugging
   - Best for: Small pages, immediate analysis

2. **`file`**: Saves to disk, returns metadata only
   - Use case: Large pages, archival
   - Best for: Full page preservation, later processing

3. **`both`**: Saves to disk AND returns HTML
   - Use case: Immediate use + persistent backup
   - Best for: Debugging with preservation

### Save Path Behavior

- **Default save location**: `${DOCS_BASE_PATH}/fetched/raw/`
- **Filename generation**: Sanitized from URL + timestamp + `.html` extension
- **Custom path**: If `save_path` provided, use as-is (must be within allowed directory)
- **Directory creation**: Auto-create parent directories if needed

### User-Agent Configuration

Use same browser-like User-Agent as fetch_markdown:

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
```

### Step 2: Extract Metadata

```typescript
const contentType = response.headers.get('content-type') ?? 'text/html';
const contentLength = response.headers.get('content-length');
const encoding = extractEncoding(contentType);

// Optionally collect all headers
const headers = include_headers
  ? Object.fromEntries(response.headers.entries())
  : undefined;
```

### Step 3: Read HTML

```typescript
const html = await response.text();
const actualSize = Buffer.byteLength(html, 'utf8');
```

### Step 4: Save or Return

```typescript
let result: FetchRawHtmlResult = {
  success: true,
  url,
  file_size: actualSize,
  content_length: contentLength ? parseInt(contentLength) : undefined,
  content_type: contentType,
  encoding,
  headers
};

if (output_mode === 'direct' || output_mode === 'both') {
  result.html = html;
}

if (output_mode === 'file' || output_mode === 'both') {
  const savePath = await saveToFile(html, save_path, url);
  result.saved_to = savePath;
}

return result;
```

## Error Handling

### Network Errors

- **Timeout**: Return error with timeout details
- **DNS failure**: Return error with clear DNS message
- **HTTP 403**: Suggest User-Agent issue or authentication required
- **HTTP 404**: Return not found error
- **HTTP 5xx**: Return server error with retry suggestion

### File System Errors

- **Permission denied**: Return error with path details
- **Disk full**: Return error with disk space message
- **Invalid path**: Return error with path validation details

### Content Errors

- **Empty response**: Return error indicating no content received
- **Invalid encoding**: Return error with encoding details
- **Content too large**: Return error if exceeds size limit (optional)

## Security Considerations

### Path Traversal Protection

- Validate all `save_path` parameters against allowed base directory
- Reject paths containing `..` or absolute paths outside allowed directory
- Use `path.resolve()` and `path.relative()` for validation

### Content Size Limits

- Consider implementing max content size (e.g., 10MB) for `direct` mode
- For larger content, automatically switch to or recommend `file` mode
- Track memory usage for concurrent requests

### Rate Limiting

- Share rate limiting with fetch_markdown tool
- Implement per-domain rate limiting (e.g., 5 requests per minute)
- Return rate limit error with retry-after information

## Performance Characteristics

### Memory Usage

- **Raw HTML storage**: Variable, typically 50KB - 5MB
- **Large pages**: Can exceed 10MB (news sites, SPAs)
- **Mitigation**: Implement size limits, stream to disk for large responses

### Timing Expectations

- **Network fetch**: 500ms - 5s (depends on page size and latency)
- **Processing**: Minimal (<10ms)
- **Total**: ~500ms - 5s for typical page

## Use Cases

### Use Case 1: Debugging Markdown Conversion

When `fetch_markdown` produces unexpected results:
```typescript
// First try failed with weird output
const mdResult = await mcp.callTool('fetch_markdown', {
  url: 'https://example.com/article'
});

// Inspect raw HTML to understand the issue
const htmlResult = await mcp.callTool('fetch_raw_html', {
  url: 'https://example.com/article',
  output_mode: 'direct'
});

// Now can see why Readability struggled
```

### Use Case 2: Custom Parsing

For pages with structured data or special formats:
```typescript
const result = await mcp.callTool('fetch_raw_html', {
  url: 'https://api-docs.example.com',
  output_mode: 'file'
});

// Load HTML and use custom parsing logic
// Can extract tables, code blocks, or structured data
```

### Use Case 3: Response Header Inspection

When diagnosing caching or authentication issues:
```typescript
const result = await mcp.callTool('fetch_raw_html', {
  url: 'https://example.com/page',
  output_mode: 'direct',
  include_headers: true
});

// result.headers contains all HTTP headers
// Can check cache-control, set-cookie, etc.
```

## Testing Strategy

### Unit Tests

- Mock fetch responses for various HTTP status codes
- Test encoding detection (UTF-8, ISO-8859-1, etc.)
- Test header extraction and parsing
- Verify save path generation and sanitization
- Validate error handling for all error types

### Integration Tests

- Test against real websites (use test fixtures for CI)
- Verify Cloudflare bypass with browser User-Agent
- Test large page handling (>5MB HTML)
- Verify file system operations with temp directories
- Test with various content types

### Edge Cases

- Empty responses (204 No Content)
- Redirects (should follow by default)
- Non-HTML content types (application/json, text/plain)
- Malformed or binary content
- Extremely large pages (>10MB)
- Unicode and various encodings

## Relationship to fetch_markdown

### When to Use Each Tool

**Use fetch_markdown when:**
- You want clean, readable content
- Target is an article or documentation
- You need content in LLM-friendly format
- Page structure is standard

**Use fetch_raw_html when:**
- Markdown conversion failed or produced bad results
- You need to inspect HTML structure
- Building custom parsing logic
- Debugging issues
- Page has non-standard structure

### Shared Infrastructure

Both tools should share:
- User-Agent configuration
- Rate limiting implementation
- Path validation logic
- Error handling patterns
- File system utilities

## Implementation Tasks

### Phase 1: Core Functionality
- [ ] Set up TypeScript project structure with ESM
- [ ] Implement basic fetch with custom User-Agent
- [ ] Add timeout handling with AbortController
- [ ] Extract response metadata (headers, content-type, encoding)
- [ ] Return raw HTML content

### Phase 2: File System Integration
- [ ] Implement save path generation from URL
- [ ] Add path traversal validation (reuse from fetch_markdown)
- [ ] Create directory structure automatically
- [ ] Handle file write errors gracefully
- [ ] Return file size and path metadata

### Phase 3: Header Processing
- [ ] Implement header extraction
- [ ] Add include_headers parameter handling
- [ ] Parse content-type for encoding
- [ ] Return structured header data

### Phase 4: Error Handling
- [ ] Add network error handling (timeout, DNS, HTTP)
- [ ] Add file system error handling (permissions, disk space)
- [ ] Implement structured error responses
- [ ] Add security audit logging
- [ ] Handle edge cases (empty response, wrong content-type)

### Phase 5: Testing
- [ ] Write unit tests for all error paths
- [ ] Test header extraction and parsing
- [ ] Test against real websites
- [ ] Add integration tests with temp file system
- [ ] Verify encoding detection
- [ ] Test large content handling

### Phase 6: Performance & Polish
- [ ] Share rate limiting with fetch_markdown
- [ ] Implement content size warnings
- [ ] Optimize memory usage for large pages
- [ ] Add content size to metadata
- [ ] Complete MCP tool schema and registration

## Related Documents

- @/api/specs/fetch-markdown.md - Primary tool for content fetching
- Project implementation will reference both specifications

## Notes

- This tool is primarily a diagnostic and fallback tool
- Most users will use fetch_markdown as the primary tool
- Raw HTML is useful for debugging and custom parsing scenarios
- Include clear guidance in error messages to try fetch_raw_html when fetch_markdown fails
- Sharing infrastructure with fetch_markdown reduces code duplication and maintenance
