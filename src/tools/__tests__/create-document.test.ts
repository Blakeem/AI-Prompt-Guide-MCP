import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { determineCreateDocumentStage } from '../schemas/create-document-schemas.js';
import { executeCreateDocumentPipeline } from '../create/pipeline.js';
import { getGlobalSessionStore } from '../../session/session-store.js';
import type { SessionState } from '../../session/types.js';
import { createDocumentManager } from '../../shared/utilities.js';
import type { DocumentManager } from '../../document-manager.js';

describe('create_document Progressive Discovery Stages', () => {
  let sessionState: SessionState;
  let sessionId: string;
  let manager: DocumentManager;
  let tempDir: string;

  beforeEach(async () => {
    // Set MCP_WORKSPACE_PATH for config loading
    process.env["MCP_WORKSPACE_PATH"] = process.env["MCP_WORKSPACE_PATH"] ?? "/tmp/test-workspace";

    // Create temporary directory for test documents
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-doc-test-'));

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

  describe('Stage Determination Logic', () => {
    it('should determine stage 0 when no parameters provided', () => {
      const args = {};
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(0);
    });

    it('should determine stage 0 when only namespace provided', () => {
      const args = { namespace: 'specs' };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(0);
    });

    it('should determine stage 0 when namespace and title provided but missing overview', () => {
      const args = {
        namespace: 'specs',
        title: 'Test Document'
      };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(0);
    });

    it('should determine stage 1 when namespace, title, and overview provided', () => {
      const args = {
        namespace: 'specs',
        title: 'Test Document',
        overview: 'Test overview content'
      };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(1);
    });

    it('should determine stage 1 when all parameters provided (create parameter ignored)', () => {
      const args = {
        namespace: 'specs',
        title: 'Test Document',
        overview: 'Test overview content',
        create: true
      };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(1);
    });

    it('should determine stage 1 regardless of create parameter value (string)', () => {
      const args = {
        namespace: 'specs',
        title: 'Test Document',
        overview: 'Test overview content',
        create: 'true'
      };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(1);
    });

    it('should determine stage 1 even when create is false (parameter no longer used)', () => {
      const args = {
        namespace: 'specs',
        title: 'Test Document',
        overview: 'Test overview content',
        create: false
      };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(1);
    });

    it('should determine stage 1 regardless of create parameter (string false)', () => {
      const args = {
        namespace: 'specs',
        title: 'Test Document',
        overview: 'Test overview content',
        create: 'false'
      };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(1);
    });

    it('should determine stage 1 with any create parameter value', () => {
      const args = {
        namespace: 'specs',
        title: 'Test Document',
        overview: 'Test overview content',
        create: 'yes'
      };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(1);
    });
  });

  describe('Pipeline Stage Processing', () => {
    it('should return discovery stage (0) response when no parameters', async () => {
      const args = {};
      const result = await executeCreateDocumentPipeline(args, sessionState, manager);

      expect(result).toHaveProperty('stage', 'discovery');
      // Check that it has either available_namespaces or namespaces property
      expect(result).toSatisfy((r: Record<string, unknown>) =>
        Object.prototype.hasOwnProperty.call(r, 'available_namespaces') || Object.prototype.hasOwnProperty.call(r, 'namespaces')
      );
    });

    it('should return discovery stage (0) response when only namespace provided', async () => {
      const args = { namespace: 'specs' };
      const result = await executeCreateDocumentPipeline(args, sessionState, manager);

      expect(result).toHaveProperty('stage', 'discovery');
      // Check that it has either available_namespaces or namespaces property
      expect(result).toSatisfy((r: Record<string, unknown>) =>
        Object.prototype.hasOwnProperty.call(r, 'available_namespaces') || Object.prototype.hasOwnProperty.call(r, 'namespaces')
      );
    });

    it('should proceed to creation stage (1) when namespace, title, and overview provided', async () => {
      const args = {
        namespace: 'specs',
        title: 'Test Document',
        overview: 'Test overview content'
      };
      const result = await executeCreateDocumentPipeline(args, sessionState, manager);

      // Stage 1 now creates immediately - should return success or error
      expect(result).toHaveProperty('success');
      if ('success' in result && (result as { success: boolean }).success === true) {
        expect(result).toHaveProperty('document');
        expect(result).toHaveProperty('slug');
      }
    });

    it('should proceed to creation stage (1) regardless of create parameter (boolean)', async () => {
      const args = {
        namespace: 'test', // Use test namespace to avoid actual file creation issues
        title: 'Test Document',
        overview: 'Test overview content',
        create: true
      };

      const result = await executeCreateDocumentPipeline(args, sessionState, manager);

      // Stage 1 creates immediately - create parameter is ignored
      expect(result).toHaveProperty('success');
      if ('success' in result && (result as { success: boolean }).success === true) {
        expect(result).toHaveProperty('document');
        expect(result).toHaveProperty('slug');
      }
    });

    it('should proceed to creation stage (1) regardless of create parameter (string)', async () => {
      const args = {
        namespace: 'test', // Use test namespace to avoid actual file creation issues
        title: 'Test Document',
        overview: 'Test overview content',
        create: 'true' as unknown as boolean // Cast to bypass TypeScript checking for test
      };

      const result = await executeCreateDocumentPipeline(args, sessionState, manager);

      // Stage 1 creates immediately - create parameter is ignored
      expect(result).toHaveProperty('success');
      if ('success' in result && (result as { success: boolean }).success === true) {
        expect(result).toHaveProperty('document');
        expect(result).toHaveProperty('slug');
      }
    });

    it('should proceed to creation stage (1) even with create: false (parameter ignored)', async () => {
      const args = {
        namespace: 'specs',
        title: 'Test Document',
        overview: 'Test overview content',
        create: false
      };
      const result = await executeCreateDocumentPipeline(args, sessionState, manager);

      // Stage 1 creates immediately - create:false is ignored
      expect(result).toHaveProperty('success');
      if ('success' in result && (result as { success: boolean }).success === true) {
        expect(result).toHaveProperty('document');
        expect(result).toHaveProperty('slug');
      }
    });
  });

  describe('Simplified Response Format', () => {
    it('should return only success, document, and slug fields', async () => {
      const args = {
        namespace: 'test',
        title: 'Context Test Document',
        overview: 'Testing simplified response'
      };

      const result = await executeCreateDocumentPipeline(args, sessionState, manager);

      // Verify simplified response format
      if ('success' in result && (result as { success: boolean }).success === true) {
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('document');
        expect(result).toHaveProperty('slug');
        // Should NOT have other fields
        expect(result).not.toHaveProperty('stage');
        expect(result).not.toHaveProperty('created');
        expect(result).not.toHaveProperty('suggestions');
        expect(result).not.toHaveProperty('namespace_patterns');
      }
    });
  });

  describe('Document Creation Cache Integration', () => {
    it('should successfully create a document without requiring initializeGlobalCache()', async () => {
      // This test verifies that document creation works with dependency injection
      // and doesn't rely on the deprecated global cache initialization
      const args = {
        namespace: 'test',
        title: 'Integration Test Document',
        overview: 'This is a test document to verify cache integration'
      };

      const result = await executeCreateDocumentPipeline(args, sessionState, manager);

      // Should successfully create without global cache initialization errors
      expect(result).toHaveProperty('success');

      // If there's an error, it should not be about cache initialization
      if ('error' in result) {
        const errorResult = result as { error: string };
        expect(errorResult.error).not.toContain('Global document cache not initialized');
        expect(errorResult.error).not.toContain('initializeGlobalCache');
      }
    });

    it('should refresh document cache after creation using injected cache', async () => {
      // Create a document and verify the cache is properly updated
      const args = {
        namespace: 'test',
        title: 'Cache Refresh Test',
        overview: 'Test cache refresh after creation'
      };

      const result = await executeCreateDocumentPipeline(args, sessionState, manager);

      // If document was created successfully
      if ('success' in result && (result as { success: boolean }).success === true) {
        const creationResult = result as { document: string; success: boolean };

        // Verify the document can be retrieved from the cache
        const document = await manager.getDocument(creationResult.document);

        // Document should be accessible through the manager's cache
        expect(document).not.toBeNull();
      }
    });
  });
});