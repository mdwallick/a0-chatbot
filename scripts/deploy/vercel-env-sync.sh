#!/bin/bash
# Sync environment variables to Vercel
# Usage: ./scripts/deploy/vercel-env-sync.sh [options]
#
# Options:
#   --dry-run    Show what would be synced without making changes
#
# Environment files:
#   .env.vercel      → Shared values (set for ALL Vercel environments)
#   .env.production  → Production overrides (set for production ONLY)
#
# Variables in .env.vercel that are NOT overridden in .env.production
# will be set for all environments (production, preview, development).
#
# Variables in .env.production will only be set for production.

set -e

DRY_RUN=false

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Vercel Environment Sync${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
if [ "$DRY_RUN" = true ]; then
    echo -e "Mode: ${YELLOW}DRY RUN (no changes will be made)${NC}"
    echo ""
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}Error: Vercel CLI is not installed. Run: npm i -g vercel${NC}"
    exit 1
fi

# Check if logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo -e "${RED}Error: Not logged in to Vercel. Run: vercel login${NC}"
    exit 1
fi

# Check env files exist
if [ ! -f ".env.vercel" ]; then
    echo -e "${RED}Error: .env.vercel not found${NC}"
    echo ""
    echo -e "${YELLOW}Create .env.vercel with shared Vercel values:${NC}"
    echo "  DATABASE_URL, OPENAI_API_KEY, dev Auth0 credentials, etc."
    exit 1
fi

if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}Warning: .env.production not found${NC}"
    echo "All variables will be set for all environments."
    echo ""
fi

# All variables to sync
AUTH0_VARS=(
    "AUTH0_DOMAIN"
    "AUTH0_CLIENT_ID"
    "AUTH0_CLIENT_SECRET"
    "AUTH0_SECRET"
    "AUTH0_ISSUER_BASE_URL"
    "AUTH0_CLIENT_ID_MGMT"
    "AUTH0_CLIENT_SECRET_MGMT"
    "APP_BASE_URL"
)

REQUIRED_VARS=(
    "DATABASE_URL"
    "OPENAI_API_KEY"
    "OPENAI_MODEL"
    "ENABLED_CONNECTIONS"
)

OPTIONAL_VARS=(
    "LITELLM_API_KEY"
    "LITELLM_BASE_URL"
    "GOOGLE_CX"
    "GOOGLE_SEARCH_API_KEY"
    "SALESFORCE_LOGIN_URL"
    "IMAGES_PER_DAY_LIMIT"
    "DALL_E_MODEL"
    "SERP_API_KEY"
    "CRON_SECRET"
)

ALL_VARS=("${AUTH0_VARS[@]}" "${REQUIRED_VARS[@]}" "${OPTIONAL_VARS[@]}")

# Function to check if variable exists in a file
var_in_file() {
    local var=$1
    local file=$2
    grep -q "^${var}=" "$file" 2>/dev/null
}

# Function to get variable value from a file
get_var_from_file() {
    local var=$1
    local file=$2
    grep "^${var}=" "$file" 2>/dev/null | tail -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'"
}

# Function to get the effective value (production override or vercel base)
get_effective_value() {
    local var=$1
    if [ -f ".env.production" ] && var_in_file "$var" ".env.production"; then
        get_var_from_file "$var" ".env.production"
    else
        get_var_from_file "$var" ".env.vercel"
    fi
}

# Function to determine target environments
get_target_envs() {
    local var=$1
    if [ -f ".env.production" ] && var_in_file "$var" ".env.production"; then
        echo "production"
    else
        echo "production preview development"
    fi
}

