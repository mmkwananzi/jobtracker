# jobtracker

Steps to Deploy
Create the Azure Web App in Azure Portal:

Runtime: Python 3.12
OS: Linux
Set Application Settings (Configuration > Application Settings):

AZURE_ACCOUNT_NAME = (your Storage account name)
AZURE_ACCOUNT_KEY = (your key)
AZURE_CONTAINER_NAME = job-tracker
AZURE_BLOB_NAME = applications.json
Set the Startup Command (Configuration > General Settings):

startup.sh

Deploy using one of these methods:

VS Code → Azure App Service extension → right-click Deploy
CLI: az webapp up --name your-app-name --resource-group your-rg
GitHub Actions → connect your repo in the Deployment Center
Your existing data in Azure Blob Storage will carry over automatically since the Web App connects to the same storage account.
