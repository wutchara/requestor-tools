import json
import os
from botbuilder.core import (
    BotFrameworkAdapter,
    BotFrameworkAdapterSettings,
    TurnContext,
    CardFactory,
)
from botbuilder.schema import (
    Activity,
    ActivityTypes,
    ConversationAccount,
    ConversationReference,
)


def _get_conversation_reference(
    chat_id: str, is_group: bool, chat_name: str = None
) -> ConversationReference:
    """
    Creates a conversation reference for a given Teams chat ID.
    """
    activity = Activity(
        channel_id="msteams",
        service_url="https://smba.trafficmanager.net/teams/",
        conversation=ConversationAccount(
            id=chat_id,
            is_group=is_group,
            conversation_type="groupChat",
            name=chat_name,
        ),
    )
    return TurnContext.get_conversation_reference(activity)


async def send_adaptive_card_by_bot(
    app_id: str, app_password: str, chat_id: str, card_payload: dict
):
    """
    Proactively sends an Adaptive Card to a Teams chat using Bot Framework.
    """
    if not all([app_id, app_password, chat_id, card_payload]):
        print("Error: Missing parameters for sending adaptive card by bot.")
        return

    adapter_settings = BotFrameworkAdapterSettings(
        app_id=app_id, app_password=app_password)
    adapter = BotFrameworkAdapter(adapter_settings)
    conversation_ref = _get_conversation_reference(chat_id, is_group=False)
    card_attachment = CardFactory.adaptive_card(card_payload)

    async def send_message_callback(turn_context: TurnContext):
        await turn_context.send_activity(Activity(type=ActivityTypes.message, attachments=[card_attachment]))

    try:
        print(
            f"\n--- Attempting to send Adaptive Card to chat {chat_id} using bot {app_id} ---")
        await adapter.continue_conversation(conversation_ref, send_message_callback, app_id)
        print("--- Successfully sent Adaptive Card ---")
    except Exception as e:
        print(
            f"--- FAILED to send Adaptive Card to {chat_id} using bot {app_id}: {e} ---")


async def send_adaptive_cards_from_config(adaptive_card_template_path=None):
    """
    Reads bot configurations from the environment, loads an adaptive card,
    and sends it to all configured chats.
    By default, it looks for 'adaptive_card_template.json' in the same directory as this script.
    """
    if adaptive_card_template_path is None:
        # Get the absolute path to the directory containing this script.
        base_dir = os.path.dirname(os.path.abspath(__file__))
        adaptive_card_template_path = os.path.join(
            base_dir, "adaptive_card_template.json")

    BOT_CONFIGURATIONS_JSON = os.environ.get("BOT_CONFIGURATIONS")

    print("\n\n" + "=" * 10 + " [Demo] Sending Adaptive Cards " + "=" * 10)
    print(f"BOT_CONFIGURATIONS: {BOT_CONFIGURATIONS_JSON}")

    if not BOT_CONFIGURATIONS_JSON or BOT_CONFIGURATIONS_JSON == '[]':
        print("\nSkipping Adaptive Card demo.")
        print("Please set BOT_CONFIGURATIONS in your .env file to run this.")
        return

    try:
        bot_configs = json.loads(BOT_CONFIGURATIONS_JSON)
        if not isinstance(bot_configs, list):
            raise TypeError(
                "BOT_CONFIGURATIONS should be a list of objects.")

        # Load adaptive card from file
        with open(adaptive_card_template_path, "r") as f:
            adaptive_card_payload = json.load(f)

        for config in bot_configs:
            app_id = config.get("app_id")
            app_password = config.get("app_password")
            chat_id = config.get("chat_id")

            if all([app_id, app_password, chat_id]):
                await send_adaptive_card_by_bot(
                    app_id=app_id,
                    app_password=app_password,
                    chat_id=chat_id,
                    card_payload=adaptive_card_payload,
                )
            else:
                print(
                    f"\nSkipping a bot configuration due to missing 'app_id', 'app_password', or 'chat_id'.")

    except json.JSONDecodeError:
        print("\nError: Could not parse BOT_CONFIGURATIONS. Please ensure it's valid JSON.")
    except FileNotFoundError:
        print(f"\nError: '{adaptive_card_template_path}' not found.")
        print("Please ensure 'adaptive_card_template.json' exists in the 'src/bot_messaging' directory.")
    except Exception as e:
        print(
            f"\nAn unexpected error occurred while processing bot configurations: {e}")
