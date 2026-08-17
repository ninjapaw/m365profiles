#!/usr/bin/env bash
set -Eeuo pipefail

location="${AZURE_LOCATION:-eastus2}"
environment_name="${AZURE_ENVIRONMENT:-development}"
resource_group="${AZURE_RESOURCE_GROUP:-}"
site_name="${AZURE_STATIC_WEB_APP_NAME:-}"
public_site_url="${AZURE_PUBLIC_SITE_URL:-}"
subscription_id=""
repository=""

usage() {
  cat <<'EOF'
Bootstrap Azure and GitHub OIDC for M365 Profiles.

Usage: infra/azure/bootstrap.sh --resource-group <name> --site-name <name> --public-site-url <https-url> [options]

Options:
  --environment <name>       GitHub Environment scope: development or production
  --resource-group <name>    Azure resource group
  --site-name <name>         Globally unique Static Web App name
  --public-site-url <url>    Canonical HTTPS site URL
  --location <region>        Azure region (default: eastus2)
  --subscription <id>        Azure subscription (default: current az account)
  --repository <owner/name>  GitHub repository (default: current repository)
  --help                     Show this help
EOF
}

while (($# > 0)); do
  case "$1" in
    --environment) environment_name="$2"; shift 2 ;;
    --resource-group) resource_group="$2"; shift 2 ;;
    --site-name) site_name="$2"; shift 2 ;;
    --public-site-url) public_site_url="$2"; shift 2 ;;
    --location) location="$2"; shift 2 ;;
    --subscription) subscription_id="$2"; shift 2 ;;
    --repository) repository="$2"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) printf 'Unknown option: %s\n' "$1" >&2; usage >&2; exit 1 ;;
  esac
done

for command_name in az gh jq; do
  command -v "$command_name" >/dev/null || { printf "Required command '%s' was not found.\n" "$command_name" >&2; exit 1; }
done

[[ "$environment_name" == development || "$environment_name" == production ]] || { printf '%s\n' '--environment must be development or production.' >&2; exit 1; }
[[ -n "$resource_group" && -n "$site_name" && "$public_site_url" =~ ^https://[^[:space:]]+$ ]] || { printf '%s\n' 'Set --resource-group, --site-name, and --public-site-url.' >&2; exit 1; }

az account show >/dev/null
if [[ -n "$subscription_id" ]]; then
  az account set --subscription "$subscription_id"
fi

subscription_name="$(az account show --query name --output tsv)"
if [[ "$subscription_name" == 'MCPP Subscription - DO NOT USE' ]]; then
  printf '%s\n' 'Refusing to use the subscription named MCPP Subscription - DO NOT USE.' >&2
  exit 1
fi

subscription_id="$(az account show --query id --output tsv)"
tenant_id="$(az account show --query tenantId --output tsv)"
gh auth status >/dev/null
repository="${repository:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
github_environment="deployment-${environment_name}"
application_name="m365profiles-${environment_name}-infrastructure-github"

az provider register --namespace Microsoft.Web --wait
az group create --name "$resource_group" --location "$location" --output none

app_json="$(az ad app list --display-name "$application_name" --output json)"
app_count="$(jq --arg name "$application_name" '[.[] | select(.displayName == $name)] | length' <<<"$app_json")"
if [[ "$app_count" == 0 ]]; then
  read -r client_id application_object_id < <(az ad app create --display-name "$application_name" --sign-in-audience AzureADMyOrg --query '[appId,id]' --output tsv)
elif [[ "$app_count" == 1 ]]; then
  client_id="$(jq --arg name "$application_name" -r '.[] | select(.displayName == $name) | .appId' <<<"$app_json")"
  application_object_id="$(jq --arg name "$application_name" -r '.[] | select(.displayName == $name) | .id' <<<"$app_json")"
else
  printf 'Multiple Entra applications are named %s. Rename duplicates and retry.\n' "$application_name" >&2
  exit 1
fi

principal_id="$(az ad sp show --id "$client_id" --query id --output tsv 2>/dev/null || true)"
if [[ -z "$principal_id" ]]; then
  principal_id="$(az ad sp create --id "$client_id" --query id --output tsv)"
fi

credential_name="github-${github_environment}-infrastructure"
credential_file="$(mktemp)"
trap 'rm -f "$credential_file"' EXIT
jq --null-input --arg name "$credential_name" --arg subject "repo:${repository}:environment:${github_environment}" '{name:$name,issuer:"https://token.actions.githubusercontent.com",subject:$subject,audiences:["api://AzureADTokenExchange"],description:"GitHub Actions environment OIDC trust"}' > "$credential_file"
existing_credential="$(az ad app federated-credential list --id "$application_object_id" --query "[?name == '$credential_name'] | [0].id" --output tsv)"
if [[ -n "$existing_credential" ]]; then
  az ad app federated-credential delete --id "$application_object_id" --federated-credential-id "$existing_credential"
fi
az ad app federated-credential create --id "$application_object_id" --parameters "$credential_file" --output none

scope="/subscriptions/${subscription_id}/resourceGroups/${resource_group}"
if [[ "$(az role assignment list --assignee-object-id "$principal_id" --scope "$scope" --role Contributor --query 'length(@)' --output tsv)" == 0 ]]; then
  az role assignment create --assignee-object-id "$principal_id" --assignee-principal-type ServicePrincipal --role Contributor --scope "$scope" --output none
fi

gh api --method PUT "repos/${repository}/environments/${github_environment}" --input - --silent <<'JSON'
{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}
JSON
printf '%s' "$client_id" | gh secret set AZURE_CLIENT_ID --env "$github_environment" --repo "$repository"
printf '%s' "$tenant_id" | gh secret set AZURE_TENANT_ID --env "$github_environment" --repo "$repository"
printf '%s' "$subscription_id" | gh secret set AZURE_SUBSCRIPTION_ID --env "$github_environment" --repo "$repository"
gh variable set AZURE_LOCATION --env "$github_environment" --repo "$repository" --body "$location"
gh variable set AZURE_RESOURCE_GROUP --env "$github_environment" --repo "$repository" --body "$resource_group"
gh variable set AZURE_STATIC_WEB_APP_NAME --env "$github_environment" --repo "$repository" --body "$site_name"
gh variable set AZURE_PUBLIC_SITE_URL --env "$github_environment" --repo "$repository" --body "$public_site_url"
gh variable set AZURE_SITE_SKU --env "$github_environment" --repo "$repository" --body Free

if az staticwebapp show --resource-group "$resource_group" --name "$site_name" --output none 2>/dev/null; then
  az staticwebapp secrets list --resource-group "$resource_group" --name "$site_name" --query properties.apiKey --output tsv |
    gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --env "$github_environment" --repo "$repository"
  printf 'Bootstrap complete. The Static Web Apps deployment token is configured in %s.\n' "$github_environment"
else
  printf 'Bootstrap complete. Run the infrastructure workflow, then rerun this command to set AZURE_STATIC_WEB_APPS_API_TOKEN.\n'
fi
