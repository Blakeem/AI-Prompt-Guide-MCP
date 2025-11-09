/**
 * Schema definitions for view_section tool
 */
export interface ViewSectionInputSchema {
    type: 'object';
    properties: {
        document: {
            type: 'string';
            description: string;
        };
    };
    required: ['document'];
    additionalProperties: false;
}
/**
 * Schema constants for view_section tool
 */
export declare const VIEW_SECTION_CONSTANTS: {
    readonly MAX_SECTIONS: 10;
};
/**
 * Helper functions for section validation
 */
export declare function normalizeSection(section: string): string;
export declare function parseSections(section: string | string[]): string[];
export declare function validateSectionCount(sections: string[]): boolean;
/**
 * Get the input schema for view_section tool
 */
export declare function getViewSectionSchema(): ViewSectionInputSchema;
//# sourceMappingURL=view-section-schemas.d.ts.map