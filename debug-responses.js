#!/usr/bin/env node

/**
 * Debug script to examine actual MCP responses
 */

import { spawn } from 'child_process';

class MCPDebugger {
  constructor() {
    this.requestId = 1;
    this.server = null;
    this.responses = new Map();
  }

  async start() {
    console.log('🚀 Starting MCP Debug Session...\n');
    
    this.server = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    this.server.stderr.on('data', (data) => {
      console.log(`[SERVER STDERR] ${data.toString().trim()}`);
    });

    this.server.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        try {
          const response = JSON.parse(line);
          console.log('[SERVER RESPONSE]', JSON.stringify(response, null, 2));
          if (response.id && this.responses.has(response.id)) {
            this.responses.get(response.id).resolve(response);
            this.responses.delete(response.id);
          }
        } catch (err) {
          console.log('[SERVER RAW]', line);
        }
      });
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
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

      console.log('[CLIENT REQUEST]', JSON.stringify(request, null, 2));
      this.responses.set(id, { resolve, reject });
      
      setTimeout(() => {
        if (this.responses.has(id)) {
          this.responses.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 5000);

      const requestLine = JSON.stringify(request) + '\n';
      this.server.stdin.write(requestLine);
    });
  }

  async cleanup() {
    if (this.server) {
      this.server.kill();
    }
  }
}

async function debugSession() {
  const debug = new MCPDebugger();
  
  try {
    await debug.start();
    
    console.log('\n=== TESTING TEST_CONNECTION ===');
    const connectionResponse = await debug.sendRequest('tools/call', { 
      name: 'test_connection', 
      arguments: { includeServerInfo: true } 
    });
    console.log('Connection Response:', JSON.stringify(connectionResponse, null, 2));
    
    console.log('\n=== TESTING UNLOCK_DOCUMENT_TOOLS ===');
    const unlockResponse = await debug.sendRequest('tools/call', { 
      name: 'unlock_document_tools', 
      arguments: { show_overview: true } 
    });
    console.log('Unlock Response:', JSON.stringify(unlockResponse, null, 2));
    
    console.log('\n=== TESTING CREATE_DOCUMENT ===');
    const createResponse = await debug.sendRequest('tools/call', { 
      name: 'create_document', 
      arguments: { 
        path: '/debug/test-doc',
        title: 'Debug Test Document',
        template: 'blank'
      } 
    });
    console.log('Create Response:', JSON.stringify(createResponse, null, 2));
    
    console.log('\n=== TESTING SEARCH ===');
    const searchResponse = await debug.sendRequest('tools/call', { 
      name: 'search_documents', 
      arguments: { 
        query: 'debug test',
        limit: 5
      } 
    });
    console.log('Search Response:', JSON.stringify(searchResponse, null, 2));
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await debug.cleanup();
    process.exit(0);
  }
}

debugSession();