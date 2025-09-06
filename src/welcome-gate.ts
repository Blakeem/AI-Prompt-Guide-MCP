/**
 * Welcome Gate implementation - demonstrates dynamic tool exposure
 * Tools are revealed only after acknowledging the welcome prompt
 */

// Using a custom error type that matches McpError structure

/**
 * Session state tracking for each connection
 */
export interface SessionState {
  hasAcknowledged: boolean;
  sessionId: string;
  acknowledgedAt?: Date;
}

/**
 * Manages per-session state
 */
export class SessionStore {
  private sessions = new Map<string, SessionState>();

  /**
   * Get or create session state
   */
  getSession(sessionId: string): SessionState {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        hasAcknowledged: false,
      });
    }
    return this.sessions.get(sessionId)!;
  }

  /**
   * Mark session as acknowledged
   */
  acknowledge(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    const wasAcknowledged = session.hasAcknowledged;
    session.hasAcknowledged = true;
    session.acknowledgedAt = new Date();
    return !wasAcknowledged; // Return true if this was the first acknowledgment
  }

  /**
   * Reset session (for testing)
   */
  reset(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Get all sessions (for debugging)
   */
  getAllSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }
}

/**
 * Tool definitions based on session state
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

/**
 * Get visible tools based on session state
 */
export function getVisibleTools(state: SessionState): ToolDefinition[] {
  const baseTools: ToolDefinition[] = [
    {
      name: 'acknowledge_setup',
      description: 'Acknowledge that you have read the welcome message and unlock additional tools',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  ];

  const gatedTools: ToolDefinition[] = [
    {
      name: 'test_tool',
      description: 'A test tool that is only available after acknowledging the welcome message',
      inputSchema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Optional message to echo back',
            default: 'Hello from the gated test tool!',
          },
        },
        additionalProperties: false,
      },
    },
  ];

  // Return all tools if acknowledged, otherwise just base tools
  return state.hasAcknowledged ? [...baseTools, ...gatedTools] : baseTools;
}

/**
 * Prompt definitions
 */
export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

/**
 * Get available prompts
 */
export function getVisiblePrompts(_state: SessionState): PromptDefinition[] {
  return [
    {
      name: 'welcome',
      description: 'Welcome message explaining the Spec-Docs MCP server and how to unlock tools',
      arguments: [],
    },
  ];
}

/**
 * Get prompt template content
 */
export function getPromptTemplate(name: string): string | null {
  if (name === 'welcome') {
    return `Welcome to Spec-Docs MCP Server!

This server provides powerful markdown CRUD operations for managing specification documents.

## Getting Started

1. **Current Status**: You're seeing a limited set of tools
2. **Unlock Tools**: Call the 'acknowledge_setup' tool to confirm you've read this
3. **After Acknowledgment**: Additional tools will become available, including:
   - test_tool (for testing the gate mechanism)
   - Future: Full markdown CRUD operations

## What This Server Does

Spec-Docs MCP enables:
- Structured markdown parsing with hierarchical heading analysis
- Section-based CRUD operations using slug addressing
- Safe concurrent editing with mtime precondition checking
- Automatic TOC generation and duplicate prevention

## Next Step

Call the 'acknowledge_setup' tool to unlock the full tool suite.`;
  }
  return null;
}

/**
 * Execute tool based on name and session state
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  state: SessionState,
  onListChanged?: () => void
): Promise<unknown> {
  switch (toolName) {
    case 'acknowledge_setup': {
      const firstTime = !state.hasAcknowledged;
      state.hasAcknowledged = true;
      state.acknowledgedAt = new Date();
      
      // Trigger list changed notifications if this is the first acknowledgment
      if (firstTime && onListChanged) {
        onListChanged();
      }
      
      return {
        success: true,
        message: firstTime 
          ? 'Welcome acknowledged! Additional tools are now available. Please refresh your tool list to see them.'
          : 'Already acknowledged. All tools remain available.',
        acknowledged: true,
        acknowledgedAt: state.acknowledgedAt.toISOString(),
      };
    }

    case 'test_tool': {
      // Check if tool is accessible
      if (!state.hasAcknowledged) {
        throw new Error(
          JSON.stringify({
            code: -32002,
            message: 'Tool not available',
            data: {
              reason: 'PRECONDITION_NOT_MET',
              details: "Please run the 'welcome' prompt and call 'acknowledge_setup' first to unlock this tool.",
            },
          })
        );
      }
      
      const message = (args['message'] as string) ?? 'Hello from the gated test tool!';
      return {
        success: true,
        message: `Gate passed! ${message}`,
        timestamp: new Date().toISOString(),
        sessionAcknowledged: state.acknowledgedAt?.toISOString(),
      };
    }

    default: {
      throw new Error(
        JSON.stringify({
          code: -32601,
          message: `Unknown tool: ${toolName}`,
        })
      );
    }
  }
}