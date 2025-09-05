# CLAUDE.md - Assistant Instructions for SpecDocs MCP Server

## Project Overview

TBD 

**Package Manager**: pnpm (NOT npm or yarn)
**Language**: TypeScript with strict mode enabled
**Runtime**: Node.js with ES modules

## CRITICAL CODE QUALITY REQUIREMENTS

### Quality Gates (ALL must pass)
**AFTER EVERY CODE CHANGE:**
1. Run `pnpm test:run` - ALL tests must pass (runs once, exits)
2. Run `pnpm lint` - ZERO errors and warnings allowed  
3. Run `pnpm typecheck` - ZERO type errors allowed
4. **Unit Testing**: ALL new features must include unit tests following `docs/UNIT-TEST-STRATEGY.md`

### Test Commands
- `pnpm test:run` - Run tests once and exit (for CI/validation)
- `pnpm test` - Watch mode for development (stays running)
- `pnpm test:coverage` - Run with coverage report

