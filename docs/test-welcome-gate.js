#!/usr/bin/env node

/**
 * Test script for the Welcome Gate implementation
 * This simulates a persistent MCP session
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
  
  console.log(`\n→ Sending: ${method}`);
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
            console.log(`✓ Result:`, content.message || content);
          } else if (json.result.messages) {
            console.log(`✓ Prompt content received (${json.result.messages[0].content.text.split('\n')[0]}...)`);
          } else {
            console.log(`✓ Response:`, json.result);
          }
        }
        // Handle errors
        else if (json.error) {
          console.log(`❌ Error:`, json.error);
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

// Capture stderr (logs) - no special handling needed anymore
server.stderr.on('data', (data) => {
  // Logs are for debugging if needed
});

// Run the test sequence
async function runTest() {
  console.log('🚀 Starting Welcome Gate Test\n');
  console.log('=' .repeat(50));
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Step 1: Check initial tools (should be 2)
  console.log('\n📍 Step 1: Check initial tools');
  await sendRequest('tools/list');
  
  // Step 2: Check prompts
  console.log('\n📍 Step 2: Check available prompts');
  await sendRequest('prompts/list');
  
  // Step 3: Get welcome prompt
  console.log('\n📍 Step 3: Read welcome prompt');
  await sendRequest('prompts/get', { name: 'welcome' });
  
  // Step 4: Try to call test_tool before acknowledgment (should fail)
  console.log('\n📍 Step 4: Try test_tool before acknowledgment');
  await sendRequest('tools/call', { 
    name: 'test_tool', 
    arguments: { message: 'Trying early!' } 
  });
  
  // Step 5: Acknowledge setup
  console.log('\n📍 Step 5: Acknowledge setup');
  await sendRequest('tools/call', { 
    name: 'acknowledge_setup', 
    arguments: {} 
  });
  
  // Step 6: Check tools again (should be 3 now)
  console.log('\n📍 Step 6: Check tools after acknowledgment');
  await sendRequest('tools/list');
  
  // Step 7: Call test_tool (should work now)
  console.log('\n📍 Step 7: Call test_tool after acknowledgment');
  await sendRequest('tools/call', { 
    name: 'test_tool', 
    arguments: { message: 'Gate passed successfully!' } 
  });
  
  // Step 8: Call acknowledge again (should be idempotent)
  console.log('\n📍 Step 8: Acknowledge again (idempotent test)');
  await sendRequest('tools/call', { 
    name: 'acknowledge_setup', 
    arguments: {} 
  });
  
  // Wait a bit for final responses
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Test Complete!');
  
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