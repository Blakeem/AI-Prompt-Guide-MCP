# Authentication API Specification

Complete specification for the authentication API including JWT tokens, OAuth flows, and session management.

## Table of Contents

## JWT Token Implementation

## API Endpoints

Authenticate user and receive tokens.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**

```json
{
  "access_token": "eyJhbG...",
  "refresh_token": "eyJhbG...",
  "expires_in": 900
}
```

Refresh access token using refresh token.

Invalidate current session and tokens.

## OAuth 2.0 Flows

Supported OAuth 2.0 authorization flows for third-party integrations.

Recommended for server-side applications.

1. Redirect user to authorization endpoint
2. User grants permission
3. Exchange authorization code for tokens
4. Use access token for API calls

For machine-to-machine authentication.

1. Client sends credentials to token endpoint
2. Receive access token
3. Use token for API calls

Our authentication system uses JSON Web Tokens (JWT) for stateless authentication.

* Header: Algorithm and token type
* Payload: User claims and metadata
* Signature: HMAC SHA256 signature

- Access tokens expire after 15 minutes
- Refresh tokens expire after 7 days
- Tokens are signed with RS256 algorithm

* Store tokens securely in httpOnly cookies
* Implement token rotation on refresh
* Validate token signatures on every request

## Tasks

Task list for this document.

### Implement JWT Token Generation

Implement the JWT token generation logic based on our specification.

* Status: completed
* Workflow: spec-first-integration

Create the token generation service that produces access and refresh tokens according to our security requirements.

@/docs/api/specs/authentication-api-specification.md#jwt-token-implementation
@/docs/api/specs/authentication-api-specification.md#api-endpoints

* Completed: 2025-10-14
* Note: Implemented JWT token generation service with RS256 signing. Created TokenService class that generates both access tokens (15min expiry) and refresh tokens (7 day expiry). Tokens include user claims and are signed with private key. Added comprehensive tests for token generation, validation, and expiration.

### Implement OAuth Authorization Flow

Implement the OAuth 2.0 authorization code flow for third-party integrations.

* Status: pending
* Workflow: spec-first-integration

Build the OAuth endpoints and authorization logic.

@/docs/api/specs/authentication-api-specification.md#oauth-20-flows

### Add Token Validation Middleware

Create middleware to validate JWT tokens on protected routes.

* Status: pending

Implement token signature verification and expiration checking.

@/docs/api/specs/authentication-api-specification.md#jwt-token-implementation
