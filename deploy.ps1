# Deploy Job Tracker to Azure Web App (preserves App Settings)

$AppName = "your_app_name" # Update with your Azure Web App name
$ResourceGroup = "your_resource_group_name" # Update with your resource group name
$Source = "$(Split-Path -Parent $MyInvocation.MyCommand.Path)" # Directory of this script
$ZipPath = "$Source\deploy.zip"

$include = @(
    "$Source\.env.example",
    "$Source\app.js",
    "$Source\index.html",
    "$Source\requirements.txt",
    "$Source\server.py",
    "$Source\startup.sh",
    "$Source\styles.css"
)

Write-Host "Creating deployment package..." -ForegroundColor Cyan
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path $include -DestinationPath $ZipPath -Force

Write-Host "Deploying to Azure..." -ForegroundColor Cyan
az webapp deploy --name $AppName --resource-group $ResourceGroup --src-path $ZipPath --type zip --clean true

Write-Host "Cleaning up..." -ForegroundColor Cyan
Remove-Item $ZipPath -Force

Write-Host "Done! App deployed to: https://$AppName.azurewebsites.net" -ForegroundColor Green
