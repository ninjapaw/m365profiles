# Azure Deployment Plan

- **Status:** Validated
- **Target:** Azure Static Web Apps
- **Application:** M365 Profiles (Astro static site)
- **Mode:** Modernize an existing static site without adding a backend.

## Architecture

- Deploy the existing Astro `dist/` output to one `Microsoft.Web/staticSites`
  resource.
- Provision the resource with `infra/azure/site/main.bicep`; the default SKU is
  `Free`, with `Standard` available as an explicit workflow input.
- Use a GitHub Environment per target (`deployment-development` and
  `deployment-production`) so public build configuration and credentials are
  isolated.
- Use GitHub Actions OIDC and an Azure `Contributor` role scoped to the target
  resource group for infrastructure changes. The Static Web Apps deployment
  token remains an Environment secret because the publish action requires it.
- Keep the existing static-only architecture: no API, Functions, database,
  Key Vault, telemetry, or browser-exposed secrets are introduced.

## Deliverables

1. Azure Developer CLI configuration and Bicep parameter templates.
2. An idempotent bootstrap script that creates the resource group, configures a
   GitHub OIDC application, assigns least necessary resource-group scope, and
   writes GitHub Environment configuration when `gh` is authenticated.
3. A `what-if`-first Azure infrastructure workflow and a separate Astro build
   and Static Web Apps publish workflow.
4. Azure Static Web Apps response headers, environment validation, a Deploy to
   Azure resource-provisioning button, and deployment documentation.
5. Repository build, type, content-tree, link, format, Bicep, and workflow
   validation.

## Deployment Context

- Tenant names, subscription identifiers, account labels, and deployment
  approvals are intentionally not stored in this public repository.
- Configure these values in protected GitHub Environments or your local Azure
  CLI context before running `what-if` or deployment operations.

## All Validation Checks Pass

### AZD Recipe Validation Steps

- [x] 1. AZD Installation
- [x] 2. Schema Validation
- [x] 3. Environment Setup
- [x] 4. Authentication Check
- [x] 5. Subscription/Location Check
- [x] 6. Aspire Pre-Provisioning Checks (not applicable; this is not an Aspire project)
- [x] 7. Provision Preview
- [x] 8. Build Verification
- [x] 9. Docker Build Context Validation (not applicable; no Dockerfile is used)
- [x] 10. Package Validation
- [x] 11. Azure Policy Validation
- [x] 12. Aspire Post-Provisioning Checks (not applicable; this is not an Aspire project)

- [x] Bicep templates and Bicep parameters compile through the Azure Bicep
  service, including Azure Verified Module `avm/res/web/static-site:0.9.5`.
- [x] Bootstrap and environment-validation shell scripts pass `bash -n`.
- [x] Astro typecheck, decision-tree validation, route simulation, state tests,
  production build, and link checking pass.
- [x] Static Web Apps configuration parses without diagnostics.
- [x] Static review confirms no managed identity, API, storage, or data-plane
  role assignments are needed. The bootstrap-only OIDC principal receives
  `Contributor` at the target resource-group scope for infrastructure changes.
- [ ] The selected Azure CLI context authenticates to the approved subscription.
- [ ] `validate-deployment.sh` completes group-scope Bicep `validate` and
  `what-if` against the target resource group.
- [ ] Azure Policy validation is reviewed for the selected subscription.

## Validation Proof

- `bash -n infra/azure/bootstrap.sh infra/azure/validate-environment.sh`:
  pass.
- Azure Bicep service builds for `infra/main.bicep`,
  `infra/azure/site/main.bicep`, and `infra/azure/site/main.bicepparam`:
  pass with no diagnostics.
- `npm run test`: pass, including 3,155 decision-tree paths and nine state
  invariants.
- `npm run build`: pass, including 1,458 internal and external link checks.
- `npm run check`: tree validation, typecheck, and markdown lint pass; format
  reports only existing unrelated files `bos-launchpad-config.json`,
  `src/lib/pricing.ts`, and `src/pages/about.astro`.
- JSON parsing for `staticwebapp.config.json`, the portal ARM template, and
  azd parameters: pass. `git diff --check`: pass.
- Pending account-bound validation after Azure CLI is installed and configured
  for the intended protected environment. Run the bootstrap command in
  `README.md`, then run the infrastructure workflow with `operation: what-if`
  before its `deploy` operation.
- Production environment validation for `NP-StaticSite-m365profiles-CentralUS`
  in `centralus`: `azd version`, `azd auth login --check-status`, and
  `infra/azure/validate-environment.sh` passed. The environment targets
  `NP-m365profiles-Prod-CentralUS` under subscription
  `aae23697-a987-4b94-95b9-382230c0cce6`.
- `azd provision --preview --no-prompt --environment production`: pass;
  creates one Free Static Web App and makes no modifications or deletions.
- `npm run build` and `azd package --no-prompt --environment production`:
  pass.
- Subscription Azure Policy review: pass; the two inherited assignments do not
  restrict Static Web Apps, Central US, the Free SKU, resource-group creation,
  or the required Bicep tags.