# Function to sync a variable
sync_var() {
    local var=$1
    local value=$(get_effective_value "$var")
    local target_envs=$(get_target_envs "$var")

    if [ -z "$value" ]; then
        return
    fi

    if [ "$DRY_RUN" = true ]; then
        if [ "$target_envs" = "production" ]; then
            echo -e "  ${BLUE}[DRY RUN]${NC} Would set $var → ${CYAN}production only${NC}"
        else
            echo -e "  ${BLUE}[DRY RUN]${NC} Would set $var → ${GREEN}all environments${NC}"
        fi
    else
        # Remove from all environments first
        for env in production preview development; do
            vercel env rm "$var" "$env" -y 2>/dev/null || true
        done

        # Add to target environments
        if [ "$target_envs" = "production" ]; then
            echo -n "  Setting $var (production only)... "
            echo "$value" | vercel env add "$var" production 2>/dev/null
        else
            echo -n "  Setting $var (all environments)... "
            echo "$value" | vercel env add "$var" production preview development 2>/dev/null
        fi
        echo -e "${GREEN}done${NC}"
    fi
}

echo -e "${BLUE}Loading:${NC}"
echo -e "  Base:      .env.vercel"
if [ -f ".env.production" ]; then
    echo -e "  Overrides: .env.production"
fi
echo ""

echo -e "${YELLOW}Checking variables...${NC}"
echo ""

# Check Auth0 credentials
echo -e "${YELLOW}Auth0 Credentials:${NC}"
for var in "${AUTH0_VARS[@]}"; do
    value=$(get_effective_value "$var")
    if [ -n "$value" ]; then
        target=$(get_target_envs "$var")
        if [ "$target" = "production" ]; then
            echo -e "  ${GREEN}✓${NC} $var ${CYAN}← .env.production (production only)${NC}"
        else
            echo -e "  ${GREEN}✓${NC} $var ${BLUE}← .env.vercel (all environments)${NC}"
        fi
    else
        echo -e "  ${RED}✗${NC} $var (missing)"
    fi
done

echo ""
echo -e "${YELLOW}Required Variables:${NC}"
missing_required=false
for var in "${REQUIRED_VARS[@]}"; do
    value=$(get_effective_value "$var")
    if [ -n "$value" ]; then
        target=$(get_target_envs "$var")
        if [ "$target" = "production" ]; then
            echo -e "  ${GREEN}✓${NC} $var ${CYAN}← .env.production (production only)${NC}"
        else
            echo -e "  ${GREEN}✓${NC} $var ${BLUE}← .env.vercel (all environments)${NC}"
        fi
    else
        echo -e "  ${RED}✗${NC} $var (missing)"
        missing_required=true
    fi
done

if [ "$missing_required" = true ]; then
    echo ""
    echo -e "${RED}Error: Missing required variables${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Optional Variables:${NC}"
for var in "${OPTIONAL_VARS[@]}"; do
    value=$(get_effective_value "$var")
    if [ -n "$value" ]; then
        target=$(get_target_envs "$var")
        if [ "$target" = "production" ]; then
            echo -e "  ${GREEN}✓${NC} $var ${CYAN}← .env.production (production only)${NC}"
        else
            echo -e "  ${GREEN}✓${NC} $var ${BLUE}← .env.vercel (all environments)${NC}"
        fi
    else
        echo -e "  ${YELLOW}⚠${NC} $var (not set)"
    fi
done

echo ""
if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}DRY RUN - showing what would be synced:${NC}"
    echo ""
else
    read -p "Sync these variables to Vercel? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    echo ""
fi

echo -e "${YELLOW}Syncing to Vercel...${NC}"

# Sync all variables
for var in "${ALL_VARS[@]}"; do
    value=$(get_effective_value "$var")
    if [ -n "$value" ]; then
        sync_var "$var"
    fi
done

echo ""
if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}DRY RUN complete. No changes were made.${NC}"
else
    echo -e "${GREEN}Environment variables synced successfully!${NC}"
fi

echo ""
echo -e "${YELLOW}Summary:${NC}"
echo -e "  ${BLUE}Blue${NC} = set for all environments (production, preview, development)"
echo -e "  ${CYAN}Cyan${NC} = set for production only"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  • Verify in Vercel dashboard: https://vercel.com"
echo "  • Deploy: git push origin main"
