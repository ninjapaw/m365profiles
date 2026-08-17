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

var resourceTags = union({
  application: 'm365profiles'
  component: 'web'
  environment: environmentName
  managedBy: 'bicep'
  'azd-service-name': 'web'
}, tags)

module staticSite 'br/public:avm/res/web/static-site:0.9.5' = {
  name: 'static-site-${uniqueString(resourceGroup().id, siteName)}'
  params: {
    name: siteName
    location: location
    allowConfigFileUpdates: true
    enableTelemetry: false
    sku: siteSkuName
    stagingEnvironmentPolicy: 'Enabled'
    tags: resourceTags
  }
}

output resourceId string = staticSite.outputs.resourceId
output defaultHostname string = staticSite.outputs.defaultHostname
output siteUrl string = 'https://${staticSite.outputs.defaultHostname}'
