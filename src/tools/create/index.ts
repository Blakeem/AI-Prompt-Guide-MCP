/**
 * Public API for create document pipeline
 */

export { executeCreateDocumentPipeline } from './pipeline.js';
export type { PipelineResult, CreationErrorResult } from './pipeline.js';

// All internal pipeline implementation details are now private
// to maintain proper encapsulation and avoid over-exposing internals