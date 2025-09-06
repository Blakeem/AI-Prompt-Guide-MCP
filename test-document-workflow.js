#!/usr/bin/env node

/**
 * Test script for the Document Workflow implementation
 * This simulates a persistent MCP session for document management
 */

import { spawn } from 'child_process';

const server = spawn('node', ['dist/index.js']);

let buffer = '';
let requestId = 1;

// Helper to send JSON-RPC request
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method,
    params
  };
  
  console.log(`\n→ Sending: ${method}${params.name ? ` (${params.name})` : ''}`);
  server.stdin.write(JSON.stringify(request) + '\n');
  
  return new Promise((resolve) => {
    setTimeout(resolve, 500); // Give time for response
  });
}

// Parse responses from stdout
server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const json = JSON.parse(line);
        
        // Handle notifications
        if (json.method) {
          console.log(`📢 Notification: ${json.method}`);
        } 
        // Handle responses
        else if (json.result) {
          if (json.result.tools) {
            const toolNames = json.result.tools.map(t => t.name);
            console.log(`✓ Tools available: ${toolNames.join(', ')}`);
          } else if (json.result.prompts) {
            const promptNames = json.result.prompts.map(p => p.name);
            console.log(`✓ Prompts available: ${promptNames.join(', ')}`);
          } else if (json.result.content) {
            const content = JSON.parse(json.result.content[0].text);
            if (content.success) {
              console.log(`✓ Success:`, content.message || content.success);
              if (content.availableTools) {
                console.log(`  Available tools after workflow start:`, content.availableTools.length);
              }
              if (content.document) {
                console.log(`  Created document: ${content.document.path} - "${content.document.title}"`);
              }
            } else {
              console.log(`✓ Result:`, content);
            }
          } else if (json.result.messages) {
            const text = json.result.messages[0].content.text;
            const title = text.split('\n')[0].replace('# ', '');
            console.log(`✓ Prompt content: "${title}..." (${text.length} chars)`);
          } else {
            console.log(`✓ Response:`, json.result);
          }
        }
        // Handle errors
        else if (json.error) {
          console.log(`❌ Error:`, json.error.message);
        }
      } catch (e) {
        // Not JSON, probably log output
        if (!line.includes('[INFO ]') && !line.includes('[DEBUG]')) {
          console.log(`📝 ${line}`);
        }
      }
    }
  }
});

// Capture stderr (logs)
server.stderr.on('data', (data) => {
  const lines = data.toString().split('\n');
  for (const line of lines) {
    if (line.includes('list_changed')) {
      console.log(`🔔 Server: ${line}`);
    }
  }
});

// Run the test sequence
async function runTest() {
  console.log('🚀 Starting Document Workflow Test\n');
  console.log('=' .repeat(60));
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Step 1: Check initial tools (should include browse/search + workflow starter)
  console.log('\n📍 Step 1: Check initial tools');
  await sendRequest('tools/list');
  
  // Step 2: Check prompts (should show documentation guidance)
  console.log('\n📍 Step 2: Check available prompts');
  await sendRequest('prompts/list');
  
  // Step 3: Get document workflow intro prompt
  console.log('\n📍 Step 3: Read document workflow intro');
  await sendRequest('prompts/get', { name: 'document_workflow_intro' });
  
  // Step 4: Try to create document before starting workflow (should fail)
  console.log('\n📍 Step 4: Try create_document before starting workflow');
  await sendRequest('tools/call', { 
    name: 'create_document', 
    arguments: { 
      path: '/api/authentication',
      title: 'API Authentication Guide'
    } 
  });
  
  // Step 5: Start document workflow
  console.log('\n📍 Step 5: Start document workflow');
  await sendRequest('tools/call', { 
    name: 'start_document_workflow', 
    arguments: {} 
  });
  
  // Step 6: Check tools again (should include document management tools)
  console.log('\n📍 Step 6: Check tools after starting workflow');
  await sendRequest('tools/list');
  
  // Step 7: Create a document (should work now)
  console.log('\n📍 Step 7: Create a document after starting workflow');
  await sendRequest('tools/call', { 
    name: 'create_document', 
    arguments: { 
      path: '/api/authentication',
      title: 'API Authentication Guide',
      template: 'api-reference'
    } 
  });
  
  // Step 8: Test browse documents (always available)
  console.log('\n📍 Step 8: Test browse documents');
  await sendRequest('tools/call', { 
    name: 'browse_documents', 
    arguments: { 
      path: '/api',
      depth: 2
    } 
  });
  
  // Step 9: Test search documents (always available)
  console.log('\n📍 Step 9: Test search documents');
  await sendRequest('tools/call', { 
    name: 'search_documents', 
    arguments: { 
      query: 'authentication',
      limit: 5
    } 
  });
  
  // Step 10: Start workflow again (should be idempotent)
  console.log('\n📍 Step 10: Start workflow again (idempotent test)');
  await sendRequest('tools/call', { 
    name: 'start_document_workflow', 
    arguments: {} 
  });
  
  // Wait a bit for final responses
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Document Workflow Test Complete!');
  console.log('\nKey Features Tested:');
  console.log('📂 Path-based document organization');
  console.log('📝 Workflow-gated document management tools'); 
  console.log('🔍 Always-available browse & search');
  console.log('📋 Template-based document creation');
  console.log('📚 Research-focused guidance prompts');
  
  server.kill();
  process.exit(0);
}

// Handle errors
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

// Run the test
runTest().catch(err => {
  console.error('Test failed:', err);
  server.kill();
  process.exit(1);
});