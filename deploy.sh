#!/bin/bash
set -e

CONFIG_FILE="${1:-cloudrun.env}"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "🔴 Configuration file '$CONFIG_FILE' not found."
    exit 1
fi
source "$CONFIG_FILE"

required_vars=("PROJECT_ID" "SERVICE_NAME" "REGION" "SOURCE_PATH" "REPO_NAME")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "🔴 Error: Required variable '$var' not set."
        exit 1
    fi
done

gcloud config set project "$PROJECT_ID"

cd "$SOURCE_PATH"

COMMIT_SHA=$(git rev-parse --short HEAD)
IMAGE="gcr.io/$PROJECT_ID/$REPO_NAME/app:$COMMIT_SHA"

# 🔧 Build the image using cloudbuild.yaml
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_AUTH0_DOMAIN="$AUTH0_DOMAIN",_AUTH0_CLIENT_ID="$AUTH0_CLIENT_ID",_APP_BASE_URL="$APP_BASE_URL",COMMIT_SHA="$COMMIT_SHA" \
  .

# 🚀 Deploy using the image from Cloud Build
gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE" \
  --region="$REGION" \
  --platform=managed \
  --port="${PORT:-8080}" \
  ${ALLOW_UNAUTHENTICATED:+--allow-unauthenticated} \
  ${RUN_SERVICE_ACCOUNT:+--service-account=$RUN_SERVICE_ACCOUNT} \
  ${CPU:+--cpu=$CPU} \
  ${MEMORY:+--memory=$MEMORY} \
  ${MIN_INSTANCES:+--min-instances=$MIN_INSTANCES} \
  ${MAX_INSTANCES:+--max-instances=$MAX_INSTANCES} \
  ${CONCURRENCY:+--concurrency=$CONCURRENCY} \
  ${TIMEOUT_SECONDS:+--timeout=$TIMEOUT_SECONDS} \
  ${VPC_CONNECTOR:+--vpc-connector=$VPC_CONNECTOR --vpc-egress=all} \
  ${CLOUD_SQL_INSTANCES:+--add-cloudsql-instances=$CLOUD_SQL_INSTANCES} \
  ${ENV_VARS_FILE:+--env-vars-file=$ENV_VARS_FILE} \
  ${SECRETS_AS_ENV_VARS:+--set-secrets=$SECRETS_AS_ENV_VARS} \
  ${SECRETS_AS_VOLUMES:+--set-secrets=$SECRETS_AS_VOLUMES}

cd - > /dev/null

echo "✅ Deployed: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME?project=$PROJECT_ID"


# #!/bin/bash
# set -e # Exit immediately if a command exits with a non-zero status.
# # set -x # Print commands and their arguments as they are executed (for debugging).

# # --- Configuration ---
# CONFIG_FILE="${1:-cloudrun.env}" # Allow passing config file as first argument, default to cloudrun.env

# if [ ! -f "$CONFIG_FILE" ]; then
#     echo "🔴 Configuration file '$CONFIG_FILE' not found."
#     exit 1
# fi
# echo "🔵 Using configuration file: $CONFIG_FILE"
# source "$CONFIG_FILE" # Load configuration variables

# # --- Validate Required Variables ---
# required_vars=("PROJECT_ID" "SERVICE_NAME" "REGION" "SOURCE_PATH")

# for var in "${required_vars[@]}"; do
#     if [ -z "${!var}" ]; then # Indirect expansion to get variable value
#         echo "🔴 Error: Required configuration variable '$var' is not set in '$CONFIG_FILE'."
#         exit 1
#     fi
# done

# # --- Set Google Cloud Project ---
# echo "🔵 Setting active Google Cloud project to: $PROJECT_ID"
# gcloud config set project "$PROJECT_ID"

# # --- Deploy to Cloud Run using --source ---
# echo "🚀 Deploying service '$SERVICE_NAME' to Cloud Run in region '$REGION' from source path '$SOURCE_PATH'..."
# echo "   This will build the image using Google Cloud Build implicitly."

# # Navigate to source directory for 'gcloud run deploy --source'
# # This makes sure '.' in '--source .' refers to the correct directory
# # if SOURCE_PATH is relative and the script is run from elsewhere.
# # If SOURCE_PATH is absolute, this pushd/popd is still safe.
# original_dir=$(pwd)
# cd "$SOURCE_PATH"

