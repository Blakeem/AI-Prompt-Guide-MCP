/**
 * Core type definitions for the Spec-Docs MCP server
 */

import type { HEADING_DEPTHS, INSERT_MODES } from '../constants/defaults.js';

/** Valid heading depths */
export type HeadingDepth = typeof HEADING_DEPTHS[number];

/** Valid insert modes for creating sections */
export type InsertMode = typeof INSERT_MODES[number];

/** File snapshot with content and modification time */
export interface FileSnapshot {
  readonly content: string;
  readonly mtimeMs: number;
}

/** Heading information with hierarchy */
export interface Heading {
  readonly index: number;
  readonly depth: HeadingDepth;
  readonly title: string;
  readonly slug: string;
  readonly parentIndex: number | null;
}

/** Table of Contents node */
export interface TocNode {
  readonly title: string;
  readonly slug: string;
  readonly depth: HeadingDepth;
  readonly children: readonly TocNode[];
}

/** Error with additional context */
export interface SpecDocsError extends Error {
  readonly code: string;
  readonly context?: Record<string, unknown>;
}

/** Configuration for the MCP server */
export interface ServerConfig {
  readonly serverName: string;
  readonly serverVersion: string;
  readonly logLevel: string;
  readonly workspaceBasePath: string;
  readonly workflowsBasePath: string;
  readonly guidesBasePath: string;
  readonly docsBasePath: string;
  readonly archivedBasePath: string;
  readonly coordinatorBasePath: string;
  readonly maxFileSize: number;
  readonly maxFilesPerOperation: number;
  readonly rateLimitRequestsPerMinute: number;
  readonly rateLimitBurstSize: number;
  readonly enableFileSafetyChecks: boolean;
  readonly enableMtimePrecondition: boolean;
  readonly referenceExtractionDepth: number;
}

/** Logger interface */
export interface Logger {
  error(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

/** Project configuration from .mcp-config.json */
export interface ProjectConfig {
  readonly env: {
    readonly MCP_WORKSPACE_PATH?: string;
    readonly WORKFLOWS_BASE_PATH?: string;
    readonly GUIDES_BASE_PATH?: string;
    readonly DOCS_BASE_PATH?: string;
    readonly ARCHIVED_BASE_PATH?: string;
    readonly COORDINATOR_BASE_PATH?: string;
  };
}

