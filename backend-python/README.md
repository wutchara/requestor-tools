# Backend Health Checker

This Python script checks the health of one or more backend service endpoints. It supports both unauthenticated and authenticated health checks using Microsoft Entra ID (Azure AD) for token acquisition.

## Features

- Checks multiple endpoints defined in a JSON configuration file.
- Supports both unauthenticated and authenticated (Bearer token) requests.
- Acquires access tokens from Microsoft Entra ID using the client credentials flow.
- Modular design with separated logic for health checking and orchestration.
- Configuration driven by `.env` for credentials and `health_endpoints.json` for target services.

## How to Run

### 1. Prerequisites

- Python 3.8+
- An Azure AD App Registration for this client application.
- An Azure AD App Registration for the backend service you want to test (if it requires authentication).

### 2. Setup

**a. Clone the repository (if you haven't already):**

```bash
git clone <your-repo-url>
cd backend-python
```

**b. Create and Activate a Virtual Environment:**

This isolates the project's dependencies from your system's Python installation.

- **On macOS/Linux:**
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```
- **On Windows:**
  ```bash
  python -m venv .venv
  .\.venv\Scripts\activate
  ```

**c. Install Dependencies:**

Install the required Python packages from `requirements.txt`.

```bash
pip install -r requirements.txt
```

### 3. Configuration

**a. Set up Environment Variables:**

Copy the sample environment file and fill in your Azure AD details.

```bash
cp .env.sample .env
```

Now, open the `.env` file and update the following values:

- `AZURE_TENANT_ID`: Your Azure tenant ID.
- `AZURE_CLIENT_ID`: The Application (client) ID of _this_ health checker application's registration in Azure.
- `AZURE_CLIENT_SECRET`: The client secret you generated for _this_ health checker application.
- `SERVICE_APP_ID`: The Application (client) ID of the _backend service_ you are trying to call. The script uses this to request a token with the correct audience.

**Optional Bot Configuration (for proactive messages):**

- `BOT_CONFIGURATIONS`: A JSON string representing a list of bot configurations to send messages to. Each object in the list requires `app_id`, `app_password`, and `chat_id`. See `.env.sample` for the exact format.

**b. Configure Endpoints:**

Open `health_endpoints.json`. This file contains a list of services to check. You can add, remove, or modify entries for each service you want to monitor.

**c. (Optional) Customize the Adaptive Card:**

Modify `adaptive_card_template.json` to change the content of the message sent by the bot(s).

### 4. Execute the Health Checker

With the virtual environment activated and configuration complete, run the script:

```bash
python index.py
```

The script will output the results of the health checks for each configured endpoint.

### Project Structure

The core logic for health checking and bot messaging has been moved into the `src/` directory to improve modularity and adhere to standard Python project layouts.

- Health check logic: `src/health_check/health_checker.py`
- Bot messaging logic: `src/bot_messaging/bot_sender.py`

### 5. Deactivate the Virtual Environment

When you are finished, you can deactivate the virtual environment:

```bash
deactivate
```
