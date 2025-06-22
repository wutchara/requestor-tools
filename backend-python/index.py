import asyncio
import os
from dotenv import load_dotenv

from src.bot_messaging.bot_sender import send_adaptive_cards_from_config
from src.health_check.health_checker import (
    get_microsoft_access_token, load_health_endpoints, test_backend_health
)

# Load environment variables from .env file at the very start of the script
load_dotenv()

# --- Configuration from your Azure AD App Registration ---
TENANT_ID = os.environ.get("AZURE_TENANT_ID")  # Loaded from .env
CLIENT_ID = os.environ.get("AZURE_CLIENT_ID")
CLIENT_SECRET = os.environ.get("AZURE_CLIENT_SECRET")
SERVICE_APP_ID = os.environ.get('SERVICE_APP_ID')

# The scope for your backend service.
# This is typically 'api://<Your_Service_App_ID>/.default'
# where <Your_Service_App_ID> is the Client ID of your *backend service's* Azure AD registration.
# If your backend validates against general Azure AD roles/groups, you might use different scopes.
# Consult your backend service's authentication configuration.
SCOPE = [f"api://{SERVICE_APP_ID}/.default"] if SERVICE_APP_ID else ["Not Set"]
# If your BE service accepts a token for Microsoft Graph, the scope would be:
# SCOPE = ["https://graph.microsoft.com/.default"]


async def main():
    """Main execution function."""
    print("--- Configuration Loaded ---")
    print(f"TENANT_ID: {'*' * 8 if TENANT_ID else 'Not Set'}")
    print(f"CLIENT_ID: {CLIENT_ID or 'Not Set'}")
    print(f"CLIENT_SECRET: {'*' * 8 if CLIENT_SECRET else 'Not Set'}")
    print(f"SCOPE: {SCOPE}")
    print("-" * 28)

    endpoints = load_health_endpoints()
    if not endpoints:
        print("\nNo endpoints to check. Exiting.")
        return

    # Determine if we need to acquire a token at all
    auth_required = any(ep.get("requires_auth", False) for ep in endpoints)
    token = None

    if auth_required:
        try:
            # Step 1: Get the Microsoft Token if any endpoint needs it
            print("\n--- Attempting to Acquire Access Token ---")
            token = get_microsoft_access_token()
        except Exception as e:
            print(f"\nAn error occurred during token acquisition: {e}")
            print("Will proceed with unauthenticated checks only.")

    # Step 2: Iterate through endpoints and run health checks
    for endpoint in endpoints:
        name = endpoint.get("name", "Unnamed Endpoint")
        url = endpoint.get("url")
        requires_auth = endpoint.get("requires_auth", False)

        if not url:
            print(f"\nSkipping '{name}' due to missing URL.")
            continue

        print(f"\n\n{'=' * 10} [{name}] Testing Endpoint: {url} {'=' * 10}")

        # Always run unauthenticated check
        test_backend_health(url)

        # Run authenticated check if required and token is available
        if requires_auth:
            if token:
                test_backend_health(url, token)
            else:
                print(
                    f"\n--- SKIPPING Authenticated Health Check for {name} (token not available) ---")

    # --- Step 3: (Demo) Send an Adaptive Card to configured Teams Chats ---
    await send_adaptive_cards_from_config()


if __name__ == "__main__":
    asyncio.run(main())
