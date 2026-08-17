using './main.bicep'

param siteName = 'm365profiles-example-site'
param location = 'eastus2'
param environmentName = 'development'
param siteSkuName = 'Free'
param tags = {
  application: 'm365profiles'
  component: 'web'
}
