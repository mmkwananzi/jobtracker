"""
Job Application Tracker - Flask Backend with Azure Blob Storage
Stores all application data as a JSON file in Azure Blob Storage.
"""

import json
import logging
import os
import traceback
from datetime import datetime

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory

from azure.storage.blob import BlobServiceClient, ContentSettings

if os.path.exists(".env"):
    load_dotenv(override=True)

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO))

app = Flask(__name__, static_folder=".", static_url_path="")


@app.after_request
def set_csp_headers(response):
    """Set permissive CSP headers for local development."""
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "connect-src 'self';"
    )
    return response


# Azure config — using account name + key to avoid connection string parsing issues
ACCOUNT_NAME = os.getenv("AZURE_ACCOUNT_NAME", "")
ACCOUNT_KEY = os.getenv("AZURE_ACCOUNT_KEY", "")
CONTAINER_NAME = os.getenv("AZURE_CONTAINER_NAME", "job-tracker")
BLOB_NAME = os.getenv("AZURE_BLOB_NAME", "applications.json")

ACCOUNT_URL = f"https://{ACCOUNT_NAME}.blob.core.windows.net"


def get_blob_client():
    """Create and return a blob client for the applications JSON file."""
    blob_service = BlobServiceClient(
        account_url=ACCOUNT_URL,
        credential=ACCOUNT_KEY,
    )
    container_client = blob_service.get_container_client(CONTAINER_NAME)

    # Create container if it doesn't exist
    try:
        container_client.get_container_properties()
    except Exception:
        container_client.create_container()

    return container_client.get_blob_client(BLOB_NAME)


def read_applications():
    """Read all applications from Azure Blob Storage."""
    try:
        blob_client = get_blob_client()
        data = blob_client.download_blob().readall()
        return json.loads(data)
    except Exception as e:
        # If blob doesn't exist yet, return empty list
        if "BlobNotFound" in str(e) or "The specified blob does not exist" in str(e):
            return []
        raise


def write_applications(applications):
    """Write all applications to Azure Blob Storage."""
    blob_client = get_blob_client()
    data = json.dumps(applications, indent=2)
    blob_client.upload_blob(
        data,
        overwrite=True,
        content_settings=ContentSettings(content_type="application/json"),
    )


# ---------- API Routes ----------


@app.route("/")
def serve_index():
    return send_from_directory(".", "index.html")


@app.route("/api/applications", methods=["GET"])
def get_applications():
    """Get all applications."""
    try:
        apps = read_applications()
        return jsonify(apps)
    except Exception as e:
        logging.error("GET /api/applications failed:\n%s", traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications", methods=["POST"])
def create_application():
    """Create a new application."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Generate ID and timestamps
        data["id"] = datetime.now().strftime("%Y%m%d%H%M%S") + os.urandom(4).hex()
        data["createdAt"] = datetime.now().strftime("%Y-%m-%d")
        data["updatedAt"] = data["createdAt"]

        apps = read_applications()
        apps.append(data)
        write_applications(apps)

        return jsonify(data), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications/<app_id>", methods=["PUT"])
def update_application(app_id):
    """Update an existing application."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        apps = read_applications()
        idx = next((i for i, a in enumerate(apps) if a["id"] == app_id), None)

        if idx is None:
            return jsonify({"error": "Application not found"}), 404

        data["id"] = app_id
        data["createdAt"] = apps[idx].get("createdAt", "")
        data["updatedAt"] = datetime.now().strftime("%Y-%m-%d")

        apps[idx] = data
        write_applications(apps)

        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications/<app_id>", methods=["DELETE"])
def delete_application(app_id):
    """Delete an application."""
    try:
        apps = read_applications()
        original_len = len(apps)
        apps = [a for a in apps if a["id"] != app_id]

        if len(apps) == original_len:
            return jsonify({"error": "Application not found"}), 404

        write_applications(apps)
        return jsonify({"message": "Deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    if not ACCOUNT_NAME or not ACCOUNT_KEY:
        print("\n" + "=" * 60)
        print("  AZURE STORAGE NOT CONFIGURED")
        print("=" * 60)
        print("\n  Please edit the .env file with your Azure details:")
        print(f"  -> C:\\AI-Apps\\job-tracker\\.env\n")
        print("  You need:")
        print("  1. An Azure Storage Account")
        print("  2. A connection string from Azure Portal:")
        print("     Storage Account > Access Keys > Connection String")
        print("  3. Update AZURE_STORAGE_CONNECTION_STRING in .env")
        print("=" * 60 + "\n")
    else:
        print("\n  Job Tracker running at http://localhost:5000")
        print("  Press Ctrl+C to stop\n")
        app.run(host="127.0.0.1", port=5000, debug=True)
