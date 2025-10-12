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
        description: `Document path with optional section slug(s).

TWO MODES:
1. Overview: "/api/auth.md"
   → Returns list of ALL sections with slug, title, and depth (no content)
   → Use for browsing document structure

2. Detail: "/api/auth.md#endpoints"
   → Returns FULL section content for the specified section
   → Supports multiple sections: "/api/auth.md#endpoints,authentication,errors"
   → Use for viewing specific section details

Examples:
- Overview: "/api/auth.md" → All sections (titles only)
- Single detail: "/api/auth.md#endpoints" → Full section content
- Multiple detail: "/api/auth.md#endpoints,auth" → Multiple full contents`,
      },
    },
    required: ['document'],
    additionalProperties: false,
  };
}