/**
 * Unit tests for PromptLoader with dual-directory support
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { PromptLoader } from '../prompt-loader.js';
describe('PromptLoader - Dual Directory Loading', () => {
    let tempDir;
    let workflowsDir;
    let guidesDir;
    beforeEach(async () => {
        // Create temporary test directory structure
        const { mkdir } = await import('fs/promises');
        tempDir = await mkdtemp(join(tmpdir(), 'prompt-loader-test-'));
        workflowsDir = join(tempDir, 'workflows');
        guidesDir = join(tempDir, 'guides');
        // Create test directories
        await mkdir(workflowsDir, { recursive: true });
        await mkdir(guidesDir, { recursive: true });
    });
    afterEach(async () => {
        // Clean up temporary directory
        await rm(tempDir, { recursive: true, force: true });
    });
    describe('Single Directory Loading (Existing Functionality)', () => {
        it('should load prompts from workflows directory without prefix', async () => {
            // Create workflows directory with test file
            await writeFile(join(workflowsDir, 'test-workflow.md'), `---
description: Test workflow description
whenToUse: "When testing workflows"
---

# Test Workflow Content

This is test content.`);
            const loader = new PromptLoader([{ path: workflowsDir }]);
            const prompts = await loader.loadAll();
            expect(prompts).toHaveLength(1);
            const firstPrompt = prompts[0];
            expect(firstPrompt).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(firstPrompt.name).toBe('test-workflow');
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(firstPrompt.description).toBe('Test workflow description');
        });
        it('should handle missing directory gracefully', async () => {
            const loader = new PromptLoader([{ path: join(tempDir, 'nonexistent') }]);
            const prompts = await loader.loadAll();
            expect(prompts).toHaveLength(0);
            expect(loader.getErrors()).toHaveLength(0);
        });
        it('should skip invalid files and collect errors', async () => {
            await writeFile(join(workflowsDir, 'INVALID-NAME.md'), `---
description: Invalid filename
---

Content`);
            await writeFile(join(workflowsDir, 'valid-file.md'), `---
description: Valid file
---

Valid content`);
            const loader = new PromptLoader([{ path: workflowsDir }]);
            const prompts = await loader.loadAll();
            expect(prompts).toHaveLength(1);
            const firstPrompt = prompts[0];
            expect(firstPrompt).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(firstPrompt.name).toBe('valid-file');
            const errors = loader.getErrors();
            expect(errors).toHaveLength(1);
            const firstError = errors[0];
            expect(firstError).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(firstError.type).toBe('INVALID_FILENAME');
        });
    });
    describe('Dual Directory Loading with Prefixes', () => {
        it('should load from workflows directory with workflow_ prefix', async () => {
            await writeFile(join(workflowsDir, 'tdd-incremental.md'), `---
description: TDD workflow
---

TDD content here`);
            const loader = new PromptLoader([
                { path: workflowsDir, prefix: 'workflow_' }
            ]);
            const prompts = await loader.loadAll();
            expect(prompts).toHaveLength(1);
            const firstPrompt = prompts[0];
            expect(firstPrompt).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(firstPrompt.name).toBe('workflow_tdd-incremental');
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(firstPrompt.description).toBe('TDD workflow');
        });
        it('should load from guides directory with guide_ prefix', async () => {
            await writeFile(join(guidesDir, 'activate-guide-documentation.md'), `---
description: Guide activation documentation
---

Guide content here`);
            const loader = new PromptLoader([
                { path: guidesDir, prefix: 'guide_' }
            ]);
            const prompts = await loader.loadAll();
            expect(prompts).toHaveLength(1);
            const firstPrompt = prompts[0];
            expect(firstPrompt).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(firstPrompt.name).toBe('guide_activate-guide-documentation');
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(firstPrompt.description).toBe('Guide activation documentation');
        });
        it('should load from both directories with correct prefixes', async () => {
            // Create workflow file
            await writeFile(join(workflowsDir, 'spec-first.md'), `---
description: Spec first workflow
---

Spec first content`);
            // Create guide file
            await writeFile(join(guidesDir, 'documentation-standards.md'), `---
description: Documentation standards guide
---

Documentation standards content`);
            const loader = new PromptLoader([
                { path: workflowsDir, prefix: 'workflow_' },
                { path: guidesDir, prefix: 'guide_' }
            ]);
            const prompts = await loader.loadAll();
            expect(prompts).toHaveLength(2);
            const workflowPrompt = prompts.find(p => p.name === 'workflow_spec-first');
            const guidePrompt = prompts.find(p => p.name === 'guide_documentation-standards');
            expect(workflowPrompt).toBeDefined();
            expect(workflowPrompt?.description).toBe('Spec first workflow');
            expect(guidePrompt).toBeDefined();
            expect(guidePrompt?.description).toBe('Documentation standards guide');
        });
        it('should handle multiple files in each directory', async () => {
            // Create multiple workflow files
            await writeFile(join(workflowsDir, 'workflow-one.md'), `---\ndescription: First\n---\nContent 1`);
            await writeFile(join(workflowsDir, 'workflow-two.md'), `---\ndescription: Second\n---\nContent 2`);
            // Create multiple guide files
            await writeFile(join(guidesDir, 'guide-one.md'), `---\ndescription: Guide 1\n---\nGuide content 1`);
            await writeFile(join(guidesDir, 'guide-two.md'), `---\ndescription: Guide 2\n---\nGuide content 2`);
            const loader = new PromptLoader([
                { path: workflowsDir, prefix: 'workflow_' },
                { path: guidesDir, prefix: 'guide_' }
            ]);
            const prompts = await loader.loadAll();
            expect(prompts).toHaveLength(4);
            expect(prompts.filter(p => p.name.startsWith('workflow_'))).toHaveLength(2);
            expect(prompts.filter(p => p.name.startsWith('guide_'))).toHaveLength(2);
        });
        it('should collect errors from all directories', async () => {
            // Invalid file in workflows
            await writeFile(join(workflowsDir, 'INVALID.md'), `---\ndescription: Bad\n---\nContent`);
            // Invalid file in guides
            await writeFile(join(guidesDir, 'ALSO-INVALID.md'), `---\ndescription: Bad\n---\nContent`);
            // Valid files
            await writeFile(join(workflowsDir, 'valid-workflow.md'), `---\ndescription: Good\n---\nContent`);
            await writeFile(join(guidesDir, 'valid-guide.md'), `---\ndescription: Good\n---\nContent`);
            const loader = new PromptLoader([
                { path: workflowsDir, prefix: 'workflow_' },
                { path: guidesDir, prefix: 'guide_' }
            ]);
            const prompts = await loader.loadAll();
            expect(prompts).toHaveLength(2);
            expect(loader.getErrors()).toHaveLength(2);
            expect(loader.getErrors().every(e => e.type === 'INVALID_FILENAME')).toBe(true);
        });
        it('should preserve all frontmatter fields with prefixes', async () => {
            await writeFile(join(workflowsDir, 'complex-workflow.md'), `---
title: Complex Workflow Title
description: Complex workflow description
whenToUse: "When you need complex workflows or testing edge cases"
---

# Complex Workflow

This is complex content with multiple sections.

## Section 1
Content here.

## Section 2
More content.`);
            const loader = new PromptLoader([
                { path: workflowsDir, prefix: 'workflow_' }
            ]);
            const prompts = await loader.loadAll();
            expect(prompts).toHaveLength(1);
            const prompt = prompts[0];
            expect(prompt).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(prompt.name).toBe('workflow_complex-workflow');
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(prompt.description).toBe('Complex workflow description');
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(prompt.whenToUse).toBe('When you need complex workflows or testing edge cases');
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(prompt.content).toContain('# Complex Workflow');
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(prompt.content).toContain('## Section 1');
        });
        it('should handle empty directories in multi-directory config', async () => {
            await writeFile(join(workflowsDir, 'only-workflow.md'), `---\ndescription: Only workflow\n---\nContent`);
            // guidesDir exists but is empty
            const loader = new PromptLoader([
                { path: workflowsDir, prefix: 'workflow_' },
                { path: guidesDir, prefix: 'guide_' }
            ]);
            const prompts = await loader.loadAll();
            expect(prompts).toHaveLength(1);
            const firstPrompt = prompts[0];
            expect(firstPrompt).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(firstPrompt.name).toBe('workflow_only-workflow');
        });
    });
    describe('Prefix Edge Cases', () => {
        it('should handle empty prefix (no prefix applied)', async () => {
            await writeFile(join(workflowsDir, 'no-prefix.md'), `---\ndescription: No prefix\n---\nContent`);
            const loader = new PromptLoader([
                { path: workflowsDir, prefix: '' }
            ]);
            const prompts = await loader.loadAll();
            expect(prompts).toHaveLength(1);
            const firstPrompt = prompts[0];
            expect(firstPrompt).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(firstPrompt.name).toBe('no-prefix');
        });
        it('should handle undefined prefix (no prefix applied)', async () => {
            await writeFile(join(workflowsDir, 'undefined-prefix.md'), `---\ndescription: Undefined prefix\n---\nContent`);
            const loader = new PromptLoader([
                { path: workflowsDir }
            ]);
            const prompts = await loader.loadAll();
            expect(prompts).toHaveLength(1);
            const firstPrompt = prompts[0];
            expect(firstPrompt).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(firstPrompt.name).toBe('undefined-prefix');
        });
        it('should support custom prefixes beyond workflow_ and guide_', async () => {
            await writeFile(join(workflowsDir, 'custom-file.md'), `---\ndescription: Custom prefix\n---\nContent`);
            const loader = new PromptLoader([
                { path: workflowsDir, prefix: 'custom_prefix_' }
            ]);
            const prompts = await loader.loadAll();
            expect(prompts).toHaveLength(1);
            const firstPrompt = prompts[0];
            expect(firstPrompt).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(firstPrompt.name).toBe('custom_prefix_custom-file');
        });
    });
    describe('Error Reporting', () => {
        it('should include directory context in error messages', async () => {
            // This test verifies that errors include which directory they came from
            await writeFile(join(workflowsDir, 'INVALID.md'), `---\ndescription: Bad\n---\nContent`);
            const loader = new PromptLoader([
                { path: workflowsDir, prefix: 'workflow_' }
            ]);
            await loader.loadAll();
            const errors = loader.getErrors();
            expect(errors).toHaveLength(1);
            const firstError = errors[0];
            expect(firstError).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(firstError.filename).toBe('INVALID.md');
        });
        it('should handle empty content validation', async () => {
            await writeFile(join(workflowsDir, 'empty-content.md'), `---
description: Empty content file
---

`);
            const loader = new PromptLoader([
                { path: workflowsDir, prefix: 'workflow_' }
            ]);
            const prompts = await loader.loadAll();
            expect(prompts).toHaveLength(0);
            const errors = loader.getErrors();
            expect(errors).toHaveLength(1);
            const firstError = errors[0];
            expect(firstError).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(firstError.type).toBe('VALIDATION_ERROR');
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(firstError.message).toContain('empty');
        });
    });
});
//# sourceMappingURL=prompt-loader.test.js.map