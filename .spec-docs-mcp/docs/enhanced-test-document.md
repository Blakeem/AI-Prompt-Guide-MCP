# Comprehensive API Documentation Test

## Table of Contents

- [Overview](#overview)
  - [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
- [Authentication](#authentication)
  - [OAuth 2.0 Setup](#oauth-20-setup)
    - [Client Registration](#client-registration)
    - [Authorization Flow](#authorization-flow)
  - [JWT Tokens](#jwt-tokens)
    - [Token Structure](#token-structure)
    - [Token Validation](#token-validation)
- [API Endpoints](#api-endpoints)
  - [Users API](#users-api)
    - [GET /users](#get-users)
    - [POST /users](#post-users)
    - [GET /users/:id](#get-users-id)
  - [Products API](#products-api)
- [Advanced Features](#advanced-features)
  - [Pagination](#pagination)
  - [Filtering](#filtering)
  - [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
  - [HTTP Status Codes](#http-status-codes)
  - [Error Response Format](#error-response-format)
- [Code Examples](#code-examples)
- [Related Resources](#related-resources)

## Overview

This comprehensive API documentation demonstrates all markdown features and slug-based navigation capabilities of the Spec-Docs MCP system.

### Quick Start

Get your API integration running in under 5 minutes:

1. [Register your application](#client-registration)
2. [Obtain credentials](#oauth-20-setup)
3. [Make your first API call](#get-users)

### Prerequisites

Before you begin, ensure you have:

- [ ] API account created at [developer.example.com](https://developer.example.com)
- [ ] Node.js 18+ or Python 3.9+ installed
- [ ] Basic understanding of REST APIs
- [ ] Familiarity with [OAuth 2.0](https://oauth.net/2/)

## Authentication

> **Important:** All API requests require authentication. Public endpoints were deprecated in v2.0.

### OAuth 2.0 Setup

Our API uses OAuth 2.0 for secure authentication. Follow these steps to get started.

#### Client Registration

First, register your application to obtain credentials:

```bash
# Register a new OAuth application
curl -X POST https://api.example.com/oauth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCOUNT_TOKEN" \
  -d '{
    "name": "My Awesome App",
    "description": "Integration for data processing",
    "redirect_uris": [
      "https://myapp.com/callback",
      "http://localhost:3000/callback"
    ],
    "scopes": ["read:users", "write:users", "read:products"]
  }'
```

**Response:**
```json
{
  "client_id": "abc123def456",
  "client_secret": "super-secret-key-keep-safe",
  "name": "My Awesome App",
  "redirect_uris": ["https://myapp.com/callback"],
  "created_at": "2025-01-06T12:00:00Z"
}
```

> **Security Warning:** Never expose your `client_secret` in client-side code or public repositories!

#### Authorization Flow

The OAuth 2.0 authorization flow:

```mermaid
sequenceDiagram
    participant User
    participant YourApp as Your App
    participant AuthServer as Auth Server
    participant API
    
    User->>YourApp: Click "Login"
    YourApp->>AuthServer: Redirect to /authorize
    AuthServer->>User: Show consent screen
    User->>AuthServer: Approve access
    AuthServer->>YourApp: Redirect with code
    YourApp->>AuthServer: Exchange code for token
    AuthServer->>YourApp: Return access token
    YourApp->>API: Make API request with token
    API->>YourApp: Return data
```

### JWT Tokens

After successful authentication, you'll receive a JWT (JSON Web Token).

#### Token Structure

JWTs consist of three parts:

| Part | Description | Example |
|------|-------------|---------|
| **Header** | Algorithm & token type | `{"alg":"RS256","typ":"JWT"}` |
| **Payload** | Claims & user data | `{"sub":"user123","exp":1234567890,"scopes":["read:users"]}` |
| **Signature** | Cryptographic signature | `[base64url encoded signature]` |

<details>
<summary>🔍 View Full Token Example</summary>

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNzA0NTY3ODkwLCJzY29wZXMiOlsicmVhZDp1c2VycyIsIndyaXRlOnVzZXJzIl0sImlhdCI6MTcwNDU2NDI5MH0.signature_here
```

Decoded payload:
```json
{
  "sub": "user123",
  "name": "John Doe",
  "exp": 1704567890,
  "scopes": ["read:users", "write:users"],
  "iat": 1704564290
}
```

</details>

#### Token Validation

Always validate tokens before use:

```javascript
const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');

// Create JWKS client
const client = jwksRsa({
  jwksUri: 'https://api.example.com/.well-known/jwks.json'
});

// Get signing key
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Verify token
jwt.verify(token, getKey, {
  audience: 'https://api.example.com',
  issuer: 'https://auth.example.com',
  algorithms: ['RS256']
}, (err, decoded) => {
  if (err) {
    console.error('Token validation failed:', err);
  } else {
    console.log('Token valid! User:', decoded.sub);
  }
});
```

## API Endpoints

### Users API

Manage user accounts and profiles.

#### GET /users

Retrieve a paginated list of users.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 20, max: 100) |
| `sort` | string | No | Sort field: `name`, `created_at`, `updated_at` |
| `order` | string | No | Sort order: `asc` or `desc` |
| `filter` | string | No | Filter expression (see [Filtering](#filtering)) |

**Example Request:**

```http
GET /api/v1/users?page=2&limit=50&sort=created_at&order=desc
Authorization: Bearer YOUR_ACCESS_TOKEN
Accept: application/json
```

**Example Response:**

```json
{
  "data": [
    {
      "id": "usr_abc123",
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "role": "admin",
      "created_at": "2025-01-05T10:30:00Z",
      "updated_at": "2025-01-06T08:15:00Z"
    },
    {
      "id": "usr_def456",
      "name": "Bob Smith",
      "email": "bob@example.com",
      "role": "user",
      "created_at": "2025-01-04T14:20:00Z",
      "updated_at": "2025-01-04T14:20:00Z"
    }
  ],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 237,
    "pages": 5
  },
  "links": {
    "first": "/api/v1/users?page=1&limit=50",
    "prev": "/api/v1/users?page=1&limit=50",
    "next": "/api/v1/users?page=3&limit=50",
    "last": "/api/v1/users?page=5&limit=50"
  }
}
```

#### POST /users

Create a new user account.

**Request Body:**

```typescript
interface CreateUserRequest {
  name: string;           // Required, 2-100 characters
  email: string;          // Required, valid email
  password?: string;      // Optional, min 8 characters
  role?: 'user' | 'admin'; // Optional, defaults to 'user'
  metadata?: {
    department?: string;
    location?: string;
    phone?: string;
  };
}
```

**Example:**

<details>
<summary>View Full Example</summary>

```bash
curl -X POST https://api.example.com/api/v1/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Carol Davis",
    "email": "carol@example.com",
    "role": "user",
    "metadata": {
      "department": "Engineering",
      "location": "San Francisco"
    }
  }'
```

</details>

#### GET /users/:id

Retrieve a specific user by ID.

**Path Parameters:**
- `id` (string, required): User ID (e.g., `usr_abc123`)

**Example:**

```python
import requests

headers = {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
}

response = requests.get(
    'https://api.example.com/api/v1/users/usr_abc123',
    headers=headers
)

user = response.json()
print(f"User: {user['name']} ({user['email']})")
```

### Products API

Manage product catalog and inventory.

> **Note:** Products API documentation is available in a [separate guide](/api/products).

## Advanced Features

### Pagination

All list endpoints support cursor-based and offset pagination:

```mermaid
graph LR
    A[Client Request] --> B{Pagination Type}
    B -->|Offset| C[page & limit params]
    B -->|Cursor| D[cursor param]
    C --> E[SQL OFFSET/LIMIT]
    D --> F[Indexed cursor lookup]
    E --> G[Response with links]
    F --> G
```

### Filtering

Use our powerful filter syntax:

```
# Simple equality
filter=status:active

# Multiple conditions (AND)
filter=status:active,role:admin

# OR conditions
filter=status:active|status:pending

# Comparison operators
filter=created_at:>2025-01-01,age:<30

# Pattern matching
filter=email:~*@example.com
```

### Rate Limiting

API rate limits per tier:

| Tier | Requests/Minute | Burst | Daily Limit |
|------|----------------|-------|-------------|
| **Free** | 60 | 100 | 10,000 |
| **Basic** | 300 | 500 | 100,000 |
| **Pro** | 1,000 | 2,000 | 1,000,000 |
| **Enterprise** | Custom | Custom | Unlimited |

Rate limit headers in responses:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704567890
X-RateLimit-Retry-After: 42
```

## Error Handling

### HTTP Status Codes

| Code | Status | Description |
|------|--------|-------------|
| `200` | OK | Request successful |
| `201` | Created | Resource created |
| `204` | No Content | Request successful, no body |
| `400` | Bad Request | Invalid request format |
| `401` | Unauthorized | Missing or invalid auth |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Resource conflict |
| `422` | Unprocessable | Validation errors |
| `429` | Too Many Requests | Rate limited |
| `500` | Server Error | Internal error |
| `503` | Service Unavailable | Temporary outage |

### Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "issue": "Invalid email format",
        "value": "not-an-email"
      }
    ],
    "request_id": "req_xyz789",
    "documentation": "https://docs.example.com/errors/VALIDATION_ERROR"
  }
}
```

## Code Examples

### Node.js SDK

```javascript
const ApiClient = require('@example/api-sdk');

const client = new ApiClient({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: 'http://localhost:3000/callback'
});

// Async/await pattern
async function getUsers() {
  try {
    const users = await client.users.list({
      page: 1,
      limit: 20,
      sort: 'created_at'
    });
    
    console.log(`Found ${users.total} users`);
    users.data.forEach(user => {
      console.log(`- ${user.name} (${user.email})`);
    });
  } catch (error) {
    console.error('API Error:', error.message);
    if (error.code === 'RATE_LIMITED') {
      console.log(`Retry after ${error.retryAfter} seconds`);
    }
  }
}
```

### Python SDK

```python
from example_api import Client
from example_api.exceptions import RateLimitError
import os

client = Client(
    client_id=os.environ['CLIENT_ID'],
    client_secret=os.environ['CLIENT_SECRET']
)

try:
    # Get users with filtering
    users = client.users.list(
        filter={'role': 'admin', 'status': 'active'},
        sort='name',
        limit=50
    )
    
    for user in users:
        print(f"{user.name} - {user.email}")
        
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after} seconds")
except Exception as e:
    print(f"Error: {e}")
```

### cURL Examples

<details>
<summary>Show More Examples</summary>

```bash
# Get user with specific ID
curl -X GET "https://api.example.com/api/v1/users/usr_abc123" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update user
curl -X PATCH "https://api.example.com/api/v1/users/usr_abc123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'

# Delete user
curl -X DELETE "https://api.example.com/api/v1/users/usr_abc123" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search users
curl -X GET "https://api.example.com/api/v1/users/search?q=john" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

</details>

## Related Resources

### Internal Documentation
- [OpenAPI Specification](/specs/openapi.yaml)
- [GraphQL Schema](/specs/graphql.sdl)
- [Webhook Events](/guides/webhooks)
- [Migration Guide v1 → v2](/guides/migration-v2)

### External Resources
- [Postman Collection](https://www.postman.com/example-api/workspace)
- [Status Page](https://status.example.com)
- [Developer Forum](https://forum.example.com/developers)
- [GitHub Examples](https://github.com/example/api-examples)

### SDKs & Libraries
- [Node.js SDK](https://npmjs.com/package/@example/api-sdk)
- [Python SDK](https://pypi.org/project/example-api/)
- [Ruby Gem](https://rubygems.org/gems/example-api)
- [Go Module](https://pkg.go.dev/github.com/example/go-sdk)

---

**Document Version:** 2.1.0  
**Last Updated:** 2025-01-06  
**API Version:** v1  
**Changelog:** [View all changes](/changelog)

*Found an issue? [Report it on GitHub](https://github.com/example/api-docs/issues)*