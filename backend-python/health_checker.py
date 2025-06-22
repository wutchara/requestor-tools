import requests
import json


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
    # Catches ConnectionError, Timeout, etc.
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
