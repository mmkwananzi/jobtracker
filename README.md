# GagisaPRO Job Tracker

A web application for tracking job applications, built with Flask and Azure Blob Storage.

## Features

- Track applications with company, job title, location, salary, contacts, and notes
- Application status pipeline: Bookmarked, Applied, Unsuccessful, Phone Screen, Interview, Technical Assessment, Final Round, Offer, Accepted, Rejected, Withdrawn
- Colour-coded status badges for quick visual scanning
- Dashboard stats: Total, Active, Offers, Follow-ups Due
- Sort, search, and filter applications
- Duplicate applications for similar roles
- Job advert URL links for quick access
- Follow-up date highlighting (amber for upcoming, red for overdue)
- Export to CSV
- Data stored persistently in Azure Blob Storage

## Prerequisites

- Python 3.12+
- An Azure Storage Account

## Local Development

1. Install dependencies:

   ```
   pip install flask azure-storage-blob python-dotenv
   ```

2. Create a `.env` file (copy from `.env.example`):

   ```
   AZURE_ACCOUNT_NAME=your_storage_account
   AZURE_ACCOUNT_KEY=your_key
   AZURE_CONTAINER_NAME=job-tracker
   AZURE_BLOB_NAME=applications.json
   ```

3. Run the server:

   ```
   python server.py
   ```

4. Open http://localhost:5000

## Deploying to Azure Web App

### Step 1: Create the Azure Web App

In the Azure Portal, create a new Web App with:
- **Runtime:** Python 3.12
- **OS:** Linux

### Step 2: Set Application Settings

Go to **Configuration > Application Settings** and add:

| Setting | Value |
|---------|-------|
| `AZURE_ACCOUNT_NAME` | Your Storage Account name |
| `AZURE_ACCOUNT_KEY` | Your Storage Account key |
| `AZURE_CONTAINER_NAME` | `job-tracker` |
| `AZURE_BLOB_NAME` | `applications.json` |

### Step 3: Set the Startup Command

Go to **Configuration > General Settings** and set the Startup Command to:

```
startup.sh
```

### Step 4: Deploy

Run the deploy script from PowerShell:

```powershell
C:\location_of_app_files\deploy.ps1
```

This uses `az webapp deploy --type zip` which pushes only the application files and **preserves your App Settings**.

> **Important:** Do not use `az webapp up` as it recreates the Web App and clears your App Settings.

### Redeploying After Changes

After making code changes, simply run the deploy script again:

```powershell
.\deploy.ps1
```

Your data in Azure Blob Storage carries over automatically since the Web App connects to the same storage account.

## Project Structure

```
job-tracker/
  index.html          # Frontend HTML
  styles.css          # Styling and status badge colours
  app.js              # Frontend logic and API calls
  server.py           # Flask backend with Azure Blob Storage
  startup.sh          # Gunicorn startup command for Azure
  requirements.txt    # Python dependencies
  deploy.ps1          # Deployment script (preserves App Settings)
  .env                # Local environment variables (not deployed)
  .env.example        # Template for .env
  .gitignore          # Excludes .env and caches from git
```
