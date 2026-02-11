#!/bin/bash
# Pre-deployment checklist validation
# Usage: ./scripts/deploy/pre-deploy-check.sh

# Don't exit on error - we want to collect all issues
set +e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Pre-Deployment Checklist${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

errors=0
warnings=0

# Function to check a condition
check() {
    local description="$1"
    local result="$2"
    if [ "$result" -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} $description"
        return 0
    else
        echo -e "  ${RED}✗${NC} $description"
        ((errors++))
        return 1
    fi
}

warn() {
    local description="$1"
    echo -e "  ${YELLOW}⚠${NC} $description"
    ((warnings++))
}

info() {
    local description="$1"
    echo -e "  ${BLUE}ℹ${NC} $description"
}

# 1. Git checks
echo -e "${YELLOW}Git Status${NC}"
git_branch=$(git branch --show-current)
info "Current branch: $git_branch"

# Check for uncommitted changes (warning, not error - expected during development)
if git diff --quiet && git diff --staged --quiet; then
    check "No uncommitted changes" 0
else
    warn "Uncommitted changes detected (commit before deploying)"
    echo -e "      Run: ${YELLOW}git status${NC} to see changes"
fi

# Check if we're on a feature branch (not main)
if [ "$git_branch" != "main" ]; then
    check "Not on main branch (safe to test)" 0
else
    warn "On main branch - commits will trigger production deploy"
fi

echo ""

# 2. Code quality checks
echo -e "${YELLOW}Code Quality${NC}"

# Lint check
if npm run lint --silent 2>/dev/null; then
    check "ESLint passes" 0
else
    check "ESLint passes" 1
fi

# Type check
if npm run type-check --silent 2>/dev/null; then
    check "TypeScript compiles" 0
else
    check "TypeScript compiles" 1
fi

echo ""

# 3. Build check
echo -e "${YELLOW}Build${NC}"
if npm run build --silent 2>/dev/null; then
    check "Production build succeeds" 0
else
    check "Production build succeeds" 1
fi

echo ""

# 4. Environment checks
echo -e "${YELLOW}Environment${NC}"

if [ -f ".env.local" ]; then
    check ".env.local exists" 0

    # Check critical env vars
    for var in AUTH0_DOMAIN AUTH0_CLIENT_ID DATABASE_URL; do
        value=$(grep "^${var}=" .env.local 2>/dev/null | cut -d'=' -f2-)
        if [ -n "$value" ] && [ "$value" != '""' ] && [ "$value" != "''" ]; then
            check "$var is set" 0
        else
            check "$var is set" 1
        fi
    done
else
    check ".env.local exists" 1
fi

echo ""

# 5. Database checks
echo -e "${YELLOW}Database${NC}"

# Check if Prisma client is generated
if [ -d "lib/generated/prisma" ]; then
    check "Prisma client generated" 0
else
    check "Prisma client generated" 1
    echo -e "      Run: ${YELLOW}npm run prisma:generate${NC}"
fi

# Check for pending migrations
if [ -d "prisma/migrations" ]; then
    migration_count=$(ls -1 prisma/migrations 2>/dev/null | wc -l | tr -d ' ')
    info "Found $migration_count migrations"
fi

echo ""

# 6. Auth0 CLI check
echo -e "${YELLOW}Auth0 CLI${NC}"

if command -v auth0 &> /dev/null; then
    check "Auth0 CLI installed" 0

    # Check if logged in
    if auth0 tenants list &>/dev/null; then
        check "Auth0 CLI authenticated" 0
        tenant=$(auth0 tenants list 2>/dev/null | head -1)
        info "Active tenant: $tenant"
    else
        check "Auth0 CLI authenticated" 1
        echo -e "      Run: ${YELLOW}auth0 login${NC}"
    fi
else
    warn "Auth0 CLI not installed (optional for MCP)"
    echo -e "      Install: ${YELLOW}brew install auth0/auth0-cli/auth0${NC}"
fi

echo ""

# 7. Vercel CLI check
echo -e "${YELLOW}Vercel CLI${NC}"

if command -v vercel &> /dev/null; then
    check "Vercel CLI installed" 0

    if vercel whoami &>/dev/null; then
        check "Vercel CLI authenticated" 0
        vercel_user=$(vercel whoami 2>/dev/null)
        info "Logged in as: $vercel_user"
    else
        check "Vercel CLI authenticated" 1
        echo -e "      Run: ${YELLOW}vercel login${NC}"
    fi
else
    warn "Vercel CLI not installed (optional)"
    echo -e "      Install: ${YELLOW}npm i -g vercel${NC}"
fi

echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}========================================${NC}"

if [ $errors -eq 0 ]; then
    echo -e "  ${GREEN}All checks passed!${NC}"
    if [ $warnings -gt 0 ]; then
        echo -e "  ${YELLOW}$warnings warning(s)${NC}"
    fi
    echo ""
    echo -e "${GREEN}Ready to deploy!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Sync env vars:  ./scripts/deploy/vercel-env-sync.sh production"
    echo "  2. Create PR:      gh pr create"
    echo "  3. Or deploy:      git push origin main"
    exit 0
else
    echo -e "  ${RED}$errors error(s) found${NC}"
    if [ $warnings -gt 0 ]; then
        echo -e "  ${YELLOW}$warnings warning(s)${NC}"
    fi
    echo ""
    echo -e "${RED}Please fix errors before deploying.${NC}"
    exit 1
fi
