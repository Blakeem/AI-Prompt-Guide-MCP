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
  hasStartedWorkflow: boolean;
  sessionId: string;
  workflowStartedAt?: Date;
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
        hasStartedWorkflow: false,
      });
    }
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found - this should not happen`);
    }
    return session;
  }

  /**
   * Start document workflow for session
   */
  startWorkflow(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    const wasStarted = session.hasStartedWorkflow;
    session.hasStartedWorkflow = true;
    session.workflowStartedAt = new Date();
    return !wasStarted; // Return true if this was the first time starting
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
 * Get visible tools based on session state
 */
export function getVisibleTools(state: SessionState): ToolDefinition[] {
  const alwaysAvailableTools: ToolDefinition[] = [
    {
      name: 'browse_documents',
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

  const workflowGatewayTool: ToolDefinition[] = [
    {
      name: 'unlock_document_tools',
      description: 'Unlock document management tools (create, update, archive documents)',
      inputSchema: {
        type: 'object',
        properties: {
          show_overview: {
            type: 'boolean',
            description: 'Show complete document structure overview after unlocking',
            default: true,
          },
        },
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
      name: 'update_document_section',
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
      description: 'Archive a document (move to archive folder for safety)',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Document path to archive',
          },
          reason: {
            type: 'string',
            description: 'Optional reason for archiving (for audit trail)',
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
      name: 'move_section',
      description: 'Move a section to a different location',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Document path',
          },
          section_slug: {
            type: 'string',
            description: 'Section to move',
          },
          target_section: {
            type: 'string',
            description: 'Target section to move relative to',
          },
          position: {
            type: 'string',
            enum: ['before', 'after', 'child'],
            description: 'Where to move relative to target',
            default: 'after',
          },
        },
        required: ['path', 'section_slug', 'target_section'],
        additionalProperties: false,
      },
    },
  ];

  // Always show browse/search tools and workflow starter
  const baseTools = [...alwaysAvailableTools, ...workflowGatewayTool];
  
  // Add document management tools if workflow has been started
  return state.hasStartedWorkflow ? [...baseTools, ...documentManagementTools] : baseTools;
}

/**
 * Prompt definitions
 */
export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

/**
 * Get available prompts
 */
export function getVisiblePrompts(_state: SessionState): PromptDefinition[] {
  return [
    {
      name: 'document_workflow_intro',
      description: 'Introduction to document creation workflow and best practices',
      arguments: [],
    },
    {
      name: 'research_best_practices',
      description: 'Guide for researching and gathering accurate, current information',
      arguments: [],
    },
    {
      name: 'documentation_standards',
      description: 'Standards and conventions for consistent, high-quality documentation',
      arguments: [],
    },
  ];
}

/**
 * Get prompt template content using the template loader
 */
export async function getPromptTemplate(name: string): Promise<string | null> {
  try {
    // Map prompt names to template types
    const templateMap: Record<string, string> = {
      'document_workflow_intro': 'document_workflow_intro',
      'research_best_practices': 'research_best_practices', 
      'documentation_standards': 'documentation_standards',
    };

    const templateType = templateMap[name];
    if (templateType == null) {
      return null;
    }

    // Import the template loader here to avoid circular dependencies
    const { getTemplateLoader } = await import('./template-loader.js');
    const loader = getTemplateLoader();
    await loader.initialize();
    
    const template = await loader.loadTemplate(templateType as 'document_workflow_intro' | 'research_best_practices' | 'documentation_standards');
    return template.content;
  } catch {
    // Fallback for any errors
    return getDefaultPromptContent(name);
  }
}

/**
 * Fallback prompt content if template loading fails
 */
function getDefaultPromptContent(name: string): string | null {
  if (name === 'document_workflow_intro') {
    return `# Document Creation Workflow

Welcome! This system helps you create and maintain high-quality technical documentation using research-driven best practices.

## Next Steps
1. Review the research and documentation standards
2. Run 'start_document_workflow' to unlock document management tools
3. Begin creating structured, well-researched documentation

