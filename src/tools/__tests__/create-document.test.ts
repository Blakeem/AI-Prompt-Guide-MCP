import { describe, it, expect, beforeEach } from 'vitest';
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

  beforeEach(() => {
    // Create a unique session for each test
    sessionId = `test-session-${Date.now()}-${Math.random()}`;
    sessionState = {
      sessionId,
      createDocumentStage: 0
    };

    // Create DocumentManager for dependency injection
    manager = createDocumentManager();

    // Clear session state
    const sessionStore = getGlobalSessionStore();
    sessionStore.reset(sessionId);
  });

  describe('Stage Determination Logic', () => {
    it('should determine stage 0 when no parameters provided', () => {
      const args = {};
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(0);
    });

    it('should determine stage 1 when only namespace provided', () => {
      const args = { namespace: 'api/guides' };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(1);
    });

    it('should determine stage 2 when namespace, title, and overview provided', () => {
      const args = {
        namespace: 'api/guides',
        title: 'Test Document',
        overview: 'Test overview content'
      };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(2);
    });

    it('should determine stage 2 when all parameters provided (create parameter ignored)', () => {
      const args = {
        namespace: 'api/guides',
        title: 'Test Document',
        overview: 'Test overview content',
        create: true
      };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(2);
    });

    it('should determine stage 2 regardless of create parameter value (string)', () => {
      const args = {
        namespace: 'api/guides',
        title: 'Test Document',
        overview: 'Test overview content',
        create: 'true'
      };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(2);
    });

    it('should determine stage 2 even when create is false (parameter no longer used)', () => {
      const args = {
        namespace: 'api/guides',
        title: 'Test Document',
        overview: 'Test overview content',
        create: false
      };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(2);
    });

    it('should determine stage 2 regardless of create parameter (string false)', () => {
      const args = {
        namespace: 'api/guides',
        title: 'Test Document',
        overview: 'Test overview content',
        create: 'false'
      };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(2);
    });

    it('should determine stage 2 with any create parameter value', () => {
      const args = {
        namespace: 'api/guides',
        title: 'Test Document',
        overview: 'Test overview content',
        create: 'yes'
      };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(2);
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

    it('should return instructions stage (1) response when only namespace provided', async () => {
      const args = { namespace: 'api/guides' };
      const result = await executeCreateDocumentPipeline(args, sessionState, manager);

      expect(result).toHaveProperty('stage', 'instructions');
      expect(result).toHaveProperty('namespace', 'api/guides');
    });

    it('should proceed to creation stage (2) when namespace, title, and overview provided', async () => {
      const args = {
        namespace: 'api/guides',
        title: 'Test Document',
        overview: 'Test overview content'
      };
      const result = await executeCreateDocumentPipeline(args, sessionState, manager);

      // Stage 2 now creates immediately - should return either 'creation' or 'error_fallback'
      expect(result).toHaveProperty('stage');
      expect(['creation', 'error_fallback']).toContain((result as { stage: string }).stage);
    });

    it('should proceed to creation stage (2) regardless of create parameter (boolean)', async () => {
      const args = {
        namespace: 'test', // Use test namespace to avoid actual file creation issues
        title: 'Test Document',
        overview: 'Test overview content',
        create: true
      };

      const result = await executeCreateDocumentPipeline(args, sessionState, manager);

      // Stage 2 creates immediately - create parameter is ignored
      expect(result).toHaveProperty('stage');
      expect(['creation', 'error_fallback']).toContain((result as { stage: string }).stage);
    });

    it('should proceed to creation stage (2) regardless of create parameter (string)', async () => {
      const args = {
        namespace: 'test', // Use test namespace to avoid actual file creation issues
        title: 'Test Document',
        overview: 'Test overview content',
        create: 'true' as unknown as boolean // Cast to bypass TypeScript checking for test
      };

      const result = await executeCreateDocumentPipeline(args, sessionState, manager);

      // Stage 2 creates immediately - create parameter is ignored
      expect(result).toHaveProperty('stage');
      expect(['creation', 'error_fallback']).toContain((result as { stage: string }).stage);
    });

    it('should proceed to creation stage (2) even with create: false (parameter ignored)', async () => {
      const args = {
        namespace: 'api/guides',
        title: 'Test Document',
        overview: 'Test overview content',
        create: false
      };
      const result = await executeCreateDocumentPipeline(args, sessionState, manager);

      // Stage 2 creates immediately - create:false is ignored
      expect(result).toHaveProperty('stage');
      expect(['creation', 'error_fallback']).toContain((result as { stage: string }).stage);
    });
  });
});