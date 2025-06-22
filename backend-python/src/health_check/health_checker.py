import requests
import json
import os
from msal import ConfidentialClientApplication


def _print_failure_report(url, error_type, details, with_auth):
    """Helper function to print a standardized failure report."""
    auth_status_str = "(with Auth)" if with_auth else "(without Auth)"
    print(f"\n--- API Health Check FAILED for {url} {auth_status_str} ---")
    print(f"  {error_type}: {details}")
    print("--- Health check FAILED ---")


def test_backend_health(url, access_token=None):
    """
    Makes a request to a backend health endpoint, optionally with an auth token.

    Args:
        url (str): The URL of the health endpoint to test.
        access_token (str, optional): The Bearer token for authentication. Defaults to None.

    Returns:
        bool: True if the health check passes, False otherwise.
    """
    headers = {
        "Accept": "application/json"
    }
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    auth_status_str = "(with Auth)" if access_token else "(without Auth)"

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()  # Raises an HTTPError for bad responses (4xx or 5xx)

        print(f"\n--- API Health Check for {url} {auth_status_str} ---")
        print(f"  Status Code: {response.status_code}")

        # Validate JSON response if applicable
        if 'application/json' in response.headers.get('Content-Type', ''):
            data = response.json()
            print(f"  Response Body: {json.dumps(data, indent=2)}")
            # Add your specific validations here (e.g., for a 'status' field)
            if data.get("status") == "UP":
                print("  Service status: UP (as expected)")
            else:
                status = data.get("status", "Not Found")
                print(f"  Service status: {status} (unexpected)")
        else:
            # Print first 200 chars
            print(f"  Response Body: {response.text[:200]}...")

        print("--- Health check PASSED ---")
        return True
    except requests.exceptions.HTTPError as e:
        details = f"{e.response.status_code} {e.response.reason}\n  Response: {e.response.text}"
        _print_failure_report(url, "HTTP Error", details,
                              with_auth=bool(access_token))
        return False
    except requests.exceptions.RequestException as e:
        _print_failure_report(url, "Request Error", e,
                              with_auth=bool(access_token))
        return False
    except json.JSONDecodeError:
        _print_failure_report(
            url, "JSON Decode Error", "The response was not valid JSON.", with_auth=bool(access_token))
        return False
    except Exception as e:
        _print_failure_report(url, "Unexpected Error", e,
                              with_auth=bool(access_token))
        return False


def get_microsoft_access_token():
    """Acquires a Microsoft Entra ID access token using the Client Credential Flow."""
    TENANT_ID = os.environ.get("AZURE_TENANT_ID")
    CLIENT_ID = os.environ.get("AZURE_CLIENT_ID")
    CLIENT_SECRET = os.environ.get("AZURE_CLIENT_SECRET")
    SERVICE_APP_ID = os.environ.get('SERVICE_APP_ID')

    # Validate that all required configuration variables are present
    required_vars = {
        "Tenant ID": TENANT_ID,
        "Client ID": CLIENT_ID,
        "Client Secret": CLIENT_SECRET,
        "Backend Service App ID": SERVICE_APP_ID
    }
    missing_vars = [name for name, value in required_vars.items() if not value]
    if missing_vars:
        raise ValueError(
            f"Missing Azure AD configuration: {', '.join(missing_vars)}. Please check your .env file.")

    AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
    SCOPE = [f"api://{SERVICE_APP_ID}/.default"]

    app = ConfidentialClientApplication(
        client_id=CLIENT_ID,
        client_credential=CLIENT_SECRET,
        authority=AUTHORITY
    )

    # Acquire token by client credentials
    result = app.acquire_token_for_client(scopes=SCOPE)

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


def load_health_endpoints(file_path=None):
    """
    Loads health check endpoint configurations from a JSON file.
    By default, it looks for 'health_endpoints.json' in the same directory as this script.
    """
    if file_path is None:
        # Get the absolute path to the directory containing this script.
        base_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(base_dir, "health_endpoints.json")

    try:
        with open(file_path, 'r') as f:
            endpoints = json.load(f)
        if not isinstance(endpoints, list):
            raise ValueError(
                "JSON config should be a list of endpoint objects.")
        print(
            f"Loaded {len(endpoints)} health check endpoints from {file_path}.")
        return endpoints
    except FileNotFoundError:
        print(
            f"Error: Health check configuration file not found at '{file_path}'.")
        print("Please ensure 'health_endpoints.json' exists in the 'src/health_check' directory.")
        return []
    except json.JSONDecodeError:
        print(
            f"Error: Could not decode JSON from '{file_path}'. Please check its format.")
        return []
    except Exception as e:
        print(f"An unexpected error occurred while loading endpoints: {e}")
        return []
