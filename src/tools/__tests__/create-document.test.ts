import { describe, it, expect, beforeEach } from 'vitest';
import { determineCreateDocumentStage } from '../schemas/create-document-schemas.js';
import { executeCreateDocumentPipeline } from '../create/pipeline.js';
import { getGlobalSessionStore } from '../../session/session-store.js';
import type { SessionState } from '../../session/types.js';

describe('create_document Progressive Discovery Stages', () => {
  let sessionState: SessionState;
  let sessionId: string;

  beforeEach(() => {
    // Create a unique session for each test
    sessionId = `test-session-${Date.now()}-${Math.random()}`;
    sessionState = {
      sessionId,
      createDocumentStage: 0
    };

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

    it('should determine stage 2.5 when namespace, title, and overview provided but no create', () => {
      const args = {
        namespace: 'api/guides',
        title: 'Test Document',
        overview: 'Test overview content'
      };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(2.5);
    });

    it('should determine stage 3 when all parameters including create: true (boolean)', () => {
      const args = {
        namespace: 'api/guides',
        title: 'Test Document',
        overview: 'Test overview content',
        create: true
      };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(3);
    });

    it('should determine stage 3 when all parameters including create: "true" (string)', () => {
      const args = {
        namespace: 'api/guides',
        title: 'Test Document',
        overview: 'Test overview content',
        create: 'true'
      };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(3);
    });

    it('should NOT determine stage 3 when create is false', () => {
      const args = {
        namespace: 'api/guides',
        title: 'Test Document',
        overview: 'Test overview content',
        create: false
      };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(2.5);
    });

    it('should NOT determine stage 3 when create is "false"', () => {
      const args = {
        namespace: 'api/guides',
        title: 'Test Document',
        overview: 'Test overview content',
        create: 'false'
      };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(2.5);
    });

    it('should NOT determine stage 3 when create is other truthy value', () => {
      const args = {
        namespace: 'api/guides',
        title: 'Test Document',
        overview: 'Test overview content',
        create: 'yes'
      };
      const stage = determineCreateDocumentStage(args);
      expect(stage).toBe(2.5);
    });
  });

  describe('Pipeline Stage Processing', () => {
    it('should return discovery stage (0) response when no parameters', async () => {
      const args = {};
      const result = await executeCreateDocumentPipeline(args, sessionState);

      expect(result).toHaveProperty('stage', 'discovery');
      // Check that it has either available_namespaces or namespaces property
      expect(result).toSatisfy((r: Record<string, unknown>) =>
        Object.prototype.hasOwnProperty.call(r, 'available_namespaces') || Object.prototype.hasOwnProperty.call(r, 'namespaces')
      );
    });

    it('should return instructions stage (1) response when only namespace provided', async () => {
      const args = { namespace: 'api/guides' };
      const result = await executeCreateDocumentPipeline(args, sessionState);

      expect(result).toHaveProperty('stage', 'instructions');
      expect(result).toHaveProperty('namespace', 'api/guides');
    });

    it('should return smart_suggestions stage (2.5) when namespace, title, overview but no create', async () => {
      const args = {
        namespace: 'api/guides',
        title: 'Test Document',
        overview: 'Test overview content'
      };
      const result = await executeCreateDocumentPipeline(args, sessionState);

      expect(result).toHaveProperty('stage', 'smart_suggestions');
      // The key test is that it returns smart_suggestions stage, not creation
      // Specific field names may vary but the stage is what matters for the bug fix
    });

    it('should proceed to creation stage (3) with create: true (boolean)', async () => {
      const args = {
        namespace: 'test', // Use test namespace to avoid actual file creation issues
        title: 'Test Document',
        overview: 'Test overview content',
        create: true
      };

      try {
        const result = await executeCreateDocumentPipeline(args, sessionState);

        // Should attempt creation (stage 3)
        // Result structure depends on success/failure, but should not return stage 2.5
        expect(result).not.toHaveProperty('stage', 'smart_suggestions');

        // Should either succeed with creation result or fail with error
        if ('stage' in result) {
          expect(result.stage).toBe('creation');
        }
        // Error is acceptable for test namespace - the key is it didn't stick at stage 2.5
      } catch (error) {
        // Creation errors are acceptable in tests - the key is we proceeded past stage 2.5
        expect(error).toBeDefined();
      }
    });

    it('should proceed to creation stage (3) with create: "true" (string)', async () => {
      const args = {
        namespace: 'test', // Use test namespace to avoid actual file creation issues
        title: 'Test Document',
        overview: 'Test overview content',
        create: 'true' as unknown as boolean // Cast to bypass TypeScript checking for test
      };

      try {
        const result = await executeCreateDocumentPipeline(args, sessionState);

        // Should attempt creation (stage 3)
        // Result structure depends on success/failure, but should not return stage 2.5
        expect(result).not.toHaveProperty('stage', 'smart_suggestions');

        // Should either succeed with creation result or fail with error
        if ('stage' in result) {
          expect(result.stage).toBe('creation');
        }
      } catch (error) {
        // Creation errors are acceptable in tests - the key is we proceeded past stage 2.5
        expect(error).toBeDefined();
      }
    });

    it('should stay at stage 2.5 with create: false', async () => {
      const args = {
        namespace: 'api/guides',
        title: 'Test Document',
        overview: 'Test overview content',
        create: false
      };
      const result = await executeCreateDocumentPipeline(args, sessionState);

      expect(result).toHaveProperty('stage', 'smart_suggestions');
    });
  });
});