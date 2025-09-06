# API Documentation

This is the main API documentation for our service.

## Overview

The API provides REST endpoints for managing resources. All endpoints require authentication and return JSON responses.

### Authentication

Use Bearer tokens in the Authorization header:

```http
Authorization: Bearer YOUR_TOKEN_HERE
```

## Endpoints

The following endpoints are available:

### Users

Manage user accounts and profiles.

#### GET /users

Returns a list of all users.

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    }
  ]
}
```

#### POST /users

Creates a new user account.

**Request:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com"
}
```

### Products

Manage product catalog.

#### GET /products

Returns a list of products with optional filtering.

**Query Parameters:**
- `category`: Filter by product category
- `limit`: Maximum number of results (default: 20)
- `offset`: Pagination offset (default: 0)

#### POST /products

Creates a new product.

**Request:**
```json
{
  "name": "Widget",
  "category": "electronics",
  "price": 29.99
}
```

## Error Handling

The API returns standard HTTP status codes and error messages in JSON format.

**Error Response Format:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  }
}
```

### Common Error Codes

- `400`: Bad Request - Invalid input
- `401`: Unauthorized - Authentication required
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource not found
- `500`: Internal Server Error - Server error

## Rate Limiting

API requests are limited to prevent abuse:

- 100 requests per minute for standard users
- 1000 requests per minute for premium users

Rate limit information is included in response headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```