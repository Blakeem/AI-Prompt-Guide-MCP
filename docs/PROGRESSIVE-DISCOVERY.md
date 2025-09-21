# Progressive Discovery Pattern for create_document Tool

## Overview

The `create_document` tool implements a progressive discovery pattern that reveals parameters gradually through a 3-stage flow. This allows LLMs to be guided through document creation while conserving context tokens.

## Architecture

### Centralized Schema Management

All schemas, examples, and document types are centralized in:
```
src/tools/schemas/create-document-schemas.ts
```

This file contains:
- **Schema definitions** for each stage (0, 1, 2)
- **Response examples** showing what each stage returns
- **Document type definitions** (api_spec, implementation_guide, etc.)
- **Helper functions** for stage management

### Session State Management

The system uses a **singleton SessionStore** to maintain state across tool calls:
```typescript
// src/session/session-store.ts
export function getGlobalSessionStore(): SessionStore
```

Each session tracks:
- `sessionId`: Unique identifier for the session
- `createDocumentStage`: Current stage (0, 1, or 2)

## Progressive Discovery Flow

### Stage 0: Discovery
**Schema:** Empty properties `{}`
**Response:** List of available document types
**Next:** Advances to Stage 1

### Stage 1: Instructions
**Schema:** `{ type: string }`
**Response:** Type-specific instructions and starter template
**Next:** Advances to Stage 2

### Stage 2: Creation
**Schema:** `{ type: string, title: string, overview: string }`
**Response:** Created document details and next actions
**Next:** Completes flow

## Tool List Updates

### Notification Mechanism

When the stage changes, the system sends a `notifications/tools/list_changed` notification:

```javascript
{
  method: "notifications/tools/list_changed",
  params: {}
}
```

**Important Notes:**
1. **Not all MCP clients respect this notification** - Many clients ignore it
2. **Manual refresh often required** - Users may need to manually refresh tool lists
3. **Works in MCP Inspector** - The web interface allows manual refresh
4. **LLMs may not see notifications** - The notification is at transport level, not in LLM context

### Dynamic Schema Generation

The tool list dynamically generates schemas based on session state:

```typescript
// src/tools/registry.ts
export function getVisibleTools(state: SessionState): ToolDefinition[] {
  const createDocumentSchema = getCreateDocumentSchema(state.createDocumentStage);
  // Returns schema for current stage
}
```

## Testing the Flow

### Using MCP Inspector

1. Start inspector: `pnpm inspector:dev`
2. Call `create_document` with `{}`
3. **Manually refresh** tool list (pull down or click refresh)
4. See updated schema with `type` parameter
5. Call with `{ type: "api_spec" }`
6. **Manually refresh** again
7. See full schema with all parameters

### Programmatic Testing

Use the test script: `node test-create-document-flow.cjs`

This script:
1. Calls tools/list to see initial schema
2. Calls create_document to advance stages
3. Calls tools/list again to verify updates

## Implementation Details

### Why Response Examples Matter

The response examples serve multiple purposes:
1. **Guide the user** through the next step
2. **Show valid parameter values** without exposing full schema
3. **Conserve context** by only showing relevant information
4. **Maintain consistency** between what's shown and what's accepted

### Schema vs Response Tradeoff

- **Schema**: Shows what parameters CAN be provided
- **Response**: Shows what parameters SHOULD be provided next
- **Balance**: We keep schema minimal but provide rich examples

### Session Persistence

The singleton pattern ensures:
- State persists across multiple tool calls
- Each session maintains independent progress
- Tool lists reflect current session state
- No cross-session interference

## Best Practices

1. **Always use centralized schemas** - Don't duplicate type definitions
2. **Keep examples synchronized** - Response examples should match schemas
3. **Test with manual refresh** - Don't assume notifications work
4. **Document the flow** - Make it clear what each stage expects
5. **Handle errors gracefully** - Provide helpful fallbacks, not errors

## Limitations

1. **Notification reliability** - Not all clients support list_changed
2. **Manual intervention** - Users must refresh tool lists manually
3. **Session-bound state** - Progress resets with new sessions
4. **Web interface only** - Progressive fields only visible in tools that show schemas

## Future Improvements

Potential enhancements could include:
- Persistent stage across sessions
- More granular stages for complex documents
- Template selection within stages
- Schema versioning for backward compatibility