/**
 * Slug generation utilities using github-slugger
 */
import GithubSlugger from 'github-slugger';
import { ERROR_CODES } from './constants/defaults.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const packageJson = require('../package.json');
/**
 * Creates a custom error with code, context, and version information
 */
function createError(message, code, context) {
    const error = new Error(message);
    return Object.assign(error, {
        code,
        context: { ...context, version: packageJson.version }
    });
}
/**
 * Converts a title to a URL-safe slug using github-slugger
 * Uses static transform (no internal counters) for deterministic results
 */
export function titleToSlug(title) {
    if (typeof title !== 'string') {
        throw createError('Title must be a string', ERROR_CODES.INVALID_TITLE, { title, type: typeof title });
    }
    const trimmed = title.trim();
    if (trimmed.length === 0) {
        throw createError('Title cannot be empty', ERROR_CODES.INVALID_TITLE, { title });
    }
    try {
        // Use static slug method for deterministic behavior
        const slugger = new GithubSlugger();
        return slugger.slug(trimmed);
    }
    catch (error) {
        throw createError('Failed to generate slug from title', ERROR_CODES.INVALID_TITLE, { title, error: error instanceof Error ? error.message : String(error) });
    }
}
//# sourceMappingURL=slug.js.map