# deploy_args=(
#     "run" "deploy" "$SERVICE_NAME"
#     "--source=." # Use the current directory (which we've cd'd into)
#     "--region=$REGION"
#     "--platform=managed"
#     "--port=${PORT:-8080}"
# )

# if [ "$ALLOW_UNAUTHENTICATED" == "true" ]; then
#     deploy_args+=("--allow-unauthenticated")
# else
#     deploy_args+=("--no-allow-unauthenticated")
# fi

# if [ -n "$RUN_SERVICE_ACCOUNT" ]; then
#     deploy_args+=("--service-account=$RUN_SERVICE_ACCOUNT")
# fi

# if [ -n "$CPU" ]; then
#     deploy_args+=("--cpu=$CPU")
# fi

# if [ -n "$MEMORY" ]; then
#     deploy_args+=("--memory=$MEMORY")
# fi

# if [ -n "$MIN_INSTANCES" ]; then
#     deploy_args+=("--min-instances=$MIN_INSTANCES")
# fi

# if [ -n "$MAX_INSTANCES" ]; then
#     deploy_args+=("--max-instances=$MAX_INSTANCES")
# fi

# if [ -n "$CONCURRENCY" ]; then
#     deploy_args+=("--concurrency=$CONCURRENCY")
# fi

# if [ -n "$TIMEOUT_SECONDS" ]; then
#     deploy_args+=("--timeout=$TIMEOUT_SECONDS")
# fi

# if [ -n "$CLOUD_BUILD_TIMEOUT" ]; then
#     deploy_args+=("--timeout=$CLOUD_BUILD_TIMEOUT") # For the build process itself
# fi

# # if [ -n "$ENV_VARS" ]; then
# #     deploy_args+=("--set-env-vars=$ENV_VARS")
# # else
# #     deploy_args+=("--clear-env-vars")
# # fi
# # Add new logic for --env-vars-file
# if [ -n "$ENV_VARS_FILE" ]; then
#     if [ -f "$ENV_VARS_FILE" ]; then
#         deploy_args+=("--env-vars-file=$ENV_VARS_FILE")
#     else
#         echo "🔴 WARNING: Environment variables file '$ENV_VARS_FILE' not found. Skipping."
#     fi
# else
#     # If no file is specified, you might want to clear all existing non-secret env vars
#     # Be careful with this if you expect some to persist from previous deployments and only update via file
#     deploy_args+=("--clear-env-vars") # Clears non-secret env vars not set by secrets
# fi

# # Prepare secrets arguments
# secrets_args_string=""
# if [ -n "$SECRETS_AS_ENV_VARS" ]; then
#     secrets_args_string+="$SECRETS_AS_ENV_VARS"
# fi
# if [ -n "$SECRETS_AS_VOLUMES" ]; then
#     if [ -n "$secrets_args_string" ]; then # Add comma if joining with env secrets
#         secrets_args_string+=","
#     fi
#     secrets_args_string+="$SECRETS_AS_VOLUMES"
# fi

# if [ -n "$secrets_args_string" ]; then
#     deploy_args+=("--set-secrets=$secrets_args_string")
# else
#     deploy_args+=("--clear-secrets")
# fi

# if [ -n "$VPC_CONNECTOR" ]; then
#     deploy_args+=("--vpc-connector=$VPC_CONNECTOR")
#     deploy_args+=("--vpc-egress=all")
# else
#     deploy_args+=("--clear-vpc-connector")
# fi

# if [ -n "$CLOUD_SQL_INSTANCES" ]; then
#     deploy_args+=("--add-cloudsql-instances=$CLOUD_SQL_INSTANCES") # Use --set-cloudsql-instances for replacement
# else
#     deploy_args+=("--clear-cloudsql-instances")
# fi

# # Execute deployment
# gcloud "${deploy_args[@]}"

# # Return to original directory
# cd "$original_dir"

# SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --platform=managed --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)')

# echo "✅ Service '$SERVICE_NAME' deployed successfully!"
# echo "🔗 Service URL: $SERVICE_URL"
