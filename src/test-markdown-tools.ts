/**
 * Comprehensive test suite for markdown CRUD operations
 */

import path from 'node:path';
import { promises as fs } from 'node:fs';
import { readFileSnapshot, writeFileIfUnchanged, ensureDirectoryExists } from './fsio.js';
import { listHeadings, buildToc, validateMarkdownStructure } from './parse.js';
import { 
  readSection, 
  replaceSectionBody, 
  insertRelative, 
  renameHeading, 
  deleteSection 
} from './sections.js';
import { titleToSlug } from './slug.js';
// import { createTestConfig } from './config.js';
import { createSilentLogger, setGlobalLogger } from './utils/logger.js';
import type { Heading, TocNode } from './types/index.js';

/**
 * Test configuration
 */
// Test configuration available if needed
// const config = createTestConfig();
const DOCS_DIR = path.resolve(process.cwd(), '.spec-docs-mcp/docs');
const TEST_FILE = path.join(DOCS_DIR, 'test-document.md');
const WORKING_FILE = path.join(DOCS_DIR, 'working-test.md');

/**
 * Test results tracking
 */
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const testResults: TestResult[] = [];

/**
 * Test utilities
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function logTest(name: string): void {
  console.log(`\n${'-'.repeat(60)}`);
  console.log(`🧪 ${name}`);
  console.log(`${'-'.repeat(60)}`);
}

function logSuccess(message: string): void {
  console.log(`✅ ${message}`);
}

// Utility function for informational logging if needed
// function logInfo(message: string): void {
//   console.log(`ℹ️  ${message}`);
// }

// Store test functions to run sequentially
const testQueue: Array<{ name: string; testFn: () => Promise<void> | void }> = [];

function runTest(name: string, testFn: () => Promise<void> | void): void {
  testQueue.push({ name, testFn });
}

async function executeTestQueue(): Promise<void> {
  for (const { name, testFn } of testQueue) {
    testResults.push({
      name,
      passed: false,
    });

    const testIndex = testResults.length - 1;
    
    logTest(name);
    try {
      await testFn();
      testResults[testIndex]!.passed = true;
      logSuccess(`${name} - PASSED`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      testResults[testIndex]!.error = errorMessage;
      console.error(`❌ ${name} - FAILED: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        console.error(`Stack: ${error.stack}`);
      }
    }
  }
}

/**
 * Prints a TOC tree structure
 */
function printTocTree(nodes: readonly TocNode[], indent = 0): void {
  for (const node of nodes) {
    const prefix = '  '.repeat(indent);
    console.log(`${prefix}- ${node.title} [${node.slug}] (depth: ${node.depth})`);
    if (node.children.length > 0) {
      printTocTree(node.children, indent + 1);
    }
  }
}

/**
 * Prints headings list with hierarchy indicators
 */
function printHeadingsList(headings: readonly Heading[]): void {
  for (const heading of headings) {
    const indent = '  '.repeat(heading.depth - 1);
    const parentInfo = heading.parentIndex !== null ? ` (parent: ${heading.parentIndex})` : '';
    console.log(`${indent}[${heading.depth}] ${heading.title} -> ${heading.slug}${parentInfo}`);
  }
}

/**
 * Main test suite
 */
