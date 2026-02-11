#!/bin/bash
# Sync environment variables to Vercel
# Usage: ./scripts/deploy/vercel-env-sync.sh [options]
#
# Options:
#   --dry-run    Show what would be synced without making changes
#
# Environment files:
#   .env.vercel      → Values for preview and development environments
#   .env.production  → Values for production environment (overrides .env.vercel)
#
# All variables from .env.vercel are set for preview and development.
# For production, values from .env.production take precedence, falling back
# to .env.vercel for variables not overridden.

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
    echo -e "${YELLOW}Create .env.vercel with values for preview/development:${NC}"
    echo "  DATABASE_URL, OPENAI_API_KEY, dev Auth0 credentials, etc."
    exit 1
fi

if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}Warning: .env.production not found${NC}"
    echo "Production will use .env.vercel values."
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

# Function to sync a variable to specific environments
sync_var_to_env() {
    local var=$1
    local value=$2
    local env=$3

    if [ -z "$value" ]; then
        return
    fi

    if [ "$DRY_RUN" = true ]; then
        return
    fi

    # Remove existing and add new
    vercel env rm "$var" "$env" -y 2>/dev/null || true
    echo "$value" | vercel env add "$var" "$env" 2>/dev/null
}

echo -e "${BLUE}Loading:${NC}"
echo -e "  Preview/Development: .env.vercel"
if [ -f ".env.production" ]; then
    echo -e "  Production:          .env.production (with .env.vercel fallback)"
fi
echo ""

echo -e "${YELLOW}Checking variables...${NC}"
echo ""

# Check Auth0 credentials
echo -e "${YELLOW}Auth0 Credentials:${NC}"
for var in "${AUTH0_VARS[@]}"; do
    vercel_value=$(get_var_from_file "$var" ".env.vercel")
    prod_value=$(get_var_from_file "$var" ".env.production")

    if [ -n "$vercel_value" ] || [ -n "$prod_value" ]; then
        if [ -n "$prod_value" ]; then
            echo -e "  ${GREEN}✓${NC} $var"
            echo -e "      ${BLUE}preview/dev${NC}: .env.vercel"
            echo -e "      ${CYAN}production${NC}:  .env.production"
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
    vercel_value=$(get_var_from_file "$var" ".env.vercel")
    prod_value=$(get_var_from_file "$var" ".env.production")

    if [ -n "$vercel_value" ] || [ -n "$prod_value" ]; then
        if [ -n "$prod_value" ]; then
            echo -e "  ${GREEN}✓${NC} $var"
            echo -e "      ${BLUE}preview/dev${NC}: .env.vercel"
            echo -e "      ${CYAN}production${NC}:  .env.production"
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
    vercel_value=$(get_var_from_file "$var" ".env.vercel")
    prod_value=$(get_var_from_file "$var" ".env.production")

    if [ -n "$vercel_value" ] || [ -n "$prod_value" ]; then
        if [ -n "$prod_value" ]; then
            echo -e "  ${GREEN}✓${NC} $var"
            echo -e "      ${BLUE}preview/dev${NC}: .env.vercel"
            echo -e "      ${CYAN}production${NC}:  .env.production"
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
    for var in "${ALL_VARS[@]}"; do
        vercel_value=$(get_var_from_file "$var" ".env.vercel")
        prod_value=$(get_var_from_file "$var" ".env.production")

        if [ -n "$vercel_value" ]; then
            echo -e "  ${BLUE}[DRY RUN]${NC} $var → preview, development"
        fi
        if [ -n "$prod_value" ]; then
            echo -e "  ${CYAN}[DRY RUN]${NC} $var → production (override)"
        elif [ -n "$vercel_value" ]; then
            echo -e "  ${BLUE}[DRY RUN]${NC} $var → production (from .env.vercel)"
        fi
    done
    echo ""
    echo -e "${BLUE}DRY RUN complete. No changes were made.${NC}"
else
    read -p "Sync these variables to Vercel? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    echo ""

    echo -e "${YELLOW}Syncing to Vercel...${NC}"

    for var in "${ALL_VARS[@]}"; do
        vercel_value=$(get_var_from_file "$var" ".env.vercel")
        prod_value=$(get_var_from_file "$var" ".env.production")

        # Set preview and development from .env.vercel
        if [ -n "$vercel_value" ]; then
            echo -n "  Setting $var (preview, development)... "
            sync_var_to_env "$var" "$vercel_value" "preview"
            sync_var_to_env "$var" "$vercel_value" "development"
            echo -e "${GREEN}done${NC}"
        fi

        # Set production from .env.production (or fall back to .env.vercel)
        if [ -n "$prod_value" ]; then
            echo -n "  Setting $var (production - override)... "
            sync_var_to_env "$var" "$prod_value" "production"
            echo -e "${GREEN}done${NC}"
        elif [ -n "$vercel_value" ]; then
            echo -n "  Setting $var (production - from .env.vercel)... "
            sync_var_to_env "$var" "$vercel_value" "production"
            echo -e "${GREEN}done${NC}"
        fi
    done

    echo ""
    echo -e "${GREEN}Environment variables synced successfully!${NC}"
fi

echo ""
echo -e "${YELLOW}Summary:${NC}"
echo -e "  ${BLUE}preview/development${NC} ← .env.vercel"
echo -e "  ${CYAN}production${NC}          ← .env.production (with .env.vercel fallback)"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  • Verify in Vercel dashboard: https://vercel.com"
echo "  • Deploy: git push origin main"
