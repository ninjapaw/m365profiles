using './main.bicep'

param siteName = 'm365profiles-dev-site'
param location = 'centralus'
param environmentName = 'development'
param siteSkuName = 'Free'
param tags = {
  application: 'm365profiles'
  component: 'web'
  environment: 'development'
}
