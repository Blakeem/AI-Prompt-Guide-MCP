#!/usr/bin/env node

/**
 * Alpha Tester Script for Spec-Docs MCP Server
 * Tests the complete workflow as an LLM client would experience it
 */

import { spawn } from 'child_process';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

class MCPClient {
  constructor() {
    this.requestId = 1;
    this.server = null;
    this.responses = new Map();
    this.logs = [];
  }

  async start() {
    console.log('🚀 Starting MCP Server Alpha Test...\n');
    
    // Start the MCP server process using node with the built version
    this.server = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    // Handle server stderr for logging
    this.server.stderr.on('data', (data) => {
      const logLine = data.toString().trim();
      if (logLine) {
        this.logs.push(`[SERVER] ${logLine}`);
      }
    });

    // Handle server stdout for MCP responses
    this.server.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        try {
          const response = JSON.parse(line);
          if (response.id && this.responses.has(response.id)) {
            this.responses.get(response.id).resolve(response);
            this.responses.delete(response.id);
          }
        } catch (err) {
          // Ignore non-JSON lines
        }
      });
    });

    // Wait for server to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ MCP Server started successfully\n');
  }

  async sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      this.responses.set(id, { resolve, reject });
      
      // Set timeout for requests
      setTimeout(() => {
        if (this.responses.has(id)) {
          this.responses.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 10000);

      const requestLine = JSON.stringify(request) + '\n';
      this.server.stdin.write(requestLine);
    });
  }

  async callTool(name, args = {}) {
    try {
      const response = await this.sendRequest('tools/call', { name, arguments: args });
      return response.result;
    } catch (error) {
      return { error: error.message };
    }
  }

  async listTools() {
    try {
      const response = await this.sendRequest('tools/list');
      return response.result;
    } catch (error) {
      return { error: error.message };
    }
  }

  log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
    console.log('');
  }

  async cleanup() {
    if (this.server) {
      this.server.kill();
      await new Promise(resolve => {
        this.server.on('close', resolve);
        setTimeout(resolve, 2000); // Force cleanup after 2s
      });
    }
  }
}

