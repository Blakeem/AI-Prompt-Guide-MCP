/**
 * Welcome Gate implementation - demonstrates dynamic tool exposure
 * Tools are revealed only after acknowledging the welcome prompt
 */

import type { DocumentManager } from './document-manager.js';
import type { HeadingDepth } from './types/index.js';

// Using a custom error type that matches McpError structure

/**
 * Session state tracking for each connection
 */
export interface SessionState {
  sessionId: string;
}

/**
 * Manages per-session state
 */
export class SessionStore {
  private readonly sessions = new Map<string, SessionState>();

  /**
   * Get or create session state
   */
  getSession(sessionId: string): SessionState {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
      });
    }
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found - this should not happen`);
    }
    return session;
  }


  /**
   * Reset session (for testing)
   */
  reset(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Get all sessions (for debugging)
   */
  getAllSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }
}

/**
 * Tool definitions based on session state
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

/**
 * Get all available tools
 */
export function getVisibleTools(_state: SessionState): ToolDefinition[] {
  const tools: ToolDefinition[] = [
    {
      name: 'list_documents',
      description: 'Browse and list existing documents in the knowledge base',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Document path to browse (e.g., "/api", "/guides")',
            default: '/',
          },
          depth: {
            type: 'number',
            description: 'Maximum depth to traverse (1-5)',
            minimum: 1,
            maximum: 5,
            default: 2,
          },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'search_documents',
      description: 'Search through existing documents by content, title, or path',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (supports text, keywords, or path patterns)',
          },
          path_filter: {
            type: 'string',
            description: 'Optional path prefix to limit search scope',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results',
            minimum: 1,
            maximum: 50,
            default: 10,
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  ];

  const documentManagementTools: ToolDefinition[] = [
    {
      name: 'create_document',
      description: 'Create a new document at the specified path with structured content',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Document path (e.g., "/api/authentication", "/guides/deployment")',
          },
          title: {
            type: 'string',
            description: 'Document title',
          },
          template: {
            type: 'string',
            description: 'Optional template type',
            enum: ['api-reference', 'how-to-guide', 'architecture', 'troubleshooting', 'blank'],
            default: 'blank',
          },
        },
        required: ['path', 'title'],
        additionalProperties: false,
      },
    },
    {
      name: 'edit_section',
      description: 'Update or add a specific section within an existing document',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Document path',
          },
          section_slug: {
            type: 'string',
            description: 'Section slug to update (e.g., "authentication", "getting-started")',
          },
          content: {
            type: 'string',
            description: 'New content for the section',
          },
          operation: {
            type: 'string',
            enum: ['replace', 'append', 'prepend'],
            default: 'replace',
          },
        },
        required: ['path', 'section_slug', 'content'],
        additionalProperties: false,
      },
    },
    {
      name: 'archive_document',
      description: 'Archive a document or folder (move to archive folder for safety)',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Document or folder path to archive (with or without .md extension)',
          },
        },
        required: ['path'],
        additionalProperties: false,
      },
    },
    {
      name: 'insert_section',
      description: 'Insert a new section at a specific location',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Document path',
          },
          reference_section: {
            type: 'string',
            description: 'Reference section slug to insert relative to',
          },
          position: {
            type: 'string',
            enum: ['before', 'after', 'child'],
            description: 'Where to insert relative to reference section',
            default: 'after',
          },
          title: {
            type: 'string',
            description: 'New section title',
          },
          content: {
            type: 'string',
            description: 'Initial section content',
            default: '',
          },
          depth: {
            type: 'number',
            minimum: 1,
            maximum: 6,
            description: 'Heading depth (1-6). If not specified, determined from position',
          },
        },
        required: ['path', 'reference_section', 'title'],
        additionalProperties: false,
      },
    },
    {
      name: 'add_task',
      description: 'Add tasks with links to specifications',
      inputSchema: {
        type: 'object',
        properties: {
          document: {
            type: 'string',
            description: 'Document path (e.g., "/specs/search-api.md")',
          },
          title: {
            type: 'string',
            description: 'Task title',
          },
          criteria: {
            type: 'string',
            description: 'Measurable completion criteria',
          },
          links: {
            type: 'array',
            items: { type: 'string' },
            description: 'References to specification documents',
          },
        },
        required: ['document', 'title'],
        additionalProperties: false,
      },
    },
    {
      name: 'complete_task',
      description: 'Mark tasks as completed with notes',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            description: 'Task identifier (e.g., "search-api.md#tasks[3]")',
          },
          note: {
            type: 'string',
            description: 'Completion notes or implementation details',
          },
        },
        required: ['task_id'],
        additionalProperties: false,
      },
    },
    {
      name: 'reopen_task',
      description: 'Revert task completion',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            description: 'Task identifier (e.g., "api.md#tasks[0]")',
          },
        },
        required: ['task_id'],
        additionalProperties: false,
      },
    },
    {
      name: 'view_document',
      description: 'Inspect document structure and content',
      inputSchema: {
        type: 'object',
        properties: {
          document: {
            type: 'string',
            description: 'Document path (e.g., "/specs/search-api.md")',
          },
        },
        required: ['document'],
        additionalProperties: false,
      },
    },
    {
      name: 'remove_section',
      description: 'Delete sections (with safety check)',
      inputSchema: {
        type: 'object',
        properties: {
          document: {
            type: 'string',
            description: 'Document path',
          },
          section: {
            type: 'string',
            description: 'Section slug to remove (e.g., "#deprecated")',
          },
        },
        required: ['document', 'section'],
        additionalProperties: false,
      },
    },
  ];

  // Return all tools
  return [...tools, ...documentManagementTools];
}


/**
 * Get document manager instance (lazy initialization)
 */
let documentManager: DocumentManager | null = null;

async function getDocumentManager(): Promise<DocumentManager> {
  if (documentManager == null) {
    // Import dynamically to avoid circular dependencies
    const { DocumentManager } = await import('./document-manager.js');
    const { loadConfig } = await import('./config.js');
    const { initializeGlobalCache } = await import('./document-cache.js');
    
    const config = loadConfig();
    
    // Initialize global cache if not already done
    try {
      initializeGlobalCache(config.docsBasePath, {
        maxCacheSize: 100,
        enableWatching: true,
        watchIgnorePatterns: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
        evictionPolicy: 'lru'
      });
    } catch {
      // Cache already initialized, ignore
    }
    
    documentManager = new DocumentManager(config.docsBasePath);
  }
  return documentManager;
}

/**
 * Execute tool based on name and session state
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  _state: SessionState,
  _onListChanged?: () => void
): Promise<unknown> {
  switch (toolName) {
    case 'create_document': {
      const docPath = (args['path'] as string) ?? '/untitled.md';
      const title = (args['title'] as string) ?? 'New Document';
      const template = (args['template'] as string) ?? 'blank';
      
      try {
        const manager = await getDocumentManager();
        
        // Ensure path ends with .md
        const normalizedPath = docPath.endsWith('.md') ? docPath : `${docPath}.md`;
        const finalPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
        
        await manager.createDocument(finalPath, {
          title,
          template,
          features: {
            toc: true, // Always generate TOC
            anchors: true,
            codeHighlight: true,
            mermaid: true,
            searchIndex: true
          }
        });
        
        // Get created document info
        const document = await manager.getDocument(finalPath);
        
        return {
          success: true,
          message: `Document created successfully at ${finalPath}`,
          document: {
            path: finalPath,
            title,
            template,
            created: new Date().toISOString(),
            headings: document?.headings.length ?? 0,
            features: ['Table of Contents', 'Code Highlighting', 'Mermaid Diagrams', 'Search Indexing']
          },
          nextSteps: [
            'Use update_document_section to add content to specific sections',
            'Use browse_documents to see your new document in context',
            'Use search_documents to find related content for research',
            'Remember to research thoroughly and cite sources'
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          JSON.stringify({
            code: -32603,
            message: 'Failed to create document',
            data: {
              reason: 'CREATION_ERROR',
              details: message,
              path: docPath,
            },
          })
        );
      }
    }

    case 'list_documents': {
      try {
        const manager = await getDocumentManager();
        const path = (args['path'] as string) ?? '/';
        const depth = Math.max(1, Math.min(5, Number(args['depth']) || 2));
        
        const documents = await manager.listDocuments();
        
        // Filter by path if specified
        const filteredDocs = path === '/' 
          ? documents 
          : documents.filter(doc => doc.path.startsWith(path));
        
        return {
          success: true,
          message: `Found ${filteredDocs.length} documents`,
          path,
          depth,
          documents: filteredDocs.slice(0, 50).map(doc => ({
            path: doc.path,
            title: doc.title,
            lastModified: doc.lastModified.toISOString(),
            stats: {
              headings: doc.headingCount,
              words: doc.wordCount
            }
          })),
          totalFound: filteredDocs.length,
          actions: [
            'Use search_documents to find specific content',
            'Use create_document to add new documentation',
            'Use update_document_section to modify existing content'
          ]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          message: 'Failed to browse documents',
          error: message,
          fallback: 'Try using search_documents with a specific query'
        };
      }
    }

    case 'search_documents': {
      try {
        const manager = await getDocumentManager();
        const query = (args['query'] as string) ?? '';
        const pathFilter = args['path_filter'] as string | undefined;
        const limit = Math.max(1, Math.min(50, Number(args['limit']) || 10));
        
        if (query.trim().length === 0) {
          throw new Error('Search query cannot be empty');
        }
        
        const results = await manager.searchDocuments(query, {
          searchIn: ['title', 'headings', 'content', 'code'],
          fuzzy: true,
          boost: {
            title: 2.0,
            headings: 1.5,
            code: 1.2
          },
          highlight: true,
          groupByDocument: true
        });
        
        // Apply path filter if specified
        const filteredResults = (pathFilter != null && pathFilter !== '') 
          ? results.filter(r => r.documentPath.startsWith(pathFilter))
          : results;
        
        const limitedResults = filteredResults.slice(0, limit);
        
        return {
          success: true,
          message: `Found ${limitedResults.length} matching documents`,
          query,
          pathFilter,
          results: limitedResults.map(result => ({
            document: {
              path: result.documentPath,
              title: result.documentTitle
            },
            matches: result.matches.map(match => ({
              type: match.type,
              section: match.slug,
              snippet: match.snippet,
              relevance: Math.round(match.score * 10) / 10
            }))
          })),
          totalMatches: filteredResults.length,
          suggestions: limitedResults.length === 0 ? [
            'Try broader search terms',
            'Check spelling and try synonyms',
            'Use browse_documents to explore available content'
          ] : []
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          JSON.stringify({
            code: -32603,
            message: 'Search failed',
            data: {
              reason: 'SEARCH_ERROR',
              details: message,
              query: args['query'],
            },
          })
        );
      }
    }

    case 'edit_section': {
      try {
        const manager = await getDocumentManager();
        const docPath = (args['path'] as string) ?? '';
        const sectionSlug = (args['section_slug'] as string) ?? '';
        const content = (args['content'] as string) ?? '';
        const operation = (args['operation'] as string) ?? 'replace';
        
        if (!docPath || !sectionSlug || !content) {
          throw new Error('Missing required parameters: path, section_slug, and content');
        }
        
        const normalizedPath = docPath.startsWith('/') ? docPath : `/${docPath}`;
        
        // Check if document exists
        const document = await manager.getDocument(normalizedPath);
        if (!document) {
          throw new Error(`Document not found: ${normalizedPath}`);
        }
        
        // Check if section exists
        const section = document.headings.find(h => h.slug === sectionSlug);
        if (!section && operation === 'replace') {
          throw new Error(`Section not found: ${sectionSlug}. Available sections: ${document.headings.map(h => h.slug).join(', ')}`);
        }
        
        if (operation === 'replace') {
          await manager.updateSection(normalizedPath, sectionSlug, content, {
            updateToc: true,
            validateLinks: true
          });
        } else {
          // For append/prepend, we need to get current content and modify it
          const currentContent = await manager.getSectionContent(normalizedPath, sectionSlug) ?? '';
          const newContent = operation === 'append' 
            ? `${currentContent}\n\n${content}`
            : `${content}\n\n${currentContent}`;
          
          await manager.updateSection(normalizedPath, sectionSlug, newContent, {
            updateToc: true,
            validateLinks: true
          });
        }
        
        return {
          success: true,
          message: `Section "${sectionSlug}" ${operation}d successfully`,
          document: {
            path: normalizedPath,
            section: sectionSlug,
            operation,
            updated: new Date().toISOString()
          },
          nextSteps: [
            'Use browse_documents to see your updated document',
            'Use search_documents to verify content is discoverable',
            'Consider updating related sections if needed'
          ]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          JSON.stringify({
            code: -32603,
            message: 'Failed to update section',
            data: {
              reason: 'UPDATE_ERROR',
              details: message,
              path: args['path'],
              section: args['section_slug'],
            },
          })
        );
      }
    }

    case 'archive_document': {
      try {
        const manager = await getDocumentManager();
        const userPath = (args['path'] as string) ?? '';
        
        if (userPath === '') {
          throw new Error('Path is required');
        }
        
        const result = await manager.archiveDocument(userPath);
        
        return {
          success: true,
          message: `${result.wasFolder ? 'Folder' : 'Document'} archived successfully: ${result.originalPath}`,
          archived: {
            originalPath: result.originalPath,
            archivePath: result.archivePath,
            type: result.wasFolder ? 'folder' : 'file',
            archivedAt: new Date().toISOString()
          },
          note: 'Archived items can be restored by moving them back from the archive folder. Duplicate handling ensures no data loss.',
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          JSON.stringify({
            code: -32603,
            message: 'Failed to archive document',
            data: {
              reason: 'ARCHIVE_ERROR',
              details: message,
              path: args['path'],
            },
          })
        );
      }
    }

    case 'insert_section': {
      try {
        const manager = await getDocumentManager();
        const docPath = (args['path'] as string) ?? '';
        const referenceSection = (args['reference_section'] as string) ?? '';
        const position = (args['position'] as string) ?? 'after';
        const title = (args['title'] as string) ?? '';
        const content = (args['content'] as string) ?? '';
        const explicitDepth = args['depth'] as number | undefined;
        
        if (!docPath || !referenceSection || !title) {
          throw new Error('Missing required parameters: path, reference_section, and title');
        }
        
        const normalizedPath = docPath.startsWith('/') ? docPath : `/${docPath}`;
        
        // Map position to our insert mode
        const insertMode = position === 'before' ? 'insert_before' 
          : position === 'child' ? 'append_child' 
          : 'insert_after';
        
        await manager.insertSection(
          normalizedPath, 
          referenceSection, 
          insertMode, 
          explicitDepth as HeadingDepth | undefined, 
          title, 
          content, 
          { updateToc: true }
        );
        
        return {
          success: true,
          message: `Section "${title}" inserted successfully`,
          section: {
            path: normalizedPath,
            title,
            position: `${position} ${referenceSection}`,
            insertedAt: new Date().toISOString()
          },
          nextSteps: [
            'Use update_document_section to add more content',
            'Use browse_documents to see the updated structure',
            'Use search_documents to verify content is discoverable'
          ]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          JSON.stringify({
            code: -32603,
            message: 'Failed to insert section',
            data: {
              reason: 'INSERT_ERROR',
              details: message,
              path: args['path'],
              title: args['title'],
            },
          })
        );
      }
    }

    case 'add_task': {
      throw new Error(
        JSON.stringify({
          code: -32601,
          message: 'add_task tool not yet implemented',
          data: {
            reason: 'NOT_IMPLEMENTED',
            planned_parameters: ['document', 'title', 'criteria', 'links'],
            example: {
              document: '/specs/search-api.md',
              title: 'Implement caching layer',
              criteria: 'Redis-based, 100ms response time',
              links: ['/architecture/caching.md', '/specs/search-api.md#performance']
            }
          }
        })
      );
    }

    case 'complete_task': {
      throw new Error(
        JSON.stringify({
          code: -32601,
          message: 'complete_task tool not yet implemented',
          data: {
            reason: 'NOT_IMPLEMENTED',
            planned_parameters: ['task_id', 'note'],
            example: {
              task_id: 'search-api.md#tasks[3]',
              note: 'Implemented with Redis Cluster, achieving 87ms p99'
            }
          }
        })
      );
    }

    case 'reopen_task': {
      throw new Error(
        JSON.stringify({
          code: -32601,
          message: 'reopen_task tool not yet implemented',
          data: {
            reason: 'NOT_IMPLEMENTED',
            planned_parameters: ['task_id'],
            example: {
              task_id: 'api.md#tasks[0]'
            }
          }
        })
      );
    }

    case 'view_document': {
      throw new Error(
        JSON.stringify({
          code: -32601,
          message: 'view_document tool not yet implemented',
          data: {
            reason: 'NOT_IMPLEMENTED',
            planned_parameters: ['document'],
            example: {
              document: '/specs/search-api.md'
            }
          }
        })
      );
    }

    case 'remove_section': {
      throw new Error(
        JSON.stringify({
          code: -32601,
          message: 'remove_section tool not yet implemented',
          data: {
            reason: 'NOT_IMPLEMENTED',
            planned_parameters: ['document', 'section'],
            example: {
              document: '/specs/api.md',
              section: '#deprecated'
            }
          }
        })
      );
    }

    default: {
      throw new Error(
        JSON.stringify({
          code: -32601,
          message: `Unknown tool: ${toolName}`,
        })
      );
    }
  }
}