#!/bin/bash
# Deploy to Azure Web App using zip deploy (preserves App Settings)

APP_NAME="gagisa-job-tracker"
RESOURCE_GROUP="GAGISA-SERVER-2022_group"
ZIP_FILE="deploy.zip"

echo "Creating deployment package..."

# Create zip excluding local-only files
cd "C:/AI-Apps/job-tracker"
rm -f $ZIP_FILE
zip -r $ZIP_FILE . -x ".env" "__pycache__/*" "*.pyc" ".venv/*" "venv/*" ".gitignore" "deploy.sh" "deploy.zip" ".azure/*"

echo "Deploying to Azure..."
az webapp deploy \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --src-path $ZIP_FILE \
  --type zip \
  --clean true

echo "Cleaning up..."
rm -f $ZIP_FILE

echo "Done! App deployed to: https://$APP_NAME.azurewebsites.net"
