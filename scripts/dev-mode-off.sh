#!/bin/bash
# Disable development mode - remove dev deps, show production state in git

set -e

echo "🔊 Re-enabling git tracking for node_modules metadata..."
git update-index --no-skip-worktree node_modules/.modules.yaml 2>/dev/null || true
git update-index --no-skip-worktree node_modules/.pnpm-workspace-state-v1.json 2>/dev/null || true
git update-index --no-skip-worktree node_modules/.pnpm/lock.yaml 2>/dev/null || true
git update-index --no-skip-worktree node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json 2>/dev/null || true

echo "🧹 Removing development dependencies..."
pnpm prune --prod

echo "🔄 Resetting metadata files to committed state..."
# Reset transient metadata to avoid noise (unless you're actually updating prod deps)
git checkout HEAD -- node_modules/.modules.yaml 2>/dev/null || true
git checkout HEAD -- node_modules/.pnpm-workspace-state-v1.json 2>/dev/null || true
git checkout HEAD -- node_modules/.vite/ 2>/dev/null || true

echo "✅ Development mode disabled!"
echo "   - Only production dependencies remain"
echo "   - Metadata reset to production state"
echo ""
echo "Git status:"
git status --short
