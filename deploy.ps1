# Deploy Job Tracker to Azure Web App (preserves App Settings)

$AppName = "gagisa-job-tracker"
$ResourceGroup = "GAGISA-SERVER-2022_group"
$Source = "C:\AI-Apps\job-tracker"
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
