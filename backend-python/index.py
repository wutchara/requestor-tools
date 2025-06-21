import requests
import json
import os
from msal import ConfidentialClientApplication
from dotenv import load_dotenv

# Load environment variables from .env file at the very start of the script
load_dotenv()

# --- Configuration from your Azure AD App Registration ---
TENANT_ID = os.environ.get("AZURE_TENANT_ID") # Loaded from .env
CLIENT_ID = os.environ.get("AZURE_CLIENT_ID")
CLIENT_SECRET = os.environ.get("AZURE_CLIENT_SECRET")
# The scope for your backend service. 
# This is typically 'api://<Your_Service_App_ID>/.default' 
# where <Your_Service_App_ID> is the Client ID of your *backend service's* Azure AD registration.
# If your backend validates against general Azure AD roles/groups, you might use different scopes.
# Consult your backend service's authentication configuration.
SCOPE = [f"api://{os.environ.get('SERVICE_APP_ID')}/.default"]
# If your BE service accepts a token for Microsoft Graph, the scope would be:
# SCOPE = ["https://graph.microsoft.com/.default"] 

AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"

# Your backend service healthcheck URL
SERVICE_HEALTH_URL = os.environ.get("SERVICE_HEALTH_URL", "http://your-backend-service.com/health")


def get_microsoft_access_token():
    """Acquires a Microsoft Entra ID access token using the Client Credential Flow."""
    
    # Validate that all required configuration variables are present
    required_vars = {
        "Tenant ID": TENANT_ID,
        "Client ID": CLIENT_ID,
        "Client Secret": CLIENT_SECRET,
        "Backend Service App ID": os.environ.get('SERVICE_APP_ID')
    }
    missing_vars = [name for name, value in required_vars.items() if not value]
    if missing_vars:
        raise ValueError(f"Missing Azure AD configuration: {', '.join(missing_vars)}. Please check your .env file.")

    app = ConfidentialClientApplication(
        client_id=CLIENT_ID,
        client_credential=CLIENT_SECRET,
        authority=AUTHORITY
    )

    # Acquire token by client credentials
    result = app.acquire_token_for_client(scopes=SCOPE)
    print(result)

    if "access_token" in result:
        print("Successfully acquired Microsoft Access Token.")
        return result["access_token"]
    else:
        # Handle errors
        print("Failed to acquire Microsoft Access Token:")
        print(result.get("error"))
        print(result.get("error_description"))
        print(result.get("correlation_id"))
        raise Exception("Could not acquire Microsoft Access Token.")

def _print_failure_report(url, error_type, details):
    """Helper function to print a standardized failure report."""
    print(f"\n--- API Health Check FAILED for {url} (with Auth) ---")
    print(f"  {error_type}: {details}")
    print("--- Health check FAILED ---")

def test_backend_health_with_auth(url, access_token):
    """Makes a request to the backend health endpoint with the acquired token."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status() # Raises an HTTPError for bad responses (4xx or 5xx)

        print(f"\n--- API Health Check for {url} (with Auth) ---")
        print(f"  Status Code: {response.status_code}")
        
        # Validate JSON response if applicable
        if 'application/json' in response.headers.get('Content-Type', ''):
            data = response.json()
            print(f"  Response Body: {json.dumps(data, indent=2)}")
            # Add your specific validations here (e.g., for 'status', 'database' fields)
            if data.get("status") == "UP":
                print("  Service status: UP (as expected)")
            else:
                print("  Service status: Not UP (unexpected)")
            
            # Example deep health check validation
            if "database" in data and data["database"] == "UP":
                print("  Database connection: UP (as expected)")
            else:
                print("  Database connection: Not UP (unexpected)")
        else:
            print(f"  Response Body: {response.text[:200]}...") # Print first 200 chars

        print("--- Health check PASSED ---")
        return True
    except requests.exceptions.HTTPError as e:
        details = f"{e.response.status_code} {e.response.reason}\n  Response: {e.response.text}"
        _print_failure_report(url, "HTTP Error", details)
        return False
    except requests.exceptions.RequestException as e: # Catches ConnectionError, Timeout, etc.
        _print_failure_report(url, "Request Error", e)
        return False
    except json.JSONDecodeError:
        _print_failure_report(url, "JSON Decode Error", "The response was not valid JSON.")
        return False
    except Exception as e:
        _print_failure_report(url, "Unexpected Error", e)
        return False

def main():
    """Main execution function."""
    # Optional: Add debug prints here if needed, now that .env is loaded
    print("--- Configuration Loaded ---")
    print(f"TENANT_ID: {'*' * 8 if TENANT_ID else 'Not Set'}")
    print(f"CLIENT_ID: {CLIENT_ID or 'Not Set'}")
    print(f"CLIENT_SECRET: {'*' * 8 if CLIENT_SECRET else 'Not Set'}")
    print(f"SCOPE: {SCOPE}")
    print(f"SERVICE_HEALTH_URL: {SERVICE_HEALTH_URL}")
    print("-" * 28)
    
    try:
        # Step 1: Get the Microsoft Token
        token = get_microsoft_access_token()
        print(f"Token: {token}" if token else "No token received.")
        
        # Step 2: Use the token to authenticate with your service
        if token:
            test_backend_health_with_auth(SERVICE_HEALTH_URL, token)
        else:
            print("No token received, skipping backend health check.")

    except Exception as e:
        print(f"An error occurred during the overall process: {e}")

if __name__ == "__main__":
    main()