Focus on accuracy, clarity, and current information! 📚`;
  }
  return null;
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
  state: SessionState,
  onListChanged?: () => void
): Promise<unknown> {
  switch (toolName) {
    case 'unlock_document_tools': {
      const firstTime = !state.hasStartedWorkflow;
      const showOverview = Boolean(args['show_overview'] ?? true);
      
      state.hasStartedWorkflow = true;
      state.workflowStartedAt = new Date();
      
      // Trigger list changed notifications if this is the first time
      if (firstTime && onListChanged) {
        onListChanged();
      }

      // Get document structure overview if requested
      let documentStructure = {};
      if (showOverview) {
        try {
          const manager = await getDocumentManager();
          const documents = await manager.listDocuments();
          
          documentStructure = {
            totalDocuments: documents.length,
            documentsByPath: documents.reduce((acc, doc) => {
              const pathParts = doc.path.split('/').filter(Boolean);
              const category = pathParts[0] ?? 'root';
              acc[category] ??= [];
              acc[category].push({
                path: doc.path,
                title: doc.title,
                headings: doc.headingCount,
                words: doc.wordCount,
                lastModified: doc.lastModified
              });
              return acc;
            }, {} as Record<string, Array<{path: string, title: string, headings: number, words: number, lastModified: Date}>>)
          };
        } catch {
          // Don't fail if we can't get structure
        }
      }
      
      return {
        success: true,
        message: firstTime 
          ? 'Document management tools unlocked! You now have access to comprehensive document operations.'
          : 'Document tools already active. All tools remain available.',
        workflowActive: true,
        startedAt: state.workflowStartedAt.toISOString(),
        unlockedTools: [
          'create_document - Create new documents with templates and TOC',
          'update_document_section - Modify specific document sections',
          'insert_section - Add new sections at precise locations', 
          'move_section - Reorganize document structure',
          'archive_document - Safely archive documents (recommended over deletion)',
          'browse_documents - Explore existing document organization',
          'search_documents - Find content across all documents'
        ],
        documentStructure: showOverview ? documentStructure : undefined,
        nextSteps: [
          'Use browse_documents to explore existing content',
          'Use search_documents to find specific topics',
          'Use create_document to add new documentation',
          'Remember: always research thoroughly before writing'
        ]
      };
    }

    case 'create_document': {
      // Check if workflow has been started
      if (!state.hasStartedWorkflow) {
        throw new Error(
          JSON.stringify({
            code: -32002,
            message: 'Document management not available',
            data: {
              reason: 'WORKFLOW_NOT_STARTED',
              details: "Please run 'start_document_workflow' first to unlock document management tools.",
            },
          })
        );
      }
      
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

    case 'browse_documents': {
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

    case 'update_document_section': {
      // Check if workflow has been started
      if (!state.hasStartedWorkflow) {
        throw new Error(
          JSON.stringify({
            code: -32002,
            message: 'Document management not available',
            data: {
              reason: 'WORKFLOW_NOT_STARTED',
              details: "Please run 'start_document_workflow' first to unlock document management tools.",
            },
          })
        );
      }
      
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
      // Check if workflow has been started
      if (!state.hasStartedWorkflow) {
        throw new Error(
          JSON.stringify({
            code: -32002,
            message: 'Document management not available',
            data: {
              reason: 'WORKFLOW_NOT_STARTED',
              details: "Please run 'unlock_document_tools' first to unlock document management tools.",
            },
          })
        );
      }
      
      try {
        const manager = await getDocumentManager();
        const docPath = (args['path'] as string) ?? '';
        const reason = (args['reason'] as string) ?? '';
        const normalizedPath = docPath.startsWith('/') ? docPath : `/${docPath}`;
        
        // Check if document exists before archiving
        const document = await manager.getDocument(normalizedPath);
        if (!document) {
          throw new Error(`Document not found: ${normalizedPath}`);
        }
        
        await manager.archiveDocument(normalizedPath, reason);
        
        return {
          success: true,
          message: `Document archived successfully: ${normalizedPath}`,
          archived: {
            originalPath: normalizedPath,
            archivePath: `/archived${normalizedPath}`,
            title: document.metadata.title,
            archivedAt: new Date().toISOString(),
            reason: reason || 'No reason provided',
            stats: {
              headings: document.headings.length,
              words: document.metadata.wordCount
            }
          },
          note: 'Archived documents can be restored by moving them back from the archive folder.',
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
      // Check if workflow has been started
      if (!state.hasStartedWorkflow) {
        throw new Error(
          JSON.stringify({
            code: -32002,
            message: 'Document management not available',
            data: {
              reason: 'WORKFLOW_NOT_STARTED',
              details: "Please run 'unlock_document_tools' first to unlock document management tools.",
            },
          })
        );
      }
      
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

    case 'move_section': {
      // Check if workflow has been started
      if (!state.hasStartedWorkflow) {
        throw new Error(
          JSON.stringify({
            code: -32002,
            message: 'Document management not available',
            data: {
              reason: 'WORKFLOW_NOT_STARTED',
              details: "Please run 'unlock_document_tools' first to unlock document management tools.",
            },
          })
        );
      }
      
      try {
        const manager = await getDocumentManager();
        const docPath = (args['path'] as string) ?? '';
        const sectionSlug = (args['section_slug'] as string) ?? '';
        const targetSection = (args['target_section'] as string) ?? '';
        const position = (args['position'] as string) ?? 'after';
        
        if (!docPath || !sectionSlug || !targetSection) {
          throw new Error('Missing required parameters: path, section_slug, and target_section');
        }
        
        const normalizedPath = docPath.startsWith('/') ? docPath : `/${docPath}`;
        
        await manager.moveSection(normalizedPath, sectionSlug, targetSection, position);
        
        return {
          success: true,
          message: `Section "${sectionSlug}" moved successfully`,
          moved: {
            path: normalizedPath,
            section: sectionSlug,
            newPosition: `${position} ${targetSection}`,
            movedAt: new Date().toISOString()
          },
          nextSteps: [
            'Use browse_documents to verify the new structure',
            'Check that all internal links still work',
            'Update any cross-references if needed'
          ]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          JSON.stringify({
            code: -32603,
            message: 'Failed to move section',
            data: {
              reason: 'MOVE_ERROR',
              details: message,
              path: args['path'],
              section: args['section_slug'],
            },
          })
        );
      }
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