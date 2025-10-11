# fetch_markdown Tool

## Overview
MCP tool for fetching web pages and converting them to clean Markdown using Readability and Turndown, with optional file persistence for immediate context use or archival

## Authentication
Authentication method and requirements.

## Base URL
```
https://api.example.com/v1
```

## Endpoints

### GET /example
Description of the endpoint.

**Request:**
```http
GET /example HTTP/1.1
Host: api.example.com
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {}
}
```

## Error Handling
Standard error response format and common error codes.

## Rate Limits
Rate limiting policies and headers.

## Tasks
- [ ] Implement endpoint validation
- [ ] Add comprehensive error handling
- [ ] Set up rate limiting