#!/usr/bin/env node

/**
 * Test section operations specifically
 */

import { spawn } from 'child_process';

class SectionTester {
  constructor() {
    this.requestId = 1;
    this.server = null;
    this.responses = new Map();
  }

  async start() {
    console.log('🔧 Testing Section Operations...\n');
    
    this.server = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    this.server.stderr.on('data', (data) => {
      console.log(`[STDERR] ${data.toString().trim()}`);
    });

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
          // Ignore
        }
      });
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      const request = { jsonrpc: '2.0', id, method, params };

      this.responses.set(id, { resolve, reject });
      
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
      if (response.result?.content?.[0]?.text) {
        return JSON.parse(response.result.content[0].text);
      }
      return response;
    } catch (error) {
      return { error: error.message };
    }
  }

  async cleanup() {
    if (this.server) {
      this.server.kill();
    }
  }
}

async function testSectionOperations() {
  const tester = new SectionTester();
  
  try {
    await tester.start();
    
    // First unlock tools
    console.log('1. Unlocking document tools...');
    const unlock = await tester.callTool('unlock_document_tools', { show_overview: false });
    console.log('Unlock result:', unlock.success ? '✅ Success' : `❌ ${unlock.error}`);
    
    // Create a test document
    console.log('\n2. Creating test document...');
    const create = await tester.callTool('create_document', {
      path: '/section-test/test-doc',
      title: 'Section Operations Test',
      template: 'api-reference'
    });
    console.log('Create result:', create.success ? '✅ Success' : `❌ ${create.error}`);
    
    // List sections first
    console.log('\n3. Browsing to see document structure...');
    const browse = await tester.callTool('browse_documents', { path: '/section-test' });
    console.log('Browse result:', browse.success ? `✅ Found ${browse.documents?.length} docs` : `❌ ${browse.error}`);
    
    // Try to insert section
    console.log('\n4. Testing insert_section...');
    const insert = await tester.callTool('insert_section', {
      path: '/section-test/test-doc.md',
      reference_section: 'overview',
      position: 'after',
      title: 'New Test Section',
      content: 'This is a test section with some content.'
    });
    console.log('Insert result:', insert);
    
    // Try to update a section
    console.log('\n5. Testing update_document_section...');
    const update = await tester.callTool('update_document_section', {
      path: '/section-test/test-doc.md',
      section_slug: 'new-test-section',
      content: 'Updated content for the test section with more details.',
      operation: 'replace'
    });
    console.log('Update result:', update);
    
    // Try to archive
    console.log('\n6. Testing archive_document...');
    const archive = await tester.callTool('archive_document', {
      path: '/section-test/test-doc.md',
      reason: 'Testing archive functionality'
    });
    console.log('Archive result:', archive);
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await tester.cleanup();
  }
}

testSectionOperations();