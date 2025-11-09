/**
 * Document relationship classification and analysis
 */
import { pathToNamespace } from '../../shared/utilities.js';
/**
 * Classify the relationship between two documents
 */
export function classifyRelationship(fromDocPath, toDocPath, linkText, toDocTitle) {
    const fromNamespace = pathToNamespace(fromDocPath);
    const toNamespace = pathToNamespace(toDocPath);
    // Analyze namespaces and titles for relationship patterns
    const linkTextLower = linkText.toLowerCase();
    const toTitleLower = toDocTitle.toLowerCase();
    // Implementation relationships
    if (fromNamespace.includes('spec') && (toNamespace.includes('guide') || toNamespace.includes('impl'))) {
        return 'implementation_guide';
    }
    if ((fromNamespace.includes('backend') || fromNamespace.includes('service')) && toNamespace.includes('spec')) {
        return 'implements_spec';
    }
    if ((fromNamespace.includes('frontend') || fromNamespace.includes('component')) && toNamespace.includes('api')) {
        return 'consumes_api';
    }
    // Dependency relationships
    if (linkTextLower.includes('depend') || linkTextLower.includes('require') || linkTextLower.includes('prerequisite')) {
        return 'depends_on';
    }
    // Content-based relationships
    if (toTitleLower.includes('guide') || toTitleLower.includes('tutorial') || toTitleLower.includes('how')) {
        return 'implementation_guide';
    }
    if (toTitleLower.includes('spec') || toTitleLower.includes('api')) {
        return 'implements_spec';
    }
    // Default to references for unclear relationships
    return 'references';
}
//# sourceMappingURL=relationship-classifier.js.map