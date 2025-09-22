/**
 * Create-document pipeline module exports
 */

export { executeCreateDocumentPipeline } from './pipeline.js';
export type { PipelineResult, CreationErrorResult } from './pipeline.js';

export {
  processDiscovery,
  processInstructions,
  validateNamespaceForCreation,
  getNamespaceTemplate
} from './validation-processor.js';
export type {
  DiscoveryResult,
  InstructionsResult,
  ValidationErrorResult,
  ValidationResult
} from './validation-processor.js';

export {
  processSuggestions
} from './suggestion-generator.js';
export type {
  SmartSuggestionsResult,
  SuggestionsErrorResult,
  SuggestionsResult,
  LinkGuidance
} from './suggestion-generator.js';

export {
  processTemplate,
  getAvailableTemplates,
  hasTemplateSupport
} from './template-processor.js';
export type {
  TemplateProcessingResult,
  TemplateProcessingError
} from './template-processor.js';

export {
  createDocumentFile,
  validateCreationPrerequisites,
  checkDocumentExists,
  generateCreationMetadata
} from './file-creator.js';
export type {
  DocumentCreationResult,
  FileCreationError
} from './file-creator.js';