import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { executeCreateDocumentPipeline } from '../create/pipeline.js';
import { getGlobalSessionStore } from '../../session/session-store.js';
import type { SessionState } from '../../session/types.js';
import { createDocumentManager } from '../../shared/utilities.js';
import type { DocumentManager } from '../../document-manager.js';

describe('create_document self-reference bug', () => {
  let sessionState: SessionState;
  let sessionId: string;
  let manager: DocumentManager;
  let tempDir: string;

  beforeEach(async () => {
    // Set MCP_WORKSPACE_PATH for config loading
    process.env["MCP_WORKSPACE_PATH"] = process.env["MCP_WORKSPACE_PATH"] ?? "/tmp/test-workspace";

    // Create temporary directory for test documents
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-doc-self-ref-test-'));

    // Configure MCP_WORKSPACE_PATH for config loading
    process.env["MCP_WORKSPACE_PATH"] = tempDir;

    // Create a unique session for each test
    sessionId = `test-session-${Date.now()}-${Math.random()}`;
    sessionState = {
      sessionId,
      createDocumentStage: 0
    };

    // Create DocumentManager with temp directory for dependency injection
    manager = createDocumentManager(tempDir);

    // Clear session state
    const sessionStore = getGlobalSessionStore();
    sessionStore.reset(sessionId);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }
  });

  it('should NOT include newly created document in its own suggestions', async () => {
    // Create a document
    const args = {
      namespace: 'api/specs',
      title: 'Test Self Reference API',
      overview: 'Test document that should not suggest itself'
    };

    const result = await executeCreateDocumentPipeline(args, sessionState, manager);

    // Verify creation succeeded
    expect(result).toHaveProperty('stage', 'creation');
    expect(result).toHaveProperty('success', true);

    // Extract created document path
    const creationResult = result as {
      stage: string;
      success: boolean;
      created: string;
      suggestions?: {
        related_documents?: Array<{ path: string; title: string; relevance: number }>;
      };
    };

    const createdPath = creationResult.created;

    // Check if suggestions exist
    if (creationResult.suggestions?.related_documents != null) {
      const relatedDocs = creationResult.suggestions.related_documents;

      // The bug: document suggests itself with relevance 1.0
      // After fix: document should NOT appear in its own suggestions
      const selfReference = relatedDocs.find(doc => doc.path === createdPath);

      expect(selfReference).toBeUndefined(); // SHOULD NOT FIND ITSELF
    }
    // If no suggestions, test passes (no self-reference possible)
  });

  it('should exclude current document even with high keyword overlap', async () => {
    // Create first document
    const args1 = {
      namespace: 'api/specs',
      title: 'Authentication API',
      overview: 'Complete authentication API documentation with OAuth2 and JWT support'
    };

    const firstResult = await executeCreateDocumentPipeline(args1, sessionState, manager);
    expect(firstResult).toHaveProperty('stage', 'creation');

    // Create second document with very similar keywords
    const args2 = {
      namespace: 'api/specs',
      title: 'Authentication Helper API',
      overview: 'Authentication helper utilities for OAuth2 and JWT authentication support'
    };

    const result = await executeCreateDocumentPipeline(args2, sessionState, manager);

    // Verify creation succeeded
    expect(result).toHaveProperty('stage', 'creation');
    expect(result).toHaveProperty('success', true);

    const creationResult = result as {
      stage: string;
      success: boolean;
      created: string;
      suggestions?: {
        related_documents?: Array<{ path: string; title: string; relevance: number }>;
      };
    };

    const createdPath = creationResult.created;

    // Check suggestions - the key test is that it doesn't suggest itself
    if (creationResult.suggestions?.related_documents != null) {
      const relatedDocs = creationResult.suggestions.related_documents;

      // Should NOT suggest itself (the second document) - THIS IS THE CRITICAL TEST
      const selfReference = relatedDocs.find(doc => doc.path === createdPath);
      expect(selfReference).toBeUndefined(); // SHOULD NOT find itself

      // If it found related docs, verify first doc might be there (but don't require it)
      // This is optional since suggestion algorithm might not always return all matches
      if (relatedDocs.length > 0) {
        // At least verify none of them are the current document
        relatedDocs.forEach(doc => {
          expect(doc.path).not.toBe(createdPath);
        });
      }
    }
  });

  it('should handle single document without self-reference', async () => {
    // Create single document - should get no suggestions or empty suggestions, but never self-reference
    const args = {
      namespace: 'api/specs',
      title: 'Isolated Document',
      overview: 'Document with unique keywords that should not match anything'
    };

    const result = await executeCreateDocumentPipeline(args, sessionState, manager);

    // Check result - it should either succeed or fail, but never suggest itself
    if ('stage' in result && result.stage === 'creation') {
      const creationResult = result as {
        stage: string;
        success: boolean;
        created: string;
        suggestions?: {
          related_documents?: Array<{ path: string; title: string }>;
        };
      };

      // Should have either no suggestions or empty array, but NEVER self-reference
      if (creationResult.suggestions?.related_documents != null) {
        const relatedDocs = creationResult.suggestions.related_documents;
        const createdPath = creationResult.created;

        const selfReference = relatedDocs.find(doc => doc.path === createdPath);
        expect(selfReference).toBeUndefined();
      }
    }
    // If creation fails, that's fine for this test - we're just ensuring no self-reference when it succeeds
  });
});
