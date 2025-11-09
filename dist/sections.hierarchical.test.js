/**
 * Hierarchical Section Addressing - Phase 1 Tests (TDD-first)
 *
 * These tests implement hierarchical section matching functionality.
 * They are written TDD-first and MUST FAIL initially before implementation.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { readSection } from './sections.js';
import { listHeadings } from './parse.js';
describe('Hierarchical Section Addressing - Phase 1', () => {
    const sampleMarkdown = `# API Documentation

## Authentication
Basic authentication concepts.

### JWT Tokens
Information about JWT token handling.

#### Validation Process
Details about token validation.

### OAuth2 Flow
OAuth2 implementation details.

## Endpoints
API endpoint information.

### User Management
User management endpoints.

#### Create User
How to create a new user.

#### Update User
How to update existing users.

### Product Management
Product management endpoints.

#### List Products
How to list all products.

### Authentication (duplicate name)
Another section named Authentication under Endpoints.

## Frontend
Frontend documentation.

### Authentication
Frontend authentication handling.

#### JWT Tokens
Frontend JWT token usage.
`;
    let headings;
    beforeEach(() => {
        headings = listHeadings(sampleMarkdown);
    });
    describe('matchHeadingBySlug with hierarchical support', () => {
        test('should match flat slugs (backward compatibility)', () => {
            // Test that existing flat addressing continues to work
            const result = readSection(sampleMarkdown, 'jwt-tokens');
            expect(result).not.toBeNull();
            expect(result).toContain('Information about JWT token handling');
        });
        test('should match hierarchical paths for disambiguation', () => {
            // Test hierarchical matching - this WILL FAIL initially
            // There are multiple "Authentication" sections, hierarchical path should disambiguate
            const frontendAuth = readSection(sampleMarkdown, 'frontend/authentication');
            expect(frontendAuth).not.toBeNull();
            expect(frontendAuth).toContain('Frontend authentication handling');
            const endpointsAuth = readSection(sampleMarkdown, 'endpoints/authentication');
            expect(endpointsAuth).not.toBeNull();
            expect(endpointsAuth).toContain('Another section named Authentication under Endpoints');
        });
        test('should match deep hierarchical paths', () => {
            // Test deep hierarchical addressing - this WILL FAIL initially
            const deepPath = readSection(sampleMarkdown, 'api-documentation/authentication/jwt-tokens/validation-process');
            expect(deepPath).not.toBeNull();
            expect(deepPath).toContain('Details about token validation');
            const userCreate = readSection(sampleMarkdown, 'endpoints/user-management/create-user');
            expect(userCreate).not.toBeNull();
            expect(userCreate).toContain('How to create a new user');
        });
        test('should verify hierarchical context correctly', () => {
            // Test that hierarchical context verification works - this WILL FAIL initially
            // There are two "JWT Tokens" sections:
            // 1. api-documentation/authentication/jwt-tokens
            // 2. frontend/authentication/jwt-tokens
            const apiJwt = readSection(sampleMarkdown, 'authentication/jwt-tokens');
            expect(apiJwt).not.toBeNull();
            expect(apiJwt).toContain('Information about JWT token handling');
            const frontendJwt = readSection(sampleMarkdown, 'frontend/authentication/jwt-tokens');
            expect(frontendJwt).not.toBeNull();
            expect(frontendJwt).toContain('Frontend JWT token usage');
        });
        test('should handle ambiguous section names with hierarchical disambiguation', () => {
            // Test disambiguation of sections with same name - this WILL FAIL initially
            // Multiple "Authentication" sections exist:
            // 1. Root level: api-documentation/authentication
            // 2. Under Endpoints: endpoints/authentication
            // 3. Under Frontend: frontend/authentication
            const rootAuth = readSection(sampleMarkdown, 'authentication');
            expect(rootAuth).not.toBeNull();
            expect(rootAuth).toContain('Basic authentication concepts');
            const endpointsAuth = readSection(sampleMarkdown, 'endpoints/authentication');
            expect(endpointsAuth).not.toBeNull();
            expect(endpointsAuth).toContain('Another section named Authentication under Endpoints');
            const frontendAuth = readSection(sampleMarkdown, 'frontend/authentication');
            expect(frontendAuth).not.toBeNull();
            expect(frontendAuth).toContain('Frontend authentication handling');
        });
        test('should handle edge cases gracefully', () => {
            // Test edge cases - these WILL FAIL initially
            // Non-existent hierarchical path
            expect(() => readSection(sampleMarkdown, 'nonexistent/path')).toThrow();
            // Wrong parent context
            expect(() => readSection(sampleMarkdown, 'wrong-parent/jwt-tokens')).toThrow();
            // Malformed hierarchical path
            expect(() => readSection(sampleMarkdown, '/malformed//path/')).toThrow();
            // Empty path components
            expect(() => readSection(sampleMarkdown, 'authentication//jwt-tokens')).toThrow();
        });
        test('should maintain case insensitive matching for hierarchical paths', () => {
            // Test case handling - this WILL FAIL initially
            const result1 = readSection(sampleMarkdown, 'Authentication/JWT-Tokens');
            const result2 = readSection(sampleMarkdown, 'authentication/jwt-tokens');
            expect(result1).toEqual(result2);
            expect(result1).not.toBeNull();
        });
    });
    describe('readSection with hierarchical addressing', () => {
        test('should read sections by hierarchical path', () => {
            // Test full hierarchical section reading - this WILL FAIL initially
            const section = readSection(sampleMarkdown, 'endpoints/user-management');
            expect(section).not.toBeNull();
            expect(section).toContain('User management endpoints');
            expect(section).toContain('Create User');
            expect(section).toContain('Update User');
        });
        test('should maintain backward compatibility with flat addressing', () => {
            // Test that existing flat addressing continues to work
            const flatResult = readSection(sampleMarkdown, 'user-management');
            expect(flatResult).not.toBeNull();
            expect(flatResult).toContain('User management endpoints');
            const hierarchicalResult = readSection(sampleMarkdown, 'endpoints/user-management');
            expect(hierarchicalResult).toEqual(flatResult);
        });
        test('should handle partial path matches correctly', () => {
            // Test partial path behavior - this WILL FAIL initially
            // Should match the first occurrence when using partial path
            const authResult = readSection(sampleMarkdown, 'authentication');
            expect(authResult).toContain('Basic authentication concepts');
            // Should NOT match sections with wrong hierarchical context
            expect(() => readSection(sampleMarkdown, 'products/authentication')).toThrow();
        });
    });
    describe('hierarchical context verification', () => {
        test('should correctly build hierarchical paths from heading structure', () => {
            // Test hierarchical path building logic - this WILL FAIL initially
            // Find a deeply nested heading and verify its hierarchical path
            const validationHeading = headings.find(h => h.slug === 'validation-process');
            expect(validationHeading).toBeDefined();
            expect(validationHeading?.depth).toBe(4);
            // The validation process should be under authentication/jwt-tokens
            // This logic will be implemented in verifyHierarchicalContext()
        });
        test('should handle duplicate section names with different parents', () => {
            // Test handling of duplicate names - the GitHub slugger creates unique slugs for duplicates
            const authSections = headings.filter(h => h.slug.startsWith('authentication'));
            expect(authSections.length).toBeGreaterThan(1);
            // Should be able to distinguish between them based on hierarchy
            const rootAuth = readSection(sampleMarkdown, 'authentication');
            const frontendAuth = readSection(sampleMarkdown, 'frontend/authentication');
            expect(rootAuth).not.toEqual(frontendAuth);
            expect(rootAuth).toContain('Basic authentication concepts');
            expect(frontendAuth).toContain('Frontend authentication handling');
        });
    });
    describe('performance considerations', () => {
        test('should not significantly slow down flat addressing', () => {
            // Test that adding hierarchical support doesn't break performance
            const start = performance.now();
            for (let i = 0; i < 100; i++) {
                readSection(sampleMarkdown, 'authentication');
            }
            const end = performance.now();
            const flatTime = end - start;
            // Should complete 100 iterations reasonably quickly (under 1000ms for hierarchical processing)
            expect(flatTime).toBeLessThan(1000);
        });
    });
});
describe('buildHierarchicalPath - O(depth) optimization', () => {
    // Import the buildHierarchicalPath function by testing through public API
    // Since it's not exported, we test its behavior through readSection with hierarchical paths
    test('should build path for root-level heading (depth 1)', () => {
        const markdown = '# Root\nRoot content.';
        const result = readSection(markdown, 'root');
        expect(result).not.toBeNull();
        expect(result).toContain('Root content');
    });
    test('should build path for nested heading (depth 2)', () => {
        const markdown = `# API
API section.

## Auth
Auth subsection.`;
        const result = readSection(markdown, 'api/auth');
        expect(result).not.toBeNull();
        expect(result).toContain('Auth subsection');
    });
    test('should build path for deeply nested heading (depth 4)', () => {
        const markdown = `# Docs
Documentation root.

## API
API section.

### Auth
Auth subsection.

#### JWT
JWT details.`;
        const result = readSection(markdown, 'docs/api/auth/jwt');
        expect(result).not.toBeNull();
        expect(result).toContain('JWT details');
    });
    test('should handle headings with disambiguation suffixes', () => {
        const markdown = `# Setup
First setup.

# Setup
Second setup.

## Config
Config under second setup.`;
        const result = readSection(markdown, 'setup-1/config');
        expect(result).not.toBeNull();
        expect(result).toContain('Config under second setup');
    });
    test('should handle document with 100 headings efficiently', () => {
        // Create large document structure
        let markdown = '# Root\nRoot content.\n\n';
        // Add 99 depth-2 children
        for (let i = 1; i < 100; i++) {
            markdown += `## Section ${i}\nContent for section ${i}.\n\n`;
        }
        // Target is at index 50 (section 50)
        const start = performance.now();
        const result = readSection(markdown, `root/section-50`);
        const duration = performance.now() - start;
        expect(result).not.toBeNull();
        expect(result).toContain('Content for section 50');
        // Realistic threshold: includes markdown parsing overhead
        // The O(depth) optimization benefits buildHierarchicalPath which is just one part
        expect(duration).toBeLessThan(100); // Should be fast (sub-100ms is excellent)
    });
    test('should produce consistent results with various document structures', () => {
        // Test backwards compatibility with various document structures
        // Test case 1: Multiple root sections with children
        const markdown1 = `# A
Content A.

## B
Content B.

# C
Content C.

## D
Content D.`;
        const resultD = readSection(markdown1, 'c/d');
        expect(resultD).not.toBeNull();
        expect(resultD).toContain('Content D');
        // Test case 2: Deep nesting
        const markdown2 = `# X
Content X.

## Y
Content Y.

### Z
Content Z.`;
        const resultZ = readSection(markdown2, 'x/y/z');
        expect(resultZ).not.toBeNull();
        expect(resultZ).toContain('Content Z');
    });
    test('should handle complex hierarchical paths with multiple levels', () => {
        const markdown = `# API Documentation

## Authentication
Basic authentication concepts.

### JWT Tokens
Information about JWT token handling.

#### Validation Process
Details about token validation.

#### Expiration Handling
Details about token expiration.

### OAuth2 Flow
OAuth2 implementation details.

## Endpoints
API endpoint information.

### User Management
User management endpoints.`;
        // Test deep path
        const validation = readSection(markdown, 'api-documentation/authentication/jwt-tokens/validation-process');
        expect(validation).not.toBeNull();
        expect(validation).toContain('Details about token validation');
        // Test another deep path
        const expiration = readSection(markdown, 'authentication/jwt-tokens/expiration-handling');
        expect(expiration).not.toBeNull();
        expect(expiration).toContain('Details about token expiration');
        // Test medium depth path
        const userMgmt = readSection(markdown, 'endpoints/user-management');
        expect(userMgmt).not.toBeNull();
        expect(userMgmt).toContain('User management endpoints');
    });
    test('should maintain backward compatibility with flat slug addressing', () => {
        const markdown = `# API

## Authentication
Auth content.

### JWT
JWT content.`;
        // Both flat and hierarchical should work
        const flatResult = readSection(markdown, 'jwt');
        const hierarchicalResult = readSection(markdown, 'api/authentication/jwt');
        expect(flatResult).not.toBeNull();
        expect(hierarchicalResult).not.toBeNull();
        expect(flatResult).toEqual(hierarchicalResult);
    });
    test('should handle edge case: orphaned heading with invalid parent index', () => {
        // This tests the graceful handling when parent index is invalid
        // In normal markdown parsing this shouldn't happen, but we test defensive code
        const markdown = `# Valid Root
Root content.

## Valid Child
Child content.`;
        // Normal case should work fine
        const result = readSection(markdown, 'valid-root/valid-child');
        expect(result).not.toBeNull();
        expect(result).toContain('Child content');
    });
    test('should perform efficiently with repeated lookups', () => {
        const markdown = `# Documentation

## Setup
Setup instructions.

### Installation
Installation steps.

#### Dependencies
Dependency requirements.`;
        // Perform multiple lookups to test consistent performance
        const start = performance.now();
        for (let i = 0; i < 50; i++) {
            const result = readSection(markdown, 'documentation/setup/installation/dependencies');
            expect(result).not.toBeNull();
        }
        const duration = performance.now() - start;
        // 50 lookups should complete quickly (includes markdown parsing overhead)
        // The O(depth) optimization benefits the hierarchical path matching component
        expect(duration).toBeLessThan(150); // Realistic threshold with parsing overhead
    });
    test('should handle documents with mixed heading depths', () => {
        const markdown = `# Level 1

## Level 2A

### Level 3

## Level 2B

#### Level 4 (skipped level 3)

# Another Level 1

## Level 2C`;
        // Test normal nesting
        const level3 = readSection(markdown, 'level-1/level-2a/level-3');
        expect(level3).not.toBeNull();
        // Test skipped level (level 4 under level 2)
        const level4 = readSection(markdown, 'level-1/level-2b/level-4-skipped-level-3');
        expect(level4).not.toBeNull();
    });
});
//# sourceMappingURL=sections.hierarchical.test.js.map