# Development Workflow

## Overview

This project commits production `node_modules` (35MB) to enable **zero-config** installation as a Claude Code plugin. Development dependencies (110MB additional) are managed separately to keep git clean.

## Quick Start

### First Time Setup

```bash
# Clone the repo - production deps already included!
git clone <repo-url>
cd ai-prompt-guide-mcp

# Enable development mode (adds dev tools, hides from git)
./scripts/dev-mode-on.sh

# Start developing!
pnpm lint
pnpm test
```

### Daily Development

With dev mode enabled, your workflow is normal:

```bash
# Make changes to code
# Run tests, linting, etc.
pnpm test
pnpm lint

# Commit your source code changes
git add src/
git commit -m "feat: add new feature"

# Git status stays clean - no node_modules noise!
```

## Scripts

### `./scripts/dev-mode-on.sh`
**What it does:**
- Installs all development dependencies (eslint, vitest, typescript, etc.)
- Hides dev dependency changes from `git status` using `skip-worktree`
- You get a clean git working tree while having full dev tools

**When to use:**
- After fresh clone
- After pulling changes that might affect dependencies
- Anytime you need to restore dev tools

### `./scripts/dev-mode-off.sh`
**What it does:**
- Removes development dependencies (keeps only production)
- Re-enables git tracking for node_modules metadata
- Shows you the production-only state

**When to use:**
- Before updating production dependencies
- To see what's actually committed
- Rarely needed for normal development

### `./scripts/update-prod-deps.sh` ⚠️ RARE
**What it does:**
- Guided workflow for updating committed production dependencies
- Temporarily disables dev mode
- Helps you commit dependency updates
- Restores dev mode afterward

**When to use:**
- Adding/removing production dependencies
- Upgrading packages in package.json
- Maybe once every few months

**Example:**
```bash
./scripts/update-prod-deps.sh

# Script will:
# 1. Remove dev deps (show clean production state)
# 2. Prompt you to make changes (add/remove/upgrade packages)
# 3. Show git status
# 4. Help you commit
# 5. Restore dev mode
```

## How It Works

### The Problem
- **Need:** Committed `node_modules` for zero-config Claude Code plugin
- **Problem:** Dev dependencies create noise in `git status`
- **Solution:** Hide dev deps locally while keeping them installed

### Technical Implementation

1. **`.git/info/exclude`** (local-only, not committed)
   - Hides untracked dev dependency directories
   - Like `.gitignore` but personal to your repo

2. **`git update-index --skip-worktree`**
   - Hides changes to tracked metadata files:
     - `node_modules/.modules.yaml`
     - `node_modules/.pnpm-workspace-state-v1.json`
     - `node_modules/.pnpm/lock.yaml`

3. **Management scripts**
   - Simple bash scripts to toggle between states
   - No git hooks, no complex automation
   - Explicit control over when things happen

### Files Involved

**Committed to git:**
- `node_modules/` (production dependencies only)
- `package.json`, `pnpm-lock.yaml`
- All source code

**Local only (not committed):**
- `.git/info/exclude` (exclude patterns)
- Skip-worktree metadata (git internal)
- Dev dependencies when installed

**Management:**
- `scripts/dev-mode-on.sh`
- `scripts/dev-mode-off.sh`
- `scripts/update-prod-deps.sh`

## Troubleshooting

### Dev tools not found (eslint, vitest, etc.)
```bash
./scripts/dev-mode-on.sh
```

### Seeing node_modules in git status
```bash
# Disable then re-enable dev mode
./scripts/dev-mode-off.sh
./scripts/dev-mode-on.sh
```

### Need to update a dependency
```bash
# For production dependencies:
./scripts/update-prod-deps.sh

# For dev dependencies:
# Just update package.json and run:
pnpm install
```

### Fresh clone by new developer
```bash
# They get production deps automatically (zero-config works!)
# To develop:
./scripts/dev-mode-on.sh
```

## FAQ

**Q: Why commit node_modules?**
A: Claude Code plugins need zero-config installation. Users can't run `pnpm install` during plugin activation.

**Q: Why not use .gitignore for dev deps?**
A: .gitignore is committed, so it would prevent updating production deps. `.git/info/exclude` is local-only.

**Q: What if I forget to run dev-mode-on?**
A: Commands like `pnpm lint` will fail with "command not found". Just run the script.

**Q: Can I commit while in dev mode?**
A: Yes! Dev dependencies are hidden from git, so only your source code changes show up.

**Q: How often do I update production deps?**
A: Rarely - only when adding new runtime dependencies or upgrading critical packages.

## Best Practices

1. **Run dev-mode-on.sh after every clone/pull**
   - Ensures dev tools are installed and hidden

2. **Never manually modify .git/info/exclude**
   - Use the provided scripts

3. **Don't commit with dev mode off**
   - You'll accidentally commit dev dependency metadata changes

4. **Document production dependency changes**
   - When using update-prod-deps.sh, write clear commit messages

5. **Keep scripts directory committed**
   - Other developers need these tools
