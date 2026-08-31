using './main.bicep'

param siteName = 'm365profiles-prod-site'
param location = 'centralus'
param environmentName = 'production'
param siteSkuName = 'Free'
param tags = {
  application: 'm365profiles'
  component: 'web'
  environment: 'production'
}