async function runTestSuite(): Promise<void> {
  console.log('🚀 Starting Markdown CRUD Tools Test Suite\n');

  // Set up silent logger for tests
  setGlobalLogger(createSilentLogger());

  // Ensure test directory exists
  await ensureDirectoryExists(DOCS_DIR);

  // Test 1: Parse and list headings
  runTest('Parse and List Headings', async () => {
    const snap = await readFileSnapshot(TEST_FILE);
    const headings = listHeadings(snap.content);
    
    assert(headings.length > 0, 'Should find headings in test document');
    assert(headings[0]?.title === 'API Documentation', 'First heading should be API Documentation');
    assert(headings[0]?.depth === 1, 'First heading should be depth 1');
    assert(headings[0]?.slug === 'api-documentation', 'First heading slug should match');
    
    console.log('\nFound headings:');
    printHeadingsList(headings);
    
    logSuccess(`Found ${headings.length} headings with proper hierarchy`);
  });

  // Test 2: Build table of contents
  runTest('Build Table of Contents', async () => {
    const snap = await readFileSnapshot(TEST_FILE);
    const toc = buildToc(snap.content);
    
    assert(toc.length > 0, 'Should build non-empty TOC');
    assert(toc[0]?.title === 'API Documentation', 'Root should be API Documentation');
    assert((toc[0]?.children.length ?? 0) > 0, 'Root should have children');
    
    console.log('\nTable of Contents:');
    printTocTree(toc);
    
    logSuccess('TOC built successfully with proper nesting');
  });

  // Test 3: Validate markdown structure
  runTest('Validate Markdown Structure', async () => {
    const snap = await readFileSnapshot(TEST_FILE);
    
    // Should not throw for well-formed document
    validateMarkdownStructure(snap.content);
    
    logSuccess('Document structure validation passed');
  });

  // Test 4: Read sections by slug
  runTest('Read Sections by Slug', async () => {
    const snap = await readFileSnapshot(TEST_FILE);
    
    const overviewSection = readSection(snap.content, 'overview');
    assert(overviewSection !== null, 'Should find overview section');
    assert(overviewSection!.includes('## Overview'), 'Should include heading');
    assert(overviewSection!.includes('REST endpoints'), 'Should include content');
    
    const authSection = readSection(snap.content, 'authentication');
    assert(authSection !== null, 'Should find authentication section');
    assert(authSection!.includes('### Authentication'), 'Should include heading');
    assert(authSection!.includes('Bearer tokens'), 'Should include content');
    
    console.log('\nOverview section preview:');
    console.log(overviewSection!.substring(0, 200) + '...');
    
    logSuccess('Successfully read sections by slug');
  });

  // Test 5: Create working copy and test modifications
  runTest('Create Working Copy', async () => {
    const original = await readFileSnapshot(TEST_FILE);
    await fs.writeFile(WORKING_FILE, original.content, 'utf8');
    
    const copy = await readFileSnapshot(WORKING_FILE);
    assert(copy.content === original.content, 'Working copy should match original');
    
    logSuccess('Working copy created successfully');
  });

  // Test 6: Insert new sections
  runTest('Insert New Sections', async () => {
    // Ensure fresh working copy
    const original = await readFileSnapshot(TEST_FILE);
    await fs.writeFile(WORKING_FILE, original.content, 'utf8');
    let snap = await readFileSnapshot(WORKING_FILE);
    
    // Add section after Overview
    const afterOverview = insertRelative(
      snap.content,
      'overview',
      'insert_after',
      2,
      'Getting Started',
      `Welcome to the API! Follow these steps:

1. Sign up for an account
2. Generate your API key
3. Install the SDK or use curl
4. Make your first request

### Quick Example

Here's how to get started:

\`\`\`bash
curl -H "Authorization: Bearer YOUR_TOKEN" \\
     https://api.example.com/users
\`\`\`

You should see a JSON response with user data.`
    );
    
    // Get fresh snapshot before write
    const snapBeforeAfterOverview = await readFileSnapshot(WORKING_FILE);
    await writeFileIfUnchanged(WORKING_FILE, snapBeforeAfterOverview.mtimeMs, afterOverview);
    snap = await readFileSnapshot(WORKING_FILE);
    
    // Verify the section was added
    const newSection = readSection(snap.content, 'getting-started');
    assert(newSection !== null, 'Should find new getting started section');
    assert(newSection!.includes('Welcome to the API'), 'Should include new content');
    
    // Add child section under Endpoints
    const childSection = insertRelative(
      snap.content,
      'endpoints',
      'append_child',
      3, // Will be adjusted to parent + 1
      'WebSockets',
      `Real-time communication via WebSocket connections.

**Connection URL:** \`wss://api.example.com/ws\`

**Authentication:** Include token in connection parameters.`
    );
    
    // Get fresh snapshot before write
    const snapBeforeChild = await readFileSnapshot(WORKING_FILE);
    await writeFileIfUnchanged(WORKING_FILE, snapBeforeChild.mtimeMs, childSection);
    snap = await readFileSnapshot(WORKING_FILE);
    
    // Verify child section
    const wsSection = readSection(snap.content, 'websockets');
    assert(wsSection !== null, 'Should find WebSockets section');
    assert(wsSection!.includes('### WebSockets'), 'Should be at correct heading level');
    
    const updatedHeadings = listHeadings(snap.content);
    console.log('\nUpdated headings after insertions:');
    printHeadingsList(updatedHeadings);
    
    logSuccess('Successfully inserted sections using different modes');
  });

  // Test 7: Update section bodies
  runTest('Update Section Bodies', async () => {
    // Test depends on Insert New Sections working properly
    let snap = await readFileSnapshot(WORKING_FILE);
    
    const updatedGettingStarted = replaceSectionBody(
      snap.content,
      'getting-started',
      `Welcome to our comprehensive API! Here's your roadmap:

**Prerequisites:**

- Valid email address
- Understanding of REST APIs
- JSON knowledge helpful

**Step-by-Step Guide:**

1. **Account Creation** - Visit our developer portal and sign up.

2. **API Key Generation** - Navigate to your dashboard and create a new API key.

3. **First Request** - Test your setup with a simple request:

\`\`\`javascript
fetch('https://api.example.com/users', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(response => response.json())
.then(data => console.log(data));
\`\`\`

4. **Explore Documentation** - Browse the endpoints below to see what's possible.`
    );
    
    // Get fresh snapshot before write
    const snapBeforeUpdate = await readFileSnapshot(WORKING_FILE);
    await writeFileIfUnchanged(WORKING_FILE, snapBeforeUpdate.mtimeMs, updatedGettingStarted);
    snap = await readFileSnapshot(WORKING_FILE);
    
    // Verify update
    const updatedSection = readSection(snap.content, 'getting-started');
    assert(updatedSection !== null, 'Should find updated section');
    
    // Content verification successful
    
    assert(updatedSection!.includes('**Prerequisites:**'), 'Should include new content');
    assert(updatedSection!.includes('**Step-by-Step Guide:**'), 'Should include new content'); 
    assert(!updatedSection!.includes('Sign up for an account'), 'Should not include old content');
    
    console.log('\nUpdated Getting Started section preview:');
    console.log(updatedSection!.substring(0, 300) + '...');
    
    logSuccess('Successfully updated section body');
  });

  // Test 8: Rename headings
  runTest('Rename Headings', async () => {
    // Test depends on Insert New Sections working properly
    let snap = await readFileSnapshot(WORKING_FILE);
    
    const renamedSection = renameHeading(
      snap.content, 
      'websockets', 
      'Real-time Communication'
    );
    
    // Get fresh snapshot before write
    const snapBeforeRename = await readFileSnapshot(WORKING_FILE);
    await writeFileIfUnchanged(WORKING_FILE, snapBeforeRename.mtimeMs, renamedSection);
    snap = await readFileSnapshot(WORKING_FILE);
    
    // Verify rename
    const oldSection = readSection(snap.content, 'websockets');
    const newSection = readSection(snap.content, 'real-time-communication');
    
    assert(oldSection === null, 'Old slug should not exist');
    assert(newSection !== null, 'New slug should exist');
    assert(newSection!.includes('Real-time Communication'), 'Should have new title');
    
    // Verify slug generation
    const newSlug = titleToSlug('Real-time Communication');
    assert(newSlug === 'real-time-communication', 'Slug should be generated correctly');
    
    console.log(`\nRenamed: "WebSockets" -> "Real-time Communication" (slug: ${newSlug})`);
    
    logSuccess('Successfully renamed heading and updated slug');
  });

  // Test 9: Delete sections
  runTest('Delete Sections', async () => {
    // Test depends on previous tests working properly
    let snap = await readFileSnapshot(WORKING_FILE);
    const headingsBefore = listHeadings(snap.content);
    
    const withoutErrorHandling = deleteSection(snap.content, 'error-handling');
    // Get fresh snapshot before write
    const snapBeforeDelete = await readFileSnapshot(WORKING_FILE);
    await writeFileIfUnchanged(WORKING_FILE, snapBeforeDelete.mtimeMs, withoutErrorHandling);
    snap = await readFileSnapshot(WORKING_FILE);
    
    const headingsAfter = listHeadings(snap.content);
    
    // Verify deletion
    const deletedSection = readSection(snap.content, 'error-handling');
    assert(deletedSection === null, 'Deleted section should not exist');
    assert(headingsAfter.length < headingsBefore.length, 'Should have fewer headings');
    
    // Also delete child sections that were under Error Handling
    const commonErrorCodes = readSection(snap.content, 'common-error-codes');
    assert(commonErrorCodes === null, 'Child section should also be deleted');
    
    console.log(`\nHeadings count: ${headingsBefore.length} -> ${headingsAfter.length}`);
    
    logSuccess('Successfully deleted section and its children');
  });

  // Test 10: Test duplicate prevention
  runTest('Duplicate Heading Prevention', async () => {
    // Use original test file for this test to ensure clean state
    const snap = await readFileSnapshot(TEST_FILE);
    
    let errorThrown = false;
    try {
      insertRelative(
        snap.content,
        'overview',
        'insert_after', 
        2,
        'Overview', // This already exists at the same level
        'This should fail'
      );
    } catch (error) {
      errorThrown = true;
      const typedError = error as any;
      assert(typedError instanceof Error, 'Should throw an Error');
      assert('code' in typedError && typedError.code === 'DUPLICATE_HEADING', 'Should have correct error code');
      console.log(`\n✅ Correctly prevented duplicate: ${typedError.message}`);
    }
    
    assert(errorThrown, 'Should throw error for duplicate heading');
    
    logSuccess('Duplicate heading prevention working correctly');
  });

  // Test 11: Complex nested structure
  runTest('Complex Nested Structure', async () => {
    // Ensure fresh working copy
    const original = await readFileSnapshot(TEST_FILE);
    await fs.writeFile(WORKING_FILE, original.content, 'utf8');
    let snap = await readFileSnapshot(WORKING_FILE);
    
    // Add deeply nested structure under Products
    let updated = insertRelative(
      snap.content,
      'products',
      'append_child',
      4,
      'Advanced Features',
      'Additional product management capabilities.'
    );
    let snapForComplex = await readFileSnapshot(WORKING_FILE);
    await writeFileIfUnchanged(WORKING_FILE, snapForComplex.mtimeMs, updated);
    snapForComplex = await readFileSnapshot(WORKING_FILE);
    
    // Add sub-feature
    updated = insertRelative(
      snapForComplex.content,
      'advanced-features',
      'append_child',
      5,
      'Bulk Operations',
      `Perform operations on multiple products at once:

- Bulk create
- Bulk update  
- Bulk delete`
    );
    snapForComplex = await readFileSnapshot(WORKING_FILE);
    await writeFileIfUnchanged(WORKING_FILE, snapForComplex.mtimeMs, updated);
    snapForComplex = await readFileSnapshot(WORKING_FILE);
    
    // Add another sub-feature
    updated = insertRelative(
      snapForComplex.content,
      'advanced-features',
      'append_child',
      5,
      'Search & Filtering',
      `Advanced search capabilities:

- Full-text search
- Filter by attributes
- Sort results`
    );
    snapForComplex = await readFileSnapshot(WORKING_FILE);
    await writeFileIfUnchanged(WORKING_FILE, snapForComplex.mtimeMs, updated);
    snap = await readFileSnapshot(WORKING_FILE);
    
    // Verify complex structure
    const finalToc = buildToc(snap.content);
    console.log('\nFinal document structure:');
    printTocTree(finalToc);
    
    // Test reading deeply nested sections
    const bulkOps = readSection(snap.content, 'bulk-operations');
    const searchFilter = readSection(snap.content, 'search--filtering');
    
    assert(bulkOps !== null, 'Should find bulk operations section');
    assert(searchFilter !== null, 'Should find search & filtering section');
    assert(bulkOps!.includes('##### Bulk Operations'), 'Should be at depth 5');
    assert(searchFilter!.includes('##### Search & Filtering'), 'Should be at depth 5');
    
    logSuccess('Successfully built and navigated complex nested structure');
  });

  // Test 12: Edge cases and error handling
  runTest('Edge Cases and Error Handling', async () => {
    const snap = await readFileSnapshot(WORKING_FILE);
    
    // Test reading non-existent section
    const nonExistent = readSection(snap.content, 'this-does-not-exist');
    assert(nonExistent === null, 'Should return null for non-existent section');
    
    // Test invalid slug
    let errorThrown = false;
    try {
      readSection(snap.content, '');
    } catch (error) {
      errorThrown = true;
      assert(error instanceof Error && 'code' in error, 'Should throw proper error');
    }
    assert(errorThrown, 'Should throw error for invalid slug');
    
    // Test slug generation edge cases
    assert(titleToSlug('Hello World') === 'hello-world', 'Basic slug generation');
    assert(titleToSlug('GET /users/:id') === 'get-usersid', 'Complex title slug generation');
    assert(titleToSlug('Multiple   Spaces') === 'multiple---spaces', 'Multiple spaces handling');
    
    logSuccess('Edge cases and error handling work correctly');
  });

  // Execute all tests sequentially
  await executeTestQueue();

  // Final results
  const finalFile = path.join(DOCS_DIR, 'final-result.md');
  const finalSnap = await readFileSnapshot(WORKING_FILE);
  await fs.writeFile(finalFile, finalSnap.content, 'utf8');

  // Print test summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  
  const passed = testResults.filter(t => t.passed).length;
  const total = testResults.length;
  
  console.log(`\nTests passed: ${passed}/${total}`);
  console.log(`Success rate: ${Math.round((passed / total) * 100)}%`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Markdown CRUD operations are working correctly.');
    console.log(`\nFinal test document saved to: ${finalFile}`);
    console.log('\nFeatures tested:');
    console.log('✅ Parse headings with hierarchy');
    console.log('✅ Build nested table of contents');  
    console.log('✅ Read sections by slug');
    console.log('✅ Insert sections (before/after/child)');
    console.log('✅ Update section bodies');
    console.log('✅ Rename headings');
    console.log('✅ Delete sections');
    console.log('✅ Prevent duplicate headings');
    console.log('✅ Handle complex nested structures');
    console.log('✅ Edge case and error handling');
  } else {
    console.log('\n❌ Some tests failed:');
    testResults.forEach(test => {
      if (!test.passed) {
        console.log(`  - ${test.name}: ${test.error}`);
      }
    });
    process.exit(1);
  }
}

// Export for use by other modules
export { runTestSuite };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTestSuite().catch((error) => {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  });
}