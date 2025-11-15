#!/bin/bash
# Enable development mode - install dev deps and hide from git

set -e

echo "📦 Installing development dependencies..."
pnpm install --silent

echo "🔇 Hiding dev dependency changes from git..."

# Mark modified tracking files as "skip-worktree" (git ignores local changes)
git update-index --skip-worktree node_modules/.modules.yaml 2>/dev/null || true
git update-index --skip-worktree node_modules/.pnpm-workspace-state-v1.json 2>/dev/null || true
git update-index --skip-worktree node_modules/.pnpm/lock.yaml 2>/dev/null || true
git update-index --skip-worktree node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json 2>/dev/null || true

echo "✅ Development mode enabled!"
echo "   - Dev tools available (lint, test, etc.)"
echo "   - Git status will be clean"
echo ""
echo "To update production dependencies: ./scripts/update-prod-deps.sh"
