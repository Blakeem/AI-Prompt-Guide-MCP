# Linking System Test Document

## Overview

This document tests the comprehensive linking system we just implemented.

**TEST EDIT**: This content has been updated to test #slug format support.

## Cross-Document Links

Testing cross-document links to other documents:

* Link to API spec: @/api/specs/user-api.md
* Link to setup guide: @/api/guides/setup.md#configuration
* Link to components: @/frontend/components/button.md

## Within-Document Links

Testing within-document links:

* Link to overview: @#overview
* Link to testing section: @#testing-section

## Hierarchical Sections

### Level 1 Section

**ADDRESSING TEST**: This tests simple slug addressing.

Content updated successfully via simple addressing.

## Testing Section

This section contains various link patterns:

* Cross-doc link: @/api/specs/user-api.md
* Section link: @/api/guides/setup.md#configuration
* Within-doc link: @#overview
* Invalid link: @/nonexistent/document.md

Testing keywords: authentication, JWT, tokens, API validation.

## Related Documentation

This section should get link suggestions based on content analysis.
