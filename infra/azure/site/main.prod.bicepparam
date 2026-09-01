using './main.bicep'

param siteName = 'NP-m365profiles-Prod-CentralUS'
param location = 'centralus'
param environmentName = 'production'
param siteSkuName = 'Free'
param tags = {
  application: 'm365profiles'
  component: 'web'
  environment: 'production'
}
