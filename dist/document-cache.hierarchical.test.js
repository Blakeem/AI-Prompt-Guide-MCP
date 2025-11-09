import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { initializeGlobalCache } from './document-cache.js';
describe('Document Cache - Hierarchical Addressing', () => {
    let testDir;
    let cache;
    beforeAll(async () => {
        // Create temporary test directory
        testDir = path.join(process.cwd(), `.test-cache-hierarchical-${Date.now()}`);
        await fs.mkdir(testDir, { recursive: true });
        // Initialize document cache with test directory
        cache = initializeGlobalCache(testDir);
        // Create test document with hierarchical sections
        const testDocContent = `# Test Document

## Frontend

### Authentication

#### JWT Tokens

This is the JWT tokens section content.

#### OAuth Flow

This is the OAuth flow section content.

### Styling

#### CSS Guidelines

This is the CSS guidelines section content.

## Backend

### Authorization

#### JWT Implementation

This is the backend JWT implementation content.

## Root Auth

This is the root-level authentication section.
`;
        await fs.writeFile(path.join(testDir, 'test-hierarchical.md'), testDocContent);
    });
    afterAll(async () => {
        // Clean up cache
        try {
            await cache.destroy();
        }
        catch {
            // Ignore cleanup errors
        }
        // Clean up test directory
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        }
        catch {
            // Ignore cleanup errors
        }
    });
    beforeEach(async () => {
        // Clear cache between tests to ensure clean state
        cache.clear();
    });
    describe('getSectionContent with hierarchical paths', () => {
        test('should cache hierarchical section addresses', async () => {
            const docPath = '/test-hierarchical.md';
            // First call should load from file and cache
            const content = await cache.getSectionContent(docPath, 'frontend/authentication/jwt-tokens');
            expect(content).toContain('This is the JWT tokens section content.');
            expect(content).toContain('#### JWT Tokens');
            // Verify both hierarchical and flat keys are cached
            const document = await cache.getDocument(docPath);
            expect(document?.sections?.has('frontend/authentication/jwt-tokens')).toBe(true);
            expect(document?.sections?.has('jwt-tokens')).toBe(true);
        });
        test('should retrieve from cache using hierarchical keys', async () => {
            const docPath = '/test-hierarchical.md';
            // First call to populate cache
            await cache.getSectionContent(docPath, 'frontend/authentication/jwt-tokens');
            // Second call should use cache
            const cachedContent = await cache.getSectionContent(docPath, 'frontend/authentication/jwt-tokens');
            expect(cachedContent).toContain('This is the JWT tokens section content.');
            expect(cachedContent).toContain('#### JWT Tokens');
            // Verify cache was actually used by checking document sections
            const document = await cache.getDocument(docPath);
            expect(document?.sections?.has('frontend/authentication/jwt-tokens')).toBe(true);
        });
        test('should cache both hierarchical and flat keys for efficiency', async () => {
            const docPath = '/test-hierarchical.md';
            // Access via hierarchical path
            const hierarchicalContent = await cache.getSectionContent(docPath, 'frontend/authentication/jwt-tokens');
            // Access via flat path (should hit cache)
            const flatContent = await cache.getSectionContent(docPath, 'jwt-tokens');
            expect(hierarchicalContent).toBe(flatContent);
            expect(hierarchicalContent).toContain('This is the JWT tokens section content.');
            expect(hierarchicalContent).toContain('#### JWT Tokens');
            // Verify both cache entries exist
            const document = await cache.getDocument(docPath);
            expect(document?.sections?.has('frontend/authentication/jwt-tokens')).toBe(true);
            expect(document?.sections?.has('jwt-tokens')).toBe(true);
        });
        test('should handle cache invalidation for hierarchical keys', async () => {
            const docPath = '/test-hierarchical.md';
            // Populate cache
            await cache.getSectionContent(docPath, 'frontend/authentication/jwt-tokens');
            // Verify cache is populated
            let document = await cache.getDocument(docPath);
            expect(document?.sections?.has('frontend/authentication/jwt-tokens')).toBe(true);
            // Invalidate document
            const invalidated = cache.invalidateDocument(docPath);
            expect(invalidated).toBe(true);
            // Verify cache is cleared - getDocument reloads the document, sections map will be undefined until accessed again
            document = await cache.getDocument(docPath);
            expect(document?.sections?.size ?? 0).toBe(0);
        });
        test('should maintain cache performance with hierarchical lookups', async () => {
            const docPath = '/test-hierarchical.md';
            const startTime = performance.now();
            // Perform multiple hierarchical lookups
            for (let i = 0; i < 10; i++) {
                await cache.getSectionContent(docPath, 'frontend/authentication/jwt-tokens');
                await cache.getSectionContent(docPath, 'backend/authorization/jwt-implementation');
                await cache.getSectionContent(docPath, 'frontend/styling/css-guidelines');
            }
            const endTime = performance.now();
            const duration = endTime - startTime;
            // Performance should be reasonable (allowing for some overhead but not excessive)
            // This test ensures hierarchical caching doesn't cause major performance regression
            expect(duration).toBeLessThan(1000); // 1 second for 30 operations should be more than sufficient
        });
        test('should handle fallback from hierarchical to flat addressing', async () => {
            const docPath = '/test-hierarchical.md';
            // Try hierarchical path first
            const hierarchicalContent = await cache.getSectionContent(docPath, 'frontend/authentication/jwt-tokens');
            expect(hierarchicalContent).toContain('This is the JWT tokens section content.');
            // Try flat path (should work as fallback)
            const flatContent = await cache.getSectionContent(docPath, 'jwt-tokens');
            expect(flatContent).toContain('This is the JWT tokens section content.');
            // Both should return the same content
            expect(hierarchicalContent).toBe(flatContent);
        });
        test('should handle disambiguation in hierarchical paths', async () => {
            const docPath = '/test-hierarchical.md';
            // Test disambiguated hierarchical path
            const frontendAuth = await cache.getSectionContent(docPath, 'frontend/authentication/jwt-tokens');
            const backendAuth = await cache.getSectionContent(docPath, 'backend/authorization/jwt-implementation');
            const rootAuth = await cache.getSectionContent(docPath, 'root-auth'); // Root-level auth
            expect(frontendAuth).toContain('This is the JWT tokens section content.');
            expect(backendAuth).toContain('This is the backend JWT implementation content.');
            expect(rootAuth).toContain('This is the root-level authentication section.');
            // All should be different content
            expect(frontendAuth).not.toBe(backendAuth);
            expect(frontendAuth).not.toBe(rootAuth);
            expect(backendAuth).not.toBe(rootAuth);
        });
    });
    describe('cache key generation for hierarchical addresses', () => {
        test('should generate unique cache keys for hierarchical paths', async () => {
            const docPath = '/test-hierarchical.md';
            // Load different hierarchical sections
            await cache.getSectionContent(docPath, 'frontend/authentication/jwt-tokens');
            await cache.getSectionContent(docPath, 'backend/authorization/jwt-implementation');
            await cache.getSectionContent(docPath, 'frontend/styling/css-guidelines');
            const document = await cache.getDocument(docPath);
            // Verify all hierarchical keys are cached separately
            expect(document?.sections?.has('frontend/authentication/jwt-tokens')).toBe(true);
            expect(document?.sections?.has('backend/authorization/jwt-implementation')).toBe(true);
            expect(document?.sections?.has('frontend/styling/css-guidelines')).toBe(true);
            // Verify content is different
            const frontendJwt = document?.sections?.get('frontend/authentication/jwt-tokens');
            const backendJwt = document?.sections?.get('backend/authorization/jwt-implementation');
            const css = document?.sections?.get('frontend/styling/css-guidelines');
            expect(frontendJwt).not.toBe(backendJwt);
            expect(frontendJwt).not.toBe(css);
            expect(backendJwt).not.toBe(css);
        });
        test('should handle edge cases in hierarchical cache keys', async () => {
            const docPath = '/test-hierarchical.md';
            // Test empty/null cases
            const emptyResult = await cache.getSectionContent(docPath, '');
            expect(emptyResult).toBeNull();
            // Test single-level path (flat addressing) - should find first authentication (Frontend)
            const singleLevel = await cache.getSectionContent(docPath, 'authentication');
            expect(singleLevel).toContain('#### JWT Tokens');
            // Test multi-level path
            const multiLevel = await cache.getSectionContent(docPath, 'frontend/authentication/jwt-tokens');
            expect(multiLevel).toContain('This is the JWT tokens section content.');
            // Test non-existent hierarchical path
            const nonExistent = await cache.getSectionContent(docPath, 'nonexistent/path/section');
            expect(nonExistent).toBeNull();
        });
        test('should handle cache lookup priority correctly', async () => {
            const docPath = '/test-hierarchical.md';
            // First, load with hierarchical path
            const hierarchicalFirst = await cache.getSectionContent(docPath, 'frontend/authentication/jwt-tokens');
            // Verify both keys are cached
            const document = await cache.getDocument(docPath);
            expect(document?.sections?.has('frontend/authentication/jwt-tokens')).toBe(true);
            expect(document?.sections?.has('jwt-tokens')).toBe(true);
            // Now access with flat path - should use cache
            const flatSecond = await cache.getSectionContent(docPath, 'jwt-tokens');
            expect(hierarchicalFirst).toBe(flatSecond);
            expect(flatSecond).toContain('This is the JWT tokens section content.');
        });
    });
    describe('backward compatibility with flat addressing', () => {
        test('should maintain compatibility with existing flat addressing patterns', async () => {
            const docPath = '/test-hierarchical.md';
            // Traditional flat addressing should still work - gets first authentication (Frontend)
            const flatAuth = await cache.getSectionContent(docPath, 'authentication');
            expect(flatAuth).toContain('#### JWT Tokens');
            // Access root-level authentication using simple slug
            const rootAuth = await cache.getSectionContent(docPath, 'root-auth');
            expect(rootAuth).toContain('This is the root-level authentication section.');
            // Flat addressing for nested content should work
            const flatJwt = await cache.getSectionContent(docPath, 'jwt-tokens');
            expect(flatJwt).toContain('This is the JWT tokens section content.');
            const flatCss = await cache.getSectionContent(docPath, 'css-guidelines');
            expect(flatCss).toContain('This is the CSS guidelines section content.');
        });
        test('should handle mixed flat and hierarchical access patterns', async () => {
            const docPath = '/test-hierarchical.md';
            // Mix flat and hierarchical access
            const flat1 = await cache.getSectionContent(docPath, 'jwt-tokens');
            const hierarchical1 = await cache.getSectionContent(docPath, 'frontend/authentication/jwt-tokens');
            const flat2 = await cache.getSectionContent(docPath, 'root-auth'); // Root-level auth
            const hierarchical2 = await cache.getSectionContent(docPath, 'backend/authorization/jwt-implementation');
            // JWT tokens should be the same content regardless of access method
            expect(flat1).toBe(hierarchical1);
            expect(flat1).toContain('This is the JWT tokens section content.');
            // Root auth and backend auth should be different
            expect(flat2).toContain('This is the root-level authentication section.');
            expect(hierarchical2).toContain('This is the backend JWT implementation content.');
            expect(flat2).not.toBe(hierarchical2);
        });
    });
});
//# sourceMappingURL=document-cache.hierarchical.test.js.map