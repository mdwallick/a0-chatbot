#!/bin/bash
# Sync environment variables to Vercel
# Usage: ./scripts/deploy/vercel-env-sync.sh [environment]
# Environments: production, preview, development

set -e

ENVIRONMENT=${1:-production}
ENV_FILE=".env.local"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Syncing environment variables to Vercel ($ENVIRONMENT)${NC}"

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

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: $ENV_FILE not found${NC}"
    exit 1
fi

# Required environment variables for production
REQUIRED_VARS=(
    "AUTH0_DOMAIN"
    "AUTH0_CLIENT_ID"
    "AUTH0_CLIENT_SECRET"
    "AUTH0_SECRET"
    "AUTH0_CLIENT_ID_MGMT"
    "AUTH0_CLIENT_SECRET_MGMT"
    "AUTH0_ISSUER_BASE_URL"
    "APP_BASE_URL"
    "DATABASE_URL"
    "OPENAI_API_KEY"
    "OPENAI_MODEL"
    "ENABLED_CONNECTIONS"
)

# Optional but recommended
OPTIONAL_VARS=(
    "LITELLM_API_KEY"
    "LITELLM_BASE_URL"
    "GOOGLE_CX"
    "GOOGLE_SEARCH_API_KEY"
    "SALESFORCE_LOGIN_URL"
    "IMAGES_PER_DAY_LIMIT"
)

echo ""
echo -e "${YELLOW}Checking required variables...${NC}"

missing_vars=()
for var in "${REQUIRED_VARS[@]}"; do
    value=$(grep "^${var}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ -z "$value" ] || [ "$value" == "" ]; then
        missing_vars+=("$var")
        echo -e "  ${RED}✗ $var is missing or empty${NC}"
    else
        echo -e "  ${GREEN}✓ $var${NC}"
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo ""
    echo -e "${RED}Error: Missing required environment variables: ${missing_vars[*]}${NC}"
    echo -e "${YELLOW}Please update $ENV_FILE and try again.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Checking optional variables...${NC}"
for var in "${OPTIONAL_VARS[@]}"; do
    value=$(grep "^${var}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ -z "$value" ] || [ "$value" == "" ]; then
        echo -e "  ${YELLOW}⚠ $var is not set (optional)${NC}"
    else
        echo -e "  ${GREEN}✓ $var${NC}"
    fi
done

echo ""
read -p "Do you want to sync these variables to Vercel $ENVIRONMENT? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo -e "${YELLOW}Syncing variables to Vercel...${NC}"

# Sync each required variable
for var in "${REQUIRED_VARS[@]}"; do
    value=$(grep "^${var}=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ -n "$value" ]; then
        echo -n "  Setting $var... "
        # Remove existing and add new
        vercel env rm "$var" "$ENVIRONMENT" -y 2>/dev/null || true
        echo "$value" | vercel env add "$var" "$ENVIRONMENT" 2>/dev/null
        echo -e "${GREEN}done${NC}"
    fi
done

# Sync optional variables that have values
for var in "${OPTIONAL_VARS[@]}"; do
    value=$(grep "^${var}=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ -n "$value" ]; then
        echo -n "  Setting $var... "
        vercel env rm "$var" "$ENVIRONMENT" -y 2>/dev/null || true
        echo "$value" | vercel env add "$var" "$ENVIRONMENT" 2>/dev/null
        echo -e "${GREEN}done${NC}"
    fi
done

echo ""
echo -e "${GREEN}Environment variables synced successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Run database migrations if schema changed: npm run prisma:migrate"
echo "  2. Deploy to Vercel: git push origin main"
echo "  3. Or trigger manual deploy: vercel --prod"