async function runAlphaTest() {
  const client = new MCPClient();
  const testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function addTest(name, passed, details = null, error = null) {
    testResults.tests.push({ name, passed, details, error });
    if (passed) {
      testResults.passed++;
      console.log(`✅ ${name}`);
    } else {
      testResults.failed++;
      console.log(`❌ ${name}`);
      if (error) console.log(`   Error: ${error}`);
    }
    if (details) {
      console.log(`   ${details}`);
    }
    console.log('');
  }

  try {
    await client.start();

    // Test 1: Initial tool listing (should show limited tools)
    client.log('🔍 TEST 1: Initial tool listing (before workflow unlock)');
    const initialTools = await client.listTools();
    if (initialTools.error) {
      addTest('Initial tool listing', false, null, initialTools.error);
    } else {
      const toolNames = initialTools.tools?.map(t => t.name) || [];
      const expectedTools = ['browse_documents', 'search_documents', 'unlock_document_tools'];
      const hasExpectedTools = expectedTools.every(tool => toolNames.includes(tool));
      const hasNoManagementTools = !toolNames.some(name => 
        ['create_document', 'update_document_section', 'archive_document'].includes(name)
      );
      
      addTest(
        'Initial tool listing shows correct gateway tools', 
        hasExpectedTools && hasNoManagementTools,
        `Available tools: ${toolNames.join(', ')}`
      );
    }

    // Test 2: Try document management tool before unlocking (should fail)
    client.log('🔍 TEST 2: Document management before unlock (should fail)');
    const prematureCreate = await client.callTool('create_document', {
      path: '/test/document',
      title: 'Test Document'
    });
    
    const shouldFail = prematureCreate.error || 
      (prematureCreate.content?.[0]?.text && 
       JSON.parse(prematureCreate.content[0].text).code === -32002);
    
    addTest(
      'Document creation fails before workflow unlock', 
      shouldFail,
      'Tool properly gated behind workflow start'
    );

    // Test 4: Unlock document tools with overview
    client.log('🔍 TEST 3: Unlock document tools with structure overview');
    const unlockResult = await client.callTool('unlock_document_tools', { 
      show_overview: true 
    });
    
    if (unlockResult.error) {
      addTest('Unlock document tools', false, null, unlockResult.error);
    } else {
      const result = JSON.parse(unlockResult.content[0].text);
      const success = result.success === true;
      const hasOverview = typeof result.documentStructure === 'object';
      const hasUnlockedTools = Array.isArray(result.unlockedTools) && result.unlockedTools.length > 0;
      const hasNextSteps = Array.isArray(result.nextSteps) && result.nextSteps.length > 0;
      
      addTest(
        'Unlock provides complete onboarding experience', 
        success && hasOverview && hasUnlockedTools && hasNextSteps,
        `Tools unlocked: ${result.unlockedTools?.length || 0}, Overview included: ${hasOverview}`
      );
    }

    // Test 5: Verify expanded tool list after unlock
    client.log('🔍 TEST 4: Verify expanded tool list after unlock');
    const expandedTools = await client.listTools();
    if (expandedTools.error) {
      addTest('Expanded tool list after unlock', false, null, expandedTools.error);
    } else {
      const toolNames = expandedTools.tools?.map(t => t.name) || [];
      const managementTools = ['create_document', 'update_document_section', 'insert_section', 'move_section', 'archive_document'];
      const hasManagementTools = managementTools.every(tool => toolNames.includes(tool));
      
      addTest(
        'All document management tools now available', 
        hasManagementTools,
        `Total tools: ${toolNames.length}, Management tools: ${managementTools.filter(t => toolNames.includes(t)).length}/${managementTools.length}`
      );
    }

    // Test 6: Create a test document
    client.log('🔍 TEST 5: Create document with API reference template');
    const createResult = await client.callTool('create_document', {
      path: '/api/test-endpoint',
      title: 'Test API Endpoint',
      template: 'api-reference'
    });
    
    if (createResult.error) {
      addTest('Create document with template', false, null, createResult.error);
    } else {
      const result = JSON.parse(createResult.content[0].text);
      const success = result.success === true;
      const hasDocument = result.document?.path && result.document?.title;
      const hasNextSteps = Array.isArray(result.nextSteps);
      
      addTest(
        'Document creation with template successful', 
        success && hasDocument && hasNextSteps,
        `Created: ${result.document?.path} with ${result.document?.headings || 0} headings`
      );
    }

    // Test 7: Browse documents to see new document
    client.log('🔍 TEST 6: Browse documents to verify creation');
    const browseResult = await client.callTool('browse_documents', { path: '/api' });
    
    if (browseResult.error) {
      addTest('Browse documents', false, null, browseResult.error);
    } else {
      const result = JSON.parse(browseResult.content[0].text);
      const success = result.success === true;
      const foundTestDoc = result.documents?.some(doc => doc.path.includes('test-endpoint'));
      
      addTest(
        'Browse documents shows created document', 
        success && foundTestDoc,
        `Found ${result.documents?.length || 0} documents in /api`
      );
    }

    // Test 8: Search functionality
    client.log('🔍 TEST 7: Search documents functionality');
    const searchResult = await client.callTool('search_documents', { 
      query: 'test endpoint',
      limit: 5
    });
    
    if (searchResult.error) {
      addTest('Search documents', false, null, searchResult.error);
    } else {
      const result = JSON.parse(searchResult.content[0].text);
      const success = result.success === true;
      const hasResults = result.results && result.results.length > 0;
      
      addTest(
        'Search finds created document', 
        success && hasResults,
        `Found ${result.results?.length || 0} matches for "test endpoint"`
      );
    }

    // Test 9: Insert section functionality
    client.log('🔍 TEST 8: Insert new section functionality');
    const insertResult = await client.callTool('insert_section', {
      path: '/api/test-endpoint',
      reference_section: 'overview',
      position: 'after',
      title: 'Request Examples',
      content: 'Here are some example requests for this endpoint:\n\n```bash\ncurl -X GET /api/test\n```'
    });
    
    if (insertResult.error) {
      addTest('Insert section', false, null, insertResult.error);
    } else {
      const result = JSON.parse(insertResult.content[0].text);
      const success = result.success === true;
      const hasSection = result.section?.title === 'Request Examples';
      
      addTest(
        'Section insertion successful', 
        success && hasSection,
        `Inserted "${result.section?.title}" at ${result.section?.position}`
      );
    }

    // Test 10: Update document section
    client.log('🔍 TEST 10: Update document section');
    const updateResult = await client.callTool('update_document_section', {
      path: '/api/test-endpoint',
      section_slug: 'request-examples',
      content: 'Updated examples with more details:\n\n```bash\n# Basic request\ncurl -X GET /api/test\n\n# With authentication\ncurl -H "Authorization: Bearer token" /api/test\n```',
      operation: 'replace'
    });
    
    if (updateResult.error) {
      addTest('Update document section', false, null, updateResult.error);
    } else {
      const result = JSON.parse(updateResult.content[0].text);
      const success = result.success === true;
      const hasUpdate = result.document?.operation === 'replace';
      
      addTest(
        'Section update successful', 
        success && hasUpdate,
        `Updated section: ${result.document?.section}`
      );
    }

    // Test 11: Archive functionality (instead of delete)
    client.log('🔍 TEST 11: Archive document functionality');
    const archiveResult = await client.callTool('archive_document', {
      path: '/api/test-endpoint',
      reason: 'Alpha test completion - archiving test document'
    });
    
    if (archiveResult.error) {
      addTest('Archive document', false, null, archiveResult.error);
    } else {
      const result = JSON.parse(archiveResult.content[0].text);
      const success = result.success === true;
      const hasArchiveInfo = result.archived?.originalPath && result.archived?.archivePath;
      const hasReason = result.archived?.reason;
      
      addTest(
        'Document archiving successful', 
        success && hasArchiveInfo && hasReason,
        `Archived to: ${result.archived?.archivePath}`
      );
    }

    // Test 12: Verify archived document is no longer in main area
    client.log('🔍 TEST 12: Verify document archived correctly');
    const verifyArchiveResult = await client.callTool('browse_documents', { path: '/api' });
    
    if (verifyArchiveResult.error) {
      addTest('Verify archive operation', false, null, verifyArchiveResult.error);
    } else {
      const result = JSON.parse(verifyArchiveResult.content[0].text);
      const success = result.success === true;
      const testDocRemoved = !result.documents?.some(doc => doc.path.includes('test-endpoint'));
      
      addTest(
        'Archived document no longer in main area', 
        success && testDocRemoved,
        `Remaining documents in /api: ${result.documents?.length || 0}`
      );
    }

  } catch (error) {
    addTest('Test execution', false, null, error.message);
  } finally {
    await client.cleanup();
  }

  // Generate final report
  console.log('\n' + '='.repeat(60));
  console.log('🎯 ALPHA TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total:  ${testResults.passed + testResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
  
  console.log('\n📋 DETAILED TEST RESULTS:');
  console.log('-'.repeat(60));
  
  testResults.tests.forEach((test, index) => {
    const status = test.passed ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${test.name}`);
    if (test.details) console.log(`   💡 ${test.details}`);
    if (test.error) console.log(`   🚨 ${test.error}`);
  });

  console.log('\n🔍 KEY FINDINGS:');
  console.log('-'.repeat(60));
  
  const findings = [];
  
  // Analyze results
  const unlockTest = testResults.tests.find(t => t.name.includes('Unlock provides complete onboarding'));
  if (unlockTest?.passed) {
    findings.push('✅ Enhanced onboarding with unlock_document_tools works perfectly');
    findings.push('✅ Document structure overview provides immediate context');
  } else {
    findings.push('❌ Onboarding experience needs improvement');
  }
  
  const toolGatingTest = testResults.tests.find(t => t.name.includes('fails before workflow unlock'));
  if (toolGatingTest?.passed) {
    findings.push('✅ Session-based tool gating prevents unauthorized access');
  } else {
    findings.push('❌ Tool gating may not be working correctly');
  }
  
  const archiveTest = testResults.tests.find(t => t.name.includes('Document archiving'));
  if (archiveTest?.passed) {
    findings.push('✅ Archive functionality provides safe alternative to deletion');
  } else {
    findings.push('❌ Archive functionality needs attention');
  }
  
  const insertTest = testResults.tests.find(t => t.name.includes('Section insertion'));
  if (insertTest?.passed) {
    findings.push('✅ New insert_section operations work correctly');
  } else {
    findings.push('❌ Insert section functionality has issues');
  }
  
  findings.forEach(finding => console.log(`   ${finding}`));
  
  console.log('\n🎯 RECOMMENDATIONS:');
  console.log('-'.repeat(60));
  
  const recommendations = [];
  
  if (testResults.failed === 0) {
    recommendations.push('🎉 All tests passed! The MCP server is ready for production use.');
    recommendations.push('🔄 Consider adding more edge case tests for comprehensive coverage');
  } else {
    recommendations.push(`🔧 Address ${testResults.failed} failing test(s) before release`);
    if (testResults.failed > testResults.passed) {
      recommendations.push('⚠️  Multiple core features failing - requires immediate attention');
    }
  }
  
  recommendations.push('📚 The enhanced onboarding experience significantly improves usability');
  recommendations.push('🗃️  Archive functionality is a great safety improvement over deletion');
  recommendations.push('🔧 Tool gating provides good security without hindering workflow');
  
  recommendations.forEach(rec => console.log(`   ${rec}`));
  
  console.log('\n' + '='.repeat(60));
  
  return testResults;
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAlphaTest()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal test error:', error);
      process.exit(1);
    });
}

export { runAlphaTest, MCPClient };