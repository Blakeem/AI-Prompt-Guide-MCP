#!/usr/bin/env node

/**
 * Test script to verify create_document progressive discovery flow
 */

const { spawn } = require('child_process');
const fs = require('fs');

// MCP commands to test the flow
const commands = [
  {
    name: 'Initial tools/list',
    request: '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
  },
  {
    name: 'Call create_document with no params',
    request: '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_document","arguments":{}},"id":2}'
  },
  {
    name: 'Tools/list after stage 0',
    request: '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":3}'
  },
  {
    name: 'Call create_document with type',
    request: '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_document","arguments":{"type":"api_spec"}},"id":4}'
  },
  {
    name: 'Tools/list after stage 1',
    request: '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":5}'
  }
];

let currentCommand = 0;
let mcp;

function sendCommand() {
  if (currentCommand >= commands.length) {
    console.log('\n✅ All tests completed!');
    mcp.kill();
    process.exit(0);
  }

  const cmd = commands[currentCommand];
  console.log(`\n📤 [${currentCommand + 1}/${commands.length}] ${cmd.name}:`);
  console.log(`Request: ${cmd.request}`);

  mcp.stdin.write(cmd.request + '\n');
  currentCommand++;
}

// Start MCP server
console.log('🚀 Starting MCP server...\n');
mcp = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, LOG_LEVEL: 'error' }
});

mcp.stdout.setEncoding('utf8');
mcp.stderr.setEncoding('utf8');

// Buffer for incomplete JSON
let buffer = '';

mcp.stdout.on('data', (data) => {
  buffer += data;

  // Try to parse complete JSON objects from buffer
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep incomplete line in buffer

  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);

        // Pretty print the response
        console.log('📥 Response:');

        if (response.result) {
          // For tools/list, show the create_document schema
          if (response.result.tools) {
            const createDoc = response.result.tools.find(t => t.name === 'create_document');
            if (createDoc) {
              console.log('  create_document tool:');
              console.log('    Description:', createDoc.description);
              console.log('    Schema properties:', JSON.stringify(createDoc.inputSchema.properties, null, 2));
            }
          }
          // For tool calls, show the stage info
          else if (response.result.content) {
            const content = JSON.parse(response.result.content[0].text);
            console.log('  Stage:', content.stage);
            if (content.next_step) {
              console.log('  Next step:', content.next_step);
            }
          }
        }

        // Send next command after a short delay
        setTimeout(sendCommand, 500);
      } catch (e) {
        // Not valid JSON yet, continue buffering
      }
    }
  }
});

mcp.stderr.on('data', (data) => {
  // Only log errors, not debug info
  if (data.includes('ERROR')) {
    console.error('❌ Error:', data);
  }
});

mcp.on('close', (code) => {
  if (code !== 0) {
    console.error(`MCP process exited with code ${code}`);
  }
});

// Start the test flow
setTimeout(sendCommand, 1000);