/**
 * @file tool-integration.array-validation.test.ts
 * @description Comprehensive tests for ToolIntegration.validateArrayParameter
 * Tests single string, array, and JSON string array formats
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { ToolIntegration, AddressingError } from '../addressing-system.js';
import { initializeGlobalCache } from '../../document-cache.js';
import path from 'path';
import os from 'os';
describe('ToolIntegration.validateArrayParameter', () => {
    let testDocsRoot;
    beforeAll(async () => {
        // Create a temporary test directory
        testDocsRoot = path.join(os.tmpdir(), `test-array-validation-${Date.now()}`);
        initializeGlobalCache(testDocsRoot);
    });
    describe('single string parameter', () => {
        it('should convert single string to array', () => {
            const result = ToolIntegration.validateArrayParameter('/docs/test.md', 'document');
            expect(result).toEqual(['/docs/test.md']);
        });
        it('should handle path with spaces', () => {
            const result = ToolIntegration.validateArrayParameter('/docs/test file.md', 'document');
            expect(result).toEqual(['/docs/test file.md']);
        });
        it('should handle empty string', () => {
            const result = ToolIntegration.validateArrayParameter('', 'document');
            expect(result).toEqual(['']);
        });
    });
    describe('array parameter', () => {
        it('should pass through single-element array', () => {
            const result = ToolIntegration.validateArrayParameter(['/docs/test.md'], 'document');
            expect(result).toEqual(['/docs/test.md']);
        });
        it('should pass through two-element array', () => {
            const result = ToolIntegration.validateArrayParameter(['/docs/test1.md', '/docs/test2.md'], 'document');
            expect(result).toEqual(['/docs/test1.md', '/docs/test2.md']);
        });
        it('should handle multiple documents (3+)', () => {
            const result = ToolIntegration.validateArrayParameter(['/docs/test1.md', '/docs/test2.md', '/docs/test3.md', '/docs/test4.md'], 'document');
            expect(result).toEqual([
                '/docs/test1.md',
                '/docs/test2.md',
                '/docs/test3.md',
                '/docs/test4.md'
            ]);
        });
    });
    describe('JSON string array parameter (MCP inspector CLI format)', () => {
        it('should parse JSON array string with two elements', () => {
            const result = ToolIntegration.validateArrayParameter('["/docs/test1.md","/docs/test2.md"]', 'document');
            expect(result).toEqual(['/docs/test1.md', '/docs/test2.md']);
        });
        it('should parse JSON array string with spaces', () => {
            const result = ToolIntegration.validateArrayParameter('[ "/docs/test1.md" , "/docs/test2.md" ]', 'document');
            expect(result).toEqual(['/docs/test1.md', '/docs/test2.md']);
        });
        it('should parse JSON array string with single element', () => {
            const result = ToolIntegration.validateArrayParameter('["/docs/test.md"]', 'document');
            expect(result).toEqual(['/docs/test.md']);
        });
        it('should parse JSON array string with multiple elements', () => {
            const result = ToolIntegration.validateArrayParameter('["/docs/test1.md","/docs/test2.md","/docs/test3.md"]', 'document');
            expect(result).toEqual(['/docs/test1.md', '/docs/test2.md', '/docs/test3.md']);
        });
        it('should handle JSON array with leading/trailing whitespace', () => {
            const result = ToolIntegration.validateArrayParameter('  ["/docs/test1.md","/docs/test2.md"]  ', 'document');
            expect(result).toEqual(['/docs/test1.md', '/docs/test2.md']);
        });
        it('should handle JSON array with newlines and formatting', () => {
            const result = ToolIntegration.validateArrayParameter('[\n  "/docs/test1.md",\n  "/docs/test2.md"\n]', 'document');
            expect(result).toEqual(['/docs/test1.md', '/docs/test2.md']);
        });
    });
    describe('malformed JSON handling', () => {
        it('should treat malformed JSON as single string (missing closing bracket)', () => {
            const result = ToolIntegration.validateArrayParameter('["/docs/test1.md","/docs/test2.md"', 'document');
            expect(result).toEqual(['["/docs/test1.md","/docs/test2.md"']);
        });
        it('should treat malformed JSON as single string (missing opening bracket)', () => {
            const result = ToolIntegration.validateArrayParameter('"/docs/test1.md","/docs/test2.md"]', 'document');
            expect(result).toEqual(['"/docs/test1.md","/docs/test2.md"]']);
        });
        it('should treat malformed JSON as single string (invalid JSON)', () => {
            const result = ToolIntegration.validateArrayParameter('[invalid, json]', 'document');
            expect(result).toEqual(['[invalid, json]']);
        });
        it('should handle JSON string that parses to non-array', () => {
            const result = ToolIntegration.validateArrayParameter('{"key": "value"}', 'document');
            // Object doesn't start with '[', so treated as single string
            expect(result).toEqual(['{"key": "value"}']);
        });
    });
    describe('invalid parameter types', () => {
        it('should throw error for null parameter', () => {
            expect(() => {
                ToolIntegration.validateArrayParameter(null, 'document');
            }).toThrow(AddressingError);
            expect(() => {
                ToolIntegration.validateArrayParameter(null, 'document');
            }).toThrow('document parameter is required and must be a string or array of strings');
        });
        it('should throw error for undefined parameter', () => {
            expect(() => {
                ToolIntegration.validateArrayParameter(undefined, 'document');
            }).toThrow(AddressingError);
            expect(() => {
                ToolIntegration.validateArrayParameter(undefined, 'document');
            }).toThrow('document parameter is required and must be a string or array of strings');
        });
        it('should throw error for number parameter', () => {
            expect(() => {
                ToolIntegration.validateArrayParameter(123, 'document');
            }).toThrow(AddressingError);
        });
        it('should throw error for boolean parameter', () => {
            expect(() => {
                ToolIntegration.validateArrayParameter(true, 'document');
            }).toThrow(AddressingError);
        });
        it('should throw error for object parameter (non-array)', () => {
            expect(() => {
                ToolIntegration.validateArrayParameter({ key: 'value' }, 'document');
            }).toThrow(AddressingError);
        });
    });
    describe('edge cases', () => {
        it('should handle empty array', () => {
            const result = ToolIntegration.validateArrayParameter([], 'document');
            expect(result).toEqual([]);
        });
        it('should handle JSON string of empty array', () => {
            const result = ToolIntegration.validateArrayParameter('[]', 'document');
            expect(result).toEqual([]);
        });
        it('should handle string that looks like array but is not JSON', () => {
            const result = ToolIntegration.validateArrayParameter('[not-json-array]', 'document');
            expect(result).toEqual(['[not-json-array]']);
        });
        it('should handle deeply nested JSON array (valid JSON)', () => {
            const result = ToolIntegration.validateArrayParameter('["/docs/test1.md",["/nested/doc.md"]]', 'document');
            // Valid JSON array with nested array
            expect(result).toEqual(['/docs/test1.md', ['/nested/doc.md']]);
        });
    });
    describe('real-world MCP inspector scenarios', () => {
        it('should handle exact format from bug report', () => {
            // This is the exact format that was failing in the bug report
            const result = ToolIntegration.validateArrayParameter('["/docs/docs/view-document-test.md","/docs/specs/test-doc.md"]', 'document');
            expect(result).toEqual([
                '/docs/docs/view-document-test.md',
                '/docs/specs/test-doc.md'
            ]);
        });
        it('should handle MCP inspector CLI array with --tool-arg format', () => {
            // Simulating how MCP inspector CLI might format the parameter
            const result = ToolIntegration.validateArrayParameter('["/docs/api/auth.md","/docs/api/users.md"]', 'document');
            expect(result).toEqual(['/docs/api/auth.md', '/docs/api/users.md']);
        });
        it('should handle web UI native array format', () => {
            // Simulating how MCP inspector web UI sends arrays
            const result = ToolIntegration.validateArrayParameter(['/docs/api/auth.md', '/docs/api/users.md'], 'document');
            expect(result).toEqual(['/docs/api/auth.md', '/docs/api/users.md']);
        });
    });
});
//# sourceMappingURL=tool-integration.array-validation.test.js.map