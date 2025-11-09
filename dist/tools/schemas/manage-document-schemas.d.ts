/**
 * Schema definitions for manage_document tool
 */
export interface ManageDocumentInputSchema {
    type: 'object';
    properties: {
        operation: {
            type: 'string';
            enum: ['archive', 'delete', 'rename'];
            description: 'Operation to perform: archive (with audit), delete (permanent), rename (title)';
        };
        document: {
            type: 'string';
            description: 'Document path (e.g., "/specs/api.md")';
        };
        new_title: {
            type: 'string';
            description: 'New title for rename operation';
        };
    };
    required: ['operation', 'document'];
    additionalProperties: false;
}
/**
 * Schema constants for manage_document tool
 */
export declare const MANAGE_DOCUMENT_CONSTANTS: {
    readonly OPERATIONS: {
        readonly ARCHIVE: "archive";
        readonly DELETE: "delete";
        readonly RENAME: "rename";
    };
    readonly DESTRUCTIVE_OPERATIONS: readonly ["delete"];
    readonly NON_DESTRUCTIVE_OPERATIONS: readonly ["archive", "rename"];
};
/**
 * Type definitions for document management operations
 */
export type DocumentOperation = 'archive' | 'delete' | 'rename';
export type DestructiveOperation = 'delete';
export type NonDestructiveOperation = 'archive' | 'rename';
/**
 * Helper functions for operation validation
 */
export declare function isDestructiveOperation(operation: string): operation is DestructiveOperation;
export declare function isNonDestructiveOperation(operation: string): operation is NonDestructiveOperation;
export declare function requiresNewTitle(operation: string): boolean;
/**
 * Validation functions for operation parameters
 */
export declare function validateOperationParameters(operation: string, document: string, newTitle?: string): {
    valid: boolean;
    errors: string[];
};
/**
 * Get the input schema for manage_document tool
 */
export declare function getManageDocumentSchema(): ManageDocumentInputSchema;
//# sourceMappingURL=manage-document-schemas.d.ts.map