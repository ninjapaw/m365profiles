targetScope = 'resourceGroup'

@description('Globally unique Azure Static Web App name.')
@minLength(2)
@maxLength(40)
param siteName string

@description('Azure region for the Static Web App resource metadata.')
param location string = resourceGroup().location

@description('Deployment environment used for resource tags.')
param environmentName string = 'development'

@description('Static Web Apps plan. Free is recommended until Standard-only features are required.')
@allowed([
  'Free'
  'Standard'
])
param siteSkuName string = 'Free'

@description('Additional tags applied to the Static Web App.')
param tags object = {}

@description('DNS-validated custom domain. Leave blank until the TXT record exists at the DNS provider.')
param customDomainName string = ''

module staticSite '../../../vendor/pawprint/modules/static-site/main.bicep' = {
  name: 'pawprint-static-site'
  params: {
    siteName: siteName
    location: location
    environmentName: environmentName
    application: 'm365profiles'
    siteSkuName: siteSkuName
    customDomainName: customDomainName
    tags: tags
  }
}

output resourceId string = staticSite.outputs.resourceId
output defaultHostname string = staticSite.outputs.defaultHostname
output siteUrl string = staticSite.outputs.siteUrl
