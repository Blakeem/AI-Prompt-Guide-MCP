/**
 * Template loader for onboarding and instructional messages
 * Safely loads markdown templates from the templates directory
 */

import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { ensureDirectoryExists, fileExists } from './fsio.js';
import { getGlobalLogger } from './utils/logger.js';

/**
 * Template types for different onboarding flows
 */
export type TemplateType = 
  | 'activate-specification-documentation'
  | 'activate-guide-documentation';

/**
 * Template metadata
 */
export interface Template {
  readonly type: TemplateType;
  readonly title: string;
  readonly description: string;
  readonly content: string;
  readonly lastModified: Date;
}

/**
 * Template loader with caching and error handling
 */
export class TemplateLoader {
  private readonly templatesDir: string;
  private readonly cache = new Map<TemplateType, Template>();

  constructor(baseDir: string = '.spec-docs-mcp') {
    this.templatesDir = resolve(baseDir, 'templates');
  }

  /**
   * Initialize the templates directory structure
   */
  async initialize(): Promise<void> {
    const logger = getGlobalLogger();
    
    try {
      await ensureDirectoryExists(this.templatesDir);
      logger.debug('Templates directory ready', { path: this.templatesDir });

      // Create default templates if they don't exist
      await this.ensureDefaultTemplates();
    } catch (error) {
      logger.error('Failed to initialize templates directory', { error });
      throw error;
    }
  }

  /**
   * Load a template by type
   */
  async loadTemplate(type: TemplateType): Promise<Template> {
    const logger = getGlobalLogger();

    try {
      // Check cache first
      if (this.cache.has(type)) {
        const cached = this.cache.get(type);
        if (cached != null) {
          return cached;
        }
      }

      const filePath = join(this.templatesDir, `${type}.md`);
      
      if (!(await fileExists(filePath))) {
        throw new Error(`Template not found: ${type}`);
      }

      const content = await fs.readFile(filePath, 'utf8');
      const stats = await fs.stat(filePath);

      const template: Template = {
        type,
        title: this.getTemplateTitle(type),
        description: this.getTemplateDescription(type),
        content: content.trim(),
        lastModified: stats.mtime,
      };

      // Cache the template
      this.cache.set(type, template);
      
      logger.debug('Template loaded', { type, size: content.length });
      return template;
    } catch (error) {
      logger.error('Failed to load template', { type, error });
      throw error;
    }
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get all available template types
   */
  getAvailableTemplates(): TemplateType[] {
    return [
      'activate-specification-documentation',
      'activate-guide-documentation'
    ];
  }

  /**
   * Create default templates if they don't exist
   */
  private async ensureDefaultTemplates(): Promise<void> {
    const templates: Record<TemplateType, string> = {
      'activate-specification-documentation': this.getDefaultSpecificationProtocol(),
      'activate-guide-documentation': this.getDefaultGuideProtocol(),
    };

    for (const [type, content] of Object.entries(templates)) {
      const filePath = join(this.templatesDir, `${type}.md`);
      
      if (!(await fileExists(filePath))) {
        await fs.writeFile(filePath, content, 'utf8');
      }
    }
  }

  private getTemplateTitle(type: TemplateType): string {
    const titles: Record<TemplateType, string> = {
      'activate-specification-documentation': 'Activate Specification Documentation Protocol',
      'activate-guide-documentation': 'Activate Guide Documentation Protocol',
    };
    return titles[type];
  }

  private getTemplateDescription(type: TemplateType): string {
    const descriptions: Record<TemplateType, string> = {
      'activate-specification-documentation': 'Create comprehensive technical specifications for tools, APIs, and systems',
      'activate-guide-documentation': 'Create clear, actionable guides and tutorials for processes and workflows',
    };
    return descriptions[type];
  }

  private getDefaultSpecificationProtocol(): string {
    return `# Activate Specification Documentation Protocol

**Purpose:** Create comprehensive technical specifications for tools, APIs, and systems with authoritative accuracy.`;
  }

  private getDefaultGuideProtocol(): string {
    return `# Activate Guide Documentation Protocol

**Purpose:** Create clear, actionable guides and tutorials for processes and workflows.`;
  }
}

/**
 * Global template loader instance
 */
let globalTemplateLoader: TemplateLoader | null = null;

/**
 * Get or create the global template loader
 */
export function getTemplateLoader(baseDir?: string): TemplateLoader {
  globalTemplateLoader ??= new TemplateLoader(baseDir);
  return globalTemplateLoader;
}