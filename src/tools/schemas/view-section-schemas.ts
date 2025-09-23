/**
 * Schema definitions for view_section tool
 */

export interface ViewSectionInputSchema {
  type: 'object';
  properties: {
    document: {
      type: 'string';
      description: 'Document path (e.g., "/specs/auth-api.md")';
    };
    section: {
      type: 'string' | 'array';
      description: 'Section slug(s) to view (e.g., "#endpoints" or ["#endpoints", "#authentication"] for multiple)';
    };
  };
  required: ['document', 'section'];
  additionalProperties: false;
}

/**
 * Schema constants for view_section tool
 */
export const VIEW_SECTION_CONSTANTS = {
  MAX_SECTIONS: 10,  // Limit for multiple section viewing
} as const;

/**
 * Helper functions for section validation
 */
export function normalizeSection(section: string): string {
  return section.startsWith('#') ? section : `#${section}`;
}

export function parseSections(section: string | string[]): string[] {
  if (Array.isArray(section)) {
    return section.map(normalizeSection);
  }
  return [normalizeSection(section)];
}

export function validateSectionCount(sections: string[]): boolean {
  return sections.length > 0 && sections.length <= VIEW_SECTION_CONSTANTS.MAX_SECTIONS;
}

/**
 * Get the input schema for view_section tool
 */
export function getViewSectionSchema(): ViewSectionInputSchema {
  return {
    type: 'object',
    properties: {
      document: {
        type: 'string',
        description: 'Document path (e.g., "/specs/auth-api.md")',
      },
      section: {
        type: 'string',
        description: 'Section slug(s) to view (e.g., "#endpoints" or ["#endpoints", "#authentication"] for multiple)',
      },
    },
    required: ['document', 'section'],
    additionalProperties: false,
  };
}