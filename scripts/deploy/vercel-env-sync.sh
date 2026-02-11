#!/bin/bash
# Sync environment variables to Vercel
# Usage: ./scripts/deploy/vercel-env-sync.sh [environment] [options]
#
# Environments: production, preview
#
# Options:
#   --dry-run    Show what would be synced without making changes
#
# Environment file layering:
#   preview     → .env.vercel
#   production  → .env.vercel + .env.production (overlay)
#
# File purposes:
#   .env.local       → Local development only (not used by this script)
#   .env.vercel      → Shared Vercel values (DATABASE_URL, API keys, dev Auth0)
#   .env.production  → Production-only overrides (production Auth0 credentials)

set -e

ENVIRONMENT=${1:-production}
DRY_RUN=false

# Parse options
shift || true
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
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Vercel Environment Sync${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Target: ${YELLOW}$ENVIRONMENT${NC}"
if [ "$DRY_RUN" = true ]; then
    echo -e "Mode: ${YELLOW}DRY RUN (no changes will be made)${NC}"
fi
echo ""

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

# Check base env file exists
if [ ! -f ".env.vercel" ]; then
    echo -e "${RED}Error: .env.vercel not found${NC}"
    echo ""
    echo -e "${YELLOW}Create .env.vercel with shared Vercel values:${NC}"
    echo "  DATABASE_URL      - Vercel/production database"
    echo "  AUTH0_*           - Dev Auth0 app credentials (shared for preview)"
    echo "  OPENAI_API_KEY    - API keys"
    echo "  ENABLED_CONNECTIONS"
    echo ""
    echo "This file is used as the base for both preview and production deploys."
    exit 1
fi

# For production, check if .env.production exists
if [ "$ENVIRONMENT" = "production" ] && [ ! -f ".env.production" ]; then
    echo -e "${RED}Error: .env.production not found${NC}"
    echo ""
    echo -e "${YELLOW}Create .env.production with production-only overrides:${NC}"
    echo "  AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET,"
    echo "  AUTH0_SECRET, AUTH0_ISSUER_BASE_URL, APP_BASE_URL"
    echo ""
    echo "Other values will be read from .env.vercel"
    exit 1
fi

# Create a temporary merged env file
MERGED_ENV=$(mktemp)
trap "rm -f $MERGED_ENV" EXIT

# Start with .env.vercel as base
cp .env.vercel "$MERGED_ENV"

# For production, overlay .env.production
if [ "$ENVIRONMENT" = "production" ] && [ -f ".env.production" ]; then
    echo -e "${BLUE}Loading:${NC}"
    echo -e "  Base:    .env.vercel"
    echo -e "  Overlay: .env.production"
    echo ""

    # Overlay .env.production values
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip empty lines and comments
        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

        # Extract variable name
        var_name=$(echo "$line" | cut -d'=' -f1)

        # Remove existing line with same var name and add new one
        grep -v "^${var_name}=" "$MERGED_ENV" > "${MERGED_ENV}.tmp" || true
        mv "${MERGED_ENV}.tmp" "$MERGED_ENV"
        echo "$line" >> "$MERGED_ENV"
    done < .env.production
else
    echo -e "${BLUE}Loading:${NC} .env.vercel"
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
)

# Function to check if variable exists and has value
check_var() {
    local var=$1
    local value=$(grep "^${var}=" "$MERGED_ENV" 2>/dev/null | tail -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ -z "$value" ] || [ "$value" == "" ]; then
        return 1
    fi
    return 0
}

# Function to get variable value
get_var() {
    local var=$1
    grep "^${var}=" "$MERGED_ENV" | tail -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'"
}

# Function to get variable source
get_source() {
    local var=$1
    if [ "$ENVIRONMENT" = "production" ] && [ -f ".env.production" ]; then
        if grep -q "^${var}=" .env.production 2>/dev/null; then
            echo ".env.production"
        else
            echo ".env.vercel"
        fi
    else
        echo ".env.vercel"
    fi
}

# Function to sync a variable
sync_var() {
    local var=$1
    local value=$(get_var "$var")
    if [ -n "$value" ]; then
        if [ "$DRY_RUN" = true ]; then
            echo -e "  ${BLUE}[DRY RUN]${NC} Would set $var"
        else
            echo -n "  Setting $var... "
            vercel env rm "$var" "$ENVIRONMENT" -y 2>/dev/null || true
            echo "$value" | vercel env add "$var" "$ENVIRONMENT" 2>/dev/null
            echo -e "${GREEN}done${NC}"
        fi
    fi
}

echo -e "${YELLOW}Checking variables...${NC}"
echo ""

# Check Auth0 credentials
echo -e "${YELLOW}Auth0 Credentials:${NC}"
for var in "${AUTH0_VARS[@]}"; do
    if check_var "$var"; then
        source=$(get_source "$var")
        echo -e "  ${GREEN}✓${NC} $var ${BLUE}← $source${NC}"
    else
        echo -e "  ${RED}✗${NC} $var (missing)"
    fi
done

echo ""
echo -e "${YELLOW}Required Variables:${NC}"
missing_required=false
for var in "${REQUIRED_VARS[@]}"; do
    if check_var "$var"; then
        source=$(get_source "$var")
        echo -e "  ${GREEN}✓${NC} $var ${BLUE}← $source${NC}"
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
    if check_var "$var"; then
        source=$(get_source "$var")
        echo -e "  ${GREEN}✓${NC} $var ${BLUE}← $source${NC}"
    else
        echo -e "  ${YELLOW}⚠${NC} $var (not set)"
    fi
done

echo ""
if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}DRY RUN - showing what would be synced:${NC}"
else
    read -p "Sync these variables to Vercel $ENVIRONMENT? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

echo ""
echo -e "${YELLOW}Syncing to Vercel ($ENVIRONMENT)...${NC}"

# Sync all variables
for var in "${AUTH0_VARS[@]}"; do
    if check_var "$var"; then
        sync_var "$var"
    fi
done

for var in "${REQUIRED_VARS[@]}"; do
    if check_var "$var"; then
        sync_var "$var"
    fi
done

for var in "${OPTIONAL_VARS[@]}"; do
    if check_var "$var"; then
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
echo -e "${YELLOW}Next steps:${NC}"
echo "  • Verify in Vercel dashboard: https://vercel.com"
echo "  • Deploy: git push origin main"
