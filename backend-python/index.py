import asyncio
import json
import os
from msal import ConfidentialClientApplication
from dotenv import load_dotenv

from health_checker import test_backend_health
from botbuilder.core import (
    BotFrameworkAdapter,
    BotFrameworkAdapterSettings,
    TurnContext,
    CardFactory,
)
from botbuilder.schema import (
    Activity,
    ActivityTypes,
    Attachment,
    ConversationAccount,
    ConversationReference,
)

# Load environment variables from .env file at the very start of the script
load_dotenv()

# --- Configuration from your Azure AD App Registration ---
TENANT_ID = os.environ.get("AZURE_TENANT_ID")  # Loaded from .env
CLIENT_ID = os.environ.get("AZURE_CLIENT_ID")
CLIENT_SECRET = os.environ.get("AZURE_CLIENT_SECRET")

# --- New Bot Configuration from .env ---
# The App ID of your Bot's registration in Azure
BOT_APP_ID = os.environ.get("BOT_APP_ID")
# The Client Secret/Password for your Bot
BOT_APP_PASSWORD = os.environ.get("BOT_APP_PASSWORD")
# A demo chat ID to send the card to. e.g., 19:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@thread.v2
DEMO_CHAT_ID = os.environ.get("DEMO_CHAT_ID")
# The scope for your backend service.
# This is typically 'api://<Your_Service_App_ID>/.default'
# where <Your_Service_App_ID> is the Client ID of your *backend service's* Azure AD registration.
# If your backend validates against general Azure AD roles/groups, you might use different scopes.
# Consult your backend service's authentication configuration.
SCOPE = [f"api://{os.environ.get('SERVICE_APP_ID')}/.default"]
# If your BE service accepts a token for Microsoft Graph, the scope would be:
# SCOPE = ["https://graph.microsoft.com/.default"]

AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"


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
        raise ValueError(
            f"Missing Azure AD configuration: {', '.join(missing_vars)}. Please check your .env file.")

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


def load_health_endpoints(file_path="health_endpoints.json"):
    """Loads health check endpoint configurations from a JSON file."""
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
        print("Please create 'health_endpoints.json' and add your endpoint configurations.")
        return []
    except json.JSONDecodeError:
        print(
            f"Error: Could not decode JSON from '{file_path}'. Please check its format.")
        return []
    except Exception as e:
        print(f"An unexpected error occurred while loading endpoints: {e}")
        return []


def _get_conversation_reference(
    chat_id: str, is_group: bool, chat_name: str = None
) -> ConversationReference:
    """
    Creates a conversation reference for a given Teams chat ID.
    This mimics the structure from the NodeJS example.
    """
    # In Teams, the conversationType can be 'groupChat', 'channel', or 'personal'.
    # The NodeJS example hardcoded 'groupChat'. We do the same for consistency.
    # The `is_group` flag is passed along as in the original code.
    activity = Activity(
        channel_id="msteams",
        # Common service URL for Teams
        service_url="https://smba.trafficmanager.net/teams/",
        conversation=ConversationAccount(
            id=chat_id,
            is_group=is_group,
            conversation_type="groupChat",
            name=chat_name,
        ),
    )
    return TurnContext.get_conversation_reference(activity)


async def _send_adaptive_card_by_bot(
    app_id: str, app_password: str, chat_id: str, content: str
):
    """
    Proactively sends an Adaptive Card to a Teams chat using Bot Framework.
    This is a Python port of the _sendAdaptiveCardByBot NodeJS function.
    """
    if not all([app_id, app_password, chat_id, content]):
        print("Error: Missing parameters for sending adaptive card by bot.")
        return

    adapter_settings = BotFrameworkAdapterSettings(
        app_id=app_id, app_password=app_password)
    adapter = BotFrameworkAdapter(adapter_settings)

    # The NodeJS example called _getConversationReference with isGroup=false.
    # We will do the same for a direct port of the logic.
    conversation_ref = _get_conversation_reference(chat_id, is_group=False)

    # The NodeJS code expects `content` to be a JSON string. We parse it here.
    try:
        card_payload = json.loads(content)
        card_attachment = CardFactory.adaptive_card(card_payload)
    except json.JSONDecodeError:
        print("Error: The provided card content is not valid JSON.")
        return

    async def send_message_callback(turn_context: TurnContext):
        """Callback to send the activity."""
        await turn_context.send_activity(
            Activity(type=ActivityTypes.message, attachments=[card_attachment])
        )

    try:
        print(f"\n--- Attempting to send Adaptive Card to chat {chat_id} ---")
        await adapter.continue_conversation(conversation_ref, send_message_callback, app_id)
        print("--- Successfully sent Adaptive Card ---")
    except Exception as e:
        print(f"--- FAILED to send Adaptive Card: {e} ---")


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

    # --- Step 3: (Demo) Send an Adaptive Card to a Teams Chat ---
    print("\n\n" + "=" * 10 + " [Demo] Sending Adaptive Card " + "=" * 10)

    # Example Adaptive Card JSON as a string, like in the NodeJS example
    adaptive_card_content_string = json.dumps({
        "type": "AdaptiveCard",
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "version": "1.5",
        "body": [
            {
                "type": "TextBlock",
                "text": "Hello from your Python Bot!",
                "wrap": True,
                "size": "Large",
            },
            {
                "type": "TextBlock",
                "text": "This card was sent proactively from a Python script.",
                "wrap": True,
            },
        ],
    })

    if BOT_APP_ID and BOT_APP_PASSWORD and DEMO_CHAT_ID:
        await _send_adaptive_card_by_bot(
            app_id=BOT_APP_ID,
            app_password=BOT_APP_PASSWORD,
            chat_id=DEMO_CHAT_ID,
            content=adaptive_card_content_string,
        )
    else:
        print("\nSkipping Adaptive Card demo.")
        print("Please set BOT_APP_ID, BOT_APP_PASSWORD, and DEMO_CHAT_ID in your .env file to run this.")


if __name__ == "__main__":
    asyncio.run(main())
