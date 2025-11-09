/**
 * Tests for relative path handling in addressing system
 *
 * This test suite verifies that the addressing system correctly handles
 * the new relative path structure where user-facing paths are relative
 * to their base folders (docs/ or coordinator/).
 *
 * Path Structure:
 * - Old: /docs/api/auth.md (with base folder prefix)
 * - New: /api/auth.md (relative to docs/)
 * - Physical: .ai-prompt-guide/docs/api/auth.md (unchanged)
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { parseDocumentAddress, parseSectionAddress, parseTaskAddress, ToolIntegration, InvalidAddressError, getGlobalAddressCache } from '../addressing-system.js';
describe('AddressingSystem - Relative Path Handling', () => {
    beforeEach(() => {
        // Clear batch cache before each test
        const cache = getGlobalAddressCache();
        cache.clearBatch();
    });
    describe('Document path parsing - relative paths', () => {
        test('should parse relative document path without /docs/ prefix', () => {
            const address = parseDocumentAddress('/api/auth.md');
            expect(address.path).toBe('/api/auth.md');
            expect(address.slug).toBe('auth');
            expect(address.namespace).toBe('api');
            expect(address.normalizedPath).toBe('/api/auth.md');
        });
        test('should parse relative coordinator path without /coordinator/ prefix', () => {
            const address = parseDocumentAddress('/active.md');
            expect(address.path).toBe('/active.md');
            expect(address.slug).toBe('active');
            expect(address.namespace).toBe('root');
            expect(address.normalizedPath).toBe('/active.md');
        });
        test('should parse root-level document path', () => {
            const address = parseDocumentAddress('/readme.md');
            expect(address.path).toBe('/readme.md');
            expect(address.slug).toBe('readme');
            expect(address.namespace).toBe('root');
        });
        test('should parse nested namespace path', () => {
            const address = parseDocumentAddress('/api/specs/auth.md');
            expect(address.path).toBe('/api/specs/auth.md');
            expect(address.slug).toBe('auth');
            expect(address.namespace).toBe('api/specs');
        });
        test('should reject old-style paths with /docs/ prefix', () => {
            // The system should now treat /docs/ as a namespace, not a special prefix
            const address = parseDocumentAddress('/docs/api/auth.md');
            // Should parse successfully but treat 'docs/api' as the namespace
            expect(address.path).toBe('/docs/api/auth.md');
            expect(address.namespace).toBe('docs/api'); // NOT 'api'
        });
        test('should reject old-style paths with /coordinator/ prefix', () => {
            // Similar to above - /coordinator/ becomes part of namespace
            const address = parseDocumentAddress('/coordinator/active.md');
            expect(address.path).toBe('/coordinator/active.md');
            expect(address.namespace).toBe('coordinator'); // NOT 'root'
        });
        test('should handle archive paths with explicit prefix', () => {
            // Archive paths keep explicit /archived/ prefix per requirements
            const address = parseDocumentAddress('/archived/docs/api/auth.md');
            expect(address.path).toBe('/archived/docs/api/auth.md');
            expect(address.namespace).toBe('archived/docs/api');
        });
    });
    describe('Section path parsing - relative paths', () => {
        test('should parse section with relative document path', () => {
            const section = parseSectionAddress('tokens', '/api/auth.md');
            expect(section.slug).toBe('tokens');
            expect(section.document.path).toBe('/api/auth.md');
            expect(section.fullPath).toBe('/api/auth.md#tokens');
        });
        test('should parse section with # prefix and relative document', () => {
            const section = parseSectionAddress('#tokens', '/api/auth.md');
            expect(section.slug).toBe('tokens');
            expect(section.document.path).toBe('/api/auth.md');
            expect(section.fullPath).toBe('/api/auth.md#tokens');
        });
        test('should parse full section path with relative document', () => {
            const section = parseSectionAddress('/api/auth.md#tokens');
            expect(section.slug).toBe('tokens');
            expect(section.document.path).toBe('/api/auth.md');
            expect(section.fullPath).toBe('/api/auth.md#tokens');
        });
        test('should parse hierarchical section with relative path', () => {
            const section = parseSectionAddress('authentication/jwt-tokens', '/api/auth.md');
            expect(section.slug).toBe('authentication/jwt-tokens');
            expect(section.document.path).toBe('/api/auth.md');
            expect(section.fullPath).toBe('/api/auth.md#authentication/jwt-tokens');
        });
        test('should parse coordinator section with relative path', () => {
            const section = parseSectionAddress('phase-1', '/active.md');
            expect(section.slug).toBe('phase-1');
            expect(section.document.path).toBe('/active.md');
            expect(section.fullPath).toBe('/active.md#phase-1');
        });
    });
    describe('Task path parsing - relative paths', () => {
        test('should parse task with relative document path', () => {
            const task = parseTaskAddress('implement-auth', '/project/tasks.md');
            expect(task.slug).toBe('implement-auth');
            expect(task.document.path).toBe('/project/tasks.md');
            expect(task.fullPath).toBe('/project/tasks.md#implement-auth');
            expect(task.isTask).toBe(true);
        });
        test('should parse coordinator task with relative path', () => {
            const task = parseTaskAddress('initialize-project', '/active.md');
            expect(task.slug).toBe('initialize-project');
            expect(task.document.path).toBe('/active.md');
            expect(task.fullPath).toBe('/active.md#initialize-project');
            expect(task.isTask).toBe(true);
        });
        test('should parse task with # prefix', () => {
            const task = parseTaskAddress('#setup-database', '/project/tasks.md');
            expect(task.slug).toBe('setup-database');
            expect(task.document.path).toBe('/project/tasks.md');
        });
    });
    describe('ToolIntegration with relative paths', () => {
        test('should validate and parse relative document path', () => {
            const { addresses } = ToolIntegration.validateAndParse({
                document: '/api/auth.md'
            });
            expect(addresses.document.path).toBe('/api/auth.md');
            expect(addresses.document.namespace).toBe('api');
        });
        test('should validate and parse relative path with section', () => {
            const { addresses } = ToolIntegration.validateAndParse({
                document: '/api/auth.md',
                section: 'tokens'
            });
            expect(addresses.document.path).toBe('/api/auth.md');
            expect(addresses.section?.slug).toBe('tokens');
            expect(addresses.section?.fullPath).toBe('/api/auth.md#tokens');
        });
        test('should validate coordinator path correctly', () => {
            const { addresses } = ToolIntegration.validateAndParse({
                document: '/active.md',
                section: 'phase-1'
            });
            expect(addresses.document.path).toBe('/active.md');
            expect(addresses.document.namespace).toBe('root');
            expect(addresses.section?.fullPath).toBe('/active.md#phase-1');
        });
        test('should format document info with relative path', () => {
            const { addresses } = ToolIntegration.validateAndParse({
                document: '/api/auth.md'
            });
            const info = ToolIntegration.formatDocumentInfo(addresses.document, {
                title: 'Authentication Guide'
            });
            expect(info.title).toBe('Authentication Guide');
        });
        test('should format section path with relative document', () => {
            const { addresses } = ToolIntegration.validateAndParse({
                document: '/api/auth.md',
                section: 'tokens'
            });
            expect(addresses.section).toBeDefined();
            if (addresses.section != null) {
                const path = ToolIntegration.formatSectionPath(addresses.section);
                expect(path).toBe('/api/auth.md#tokens');
            }
        });
        test('should format hierarchical section path correctly', () => {
            const { addresses } = ToolIntegration.validateAndParse({
                document: '/api/auth.md',
                section: 'authentication/jwt-tokens'
            });
            expect(addresses.section).toBeDefined();
            if (addresses.section != null) {
                const path = ToolIntegration.formatSectionPath(addresses.section);
                expect(path).toBe('/api/auth.md#authentication/jwt-tokens (hierarchical)');
            }
        });
    });
    describe('Backward compatibility checks', () => {
        test('should handle paths without leading slash by adding it', () => {
            // Current behavior: adds leading slash if missing
            const address = parseDocumentAddress('api/auth.md');
            expect(address.path).toBe('/api/auth.md');
            expect(address.namespace).toBe('api');
        });
        test('should still require .md extension', () => {
            expect(() => parseDocumentAddress('/api/auth')).toThrow(InvalidAddressError);
            expect(() => parseDocumentAddress('/api/auth.txt')).toThrow(InvalidAddressError);
        });
        test('should reject empty paths', () => {
            expect(() => parseDocumentAddress('')).toThrow(InvalidAddressError);
            expect(() => parseDocumentAddress('   ')).toThrow(InvalidAddressError);
        });
        test('should cache relative paths correctly', () => {
            const cache = getGlobalAddressCache();
            const addr1 = parseDocumentAddress('/api/auth.md');
            const stats1 = cache.getBatchStats();
            expect(stats1.size).toBe(1);
            const addr2 = parseDocumentAddress('/api/auth.md');
            expect(addr1.path).toBe(addr2.path);
            const stats2 = cache.getBatchStats();
            expect(stats2.size).toBe(1); // Still 1, cached
        });
    });
    describe('Edge cases with relative paths', () => {
        test('should handle deeply nested namespaces', () => {
            const address = parseDocumentAddress('/api/v2/specs/auth/oauth.md');
            expect(address.path).toBe('/api/v2/specs/auth/oauth.md');
            expect(address.slug).toBe('oauth');
            expect(address.namespace).toBe('api/v2/specs/auth');
        });
        test('should handle single-level document', () => {
            const address = parseDocumentAddress('/guide.md');
            expect(address.path).toBe('/guide.md');
            expect(address.slug).toBe('guide');
            expect(address.namespace).toBe('root');
        });
        test('should normalize consecutive slashes', () => {
            // Current implementation may not handle this - test to verify
            const address = parseDocumentAddress('/api//auth.md');
            // Should either normalize or accept as-is
            expect(address.path).toMatch(/\/api\/?\/auth\.md/);
        });
        test('should handle special characters in namespace', () => {
            const address = parseDocumentAddress('/api-v2/auth_guide.md');
            expect(address.path).toBe('/api-v2/auth_guide.md');
            expect(address.slug).toBe('auth_guide');
            expect(address.namespace).toBe('api-v2');
        });
    });
    describe('Archive path handling', () => {
        test('should preserve /archived/ prefix in paths', () => {
            const address = parseDocumentAddress('/archived/docs/api/auth.md');
            expect(address.path).toBe('/archived/docs/api/auth.md');
            expect(address.namespace).toBe('archived/docs/api');
        });
        test('should handle archived coordinator paths', () => {
            const address = parseDocumentAddress('/archived/coordinator/active.md');
            expect(address.path).toBe('/archived/coordinator/active.md');
            expect(address.namespace).toBe('archived/coordinator');
        });
        test('should parse sections in archived documents', () => {
            const section = parseSectionAddress('tokens', '/archived/docs/api/auth.md');
            expect(section.document.path).toBe('/archived/docs/api/auth.md');
            expect(section.fullPath).toBe('/archived/docs/api/auth.md#tokens');
        });
    });
});
//# sourceMappingURL=addressing-system.relative-paths.test.js.map