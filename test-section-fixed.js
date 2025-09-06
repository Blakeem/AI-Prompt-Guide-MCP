#!/usr/bin/env node

/**
 * Test section operations with correct section references
 */

import { spawn } from 'child_process';

class SectionTester {
  constructor() {
    this.requestId = 1;
    this.server = null;
    this.responses = new Map();
  }

  async start() {
    console.log('🔧 Testing Section Operations (Fixed)...\n');
    
    this.server = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    this.server.stderr.on('data', (data) => {
      const line = data.toString().trim();
      if (line.includes('ERROR') || line.includes('WARNING')) {
        console.log(`[SERVER] ${line}`);
      }
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
          // Ignore non-JSON
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

      this.server.stdin.write(JSON.stringify(request) + '\n');
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

async function testCorrectSections() {
  const tester = new SectionTester();
  
  try {
    await tester.start();
    
    // Unlock tools
    console.log('1. Unlocking tools...');
    await tester.callTool('unlock_document_tools');
    
    // Create document with API reference template (which should have an overview)
    console.log('2. Creating document with API reference template...');
    const create = await tester.callTool('create_document', {
      path: '/test-fixed/api-doc',
      title: 'API Test Document',
      template: 'api-reference'
    });
    console.log('Create:', create.success ? '✅ Success' : `❌ ${create.error || 'Unknown error'}`);
    
    // Create another document and add some initial sections
    console.log('3. Creating blank document to test...');
    const create2 = await tester.callTool('create_document', {
      path: '/test-fixed/blank-doc',
      title: 'Blank Test Document',
      template: 'blank'
    });
    console.log('Create blank:', create2.success ? '✅ Success' : `❌ ${create2.error || 'Unknown error'}`);
    
    // Insert section using table-of-contents as reference (which we know exists)
    console.log('4. Testing insert_section with table-of-contents reference...');
    const insert = await tester.callTool('insert_section', {
      path: '/test-fixed/blank-doc.md',
      reference_section: 'table-of-contents',
      position: 'after',
      title: 'Getting Started',
      content: 'This section covers the basics of getting started with our API.'
    });
    console.log('Insert result:');
    if (insert.success) {
      console.log(`  ✅ Success: ${insert.message}`);
      console.log(`  📍 Inserted: ${insert.section?.title} at ${insert.section?.position}`);
    } else {
      console.log(`  ❌ Failed: ${insert.error || JSON.stringify(insert, null, 2)}`);
    }
    
    // Now update the section we just created
    console.log('5. Testing update of inserted section...');
    const update = await tester.callTool('update_document_section', {
      path: '/test-fixed/blank-doc.md',
      section_slug: 'getting-started',
      content: 'This updated section provides comprehensive guidance on getting started:\n\n1. First, obtain your API key\n2. Set up authentication\n3. Make your first request',
      operation: 'replace'
    });
    console.log('Update result:');
    if (update.success) {
      console.log(`  ✅ Success: ${update.message}`);
    } else {
      console.log(`  ❌ Failed: ${update.error || JSON.stringify(update, null, 2)}`);
    }
    
    // Insert another section using the one we just created as reference
    console.log('6. Testing insert_section with newly created section as reference...');
    const insert2 = await tester.callTool('insert_section', {
      path: '/test-fixed/blank-doc.md',
      reference_section: 'getting-started',
      position: 'after',
      title: 'Authentication',
      content: 'Details about authentication methods and security.'
    });
    console.log('Second insert result:');
    if (insert2.success) {
      console.log(`  ✅ Success: ${insert2.message}`);
    } else {
      console.log(`  ❌ Failed: ${insert2.error || JSON.stringify(insert2, null, 2)}`);
    }
    
    // Test search to verify our content
    console.log('7. Testing search for our content...');
    const search = await tester.callTool('search_documents', {
      query: 'getting started',
      limit: 5
    });
    console.log('Search result:');
    if (search.success) {
      console.log(`  ✅ Found ${search.results?.length} matches`);
      search.results?.forEach(result => {
        console.log(`    📄 ${result.document.path} - ${result.document.title}`);
        result.matches?.forEach(match => {
          console.log(`      🎯 ${match.type}: "${match.snippet}" (${match.relevance})`);
        });
      });
    } else {
      console.log(`  ❌ Failed: ${search.error}`);
    }
    
    // Test archive
    console.log('8. Testing archive...');
    const archive = await tester.callTool('archive_document', {
      path: '/test-fixed/blank-doc.md',
      reason: 'Completed testing of section operations'
    });
    console.log('Archive result:');
    if (archive.success) {
      console.log(`  ✅ Success: Archived to ${archive.archived?.archivePath}`);
    } else {
      console.log(`  ❌ Failed: ${archive.error || JSON.stringify(archive, null, 2)}`);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    await tester.cleanup();
  }
}

testCorrectSections();