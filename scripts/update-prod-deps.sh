#!/bin/bash
# Update production dependencies in node_modules (rare operation)
# Use this when you need to update dependencies that ship with the plugin

set -e

echo "🔄 Updating production dependencies..."
echo ""

# Step 1: Disable dev mode but DON'T reset metadata (we want to see real changes)
echo "🔊 Re-enabling git tracking for node_modules metadata..."
git update-index --no-skip-worktree node_modules/.modules.yaml 2>/dev/null || true
git update-index --no-skip-worktree node_modules/.pnpm-workspace-state-v1.json 2>/dev/null || true
git update-index --no-skip-worktree node_modules/.pnpm/lock.yaml 2>/dev/null || true
git update-index --no-skip-worktree node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json 2>/dev/null || true

echo "🧹 Removing development dependencies..."
pnpm prune --prod

echo "🔄 Resetting test cache (not needed in production)..."
git checkout HEAD -- node_modules/.vite/ 2>/dev/null || true

echo "✅ Production-only state active"

echo ""
echo "📝 Current git status shows production-only state."
echo "   Make your dependency changes now (add, upgrade, remove packages)."
echo "   Press ENTER when ready to commit..."
read -r

# Step 2: Show status and commit
echo ""
echo "Current changes:"
git status --short

echo ""
echo "Ready to commit these changes? (y/n)"
read -r -p "> " response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo ""
    read -r -p "Commit message: " commit_msg
    git add node_modules/ pnpm-lock.yaml package.json
    git commit -m "$commit_msg"
    echo "✅ Production dependencies committed!"
else
    echo "⚠️  Skipping commit. Run git commands manually when ready."
fi

# Step 3: Restore dev mode
echo ""
./scripts/dev-mode-on.sh
