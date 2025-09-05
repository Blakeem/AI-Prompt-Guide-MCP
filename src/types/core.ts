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

/** Result of a section operation */
export interface SectionOperationResult {
  readonly success: boolean;
  readonly updatedContent: string;
  readonly message?: string;
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
  readonly docsBasePath: string;
  readonly maxFileSize: number;
  readonly maxFilesPerOperation: number;
  readonly rateLimitRequestsPerMinute: number;
  readonly rateLimitBurstSize: number;
  readonly enableFileSafetyChecks: boolean;
  readonly enableMtimePrecondition: boolean;
}

/** Logger interface */
export interface Logger {
  error(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

/** MCP tool parameter validation schema */
export interface ToolParameter {
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  readonly description: string;
  readonly required?: boolean;
  readonly default?: unknown;
}

/** MCP tool definition */
export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, ToolParameter>;
}

/** Result of MCP tool execution */
export interface ToolResult {
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: string;
  readonly metadata?: Record<string, unknown>;
}