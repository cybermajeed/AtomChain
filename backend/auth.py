import os
import time
import secrets
import requests
from urllib.parse import urlencode
from dotenv import load_dotenv
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

router = APIRouter(prefix="/api/auth", tags=["auth"])

CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")
CALLBACK_URL = os.environ.get(
    "GITHUB_OAUTH_CALLBACK_URL",
    "http://127.0.0.1:8000/api/auth/github/callback",
)
OAUTH_SCOPE = os.environ.get("GITHUB_OAUTH_SCOPE", "repo")

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"

# In-memory OAuth state store { state: created_at }
_pending_states = {}
_STATE_TTL = 600  # 10 minutes


@router.get("/github/login")
async def github_login(request: Request):
    if not CLIENT_ID or not CLIENT_SECRET:
        body = (
            "<h2 style='font-family:sans-serif'>GitHub OAuth is not configured.</h2>"
            "<p style='font-family:sans-serif'>Set the following environment variables and restart the backend:</p>"
            "<pre style='font-family:monospace'>GITHUB_CLIENT_ID=...<br>GITHUB_CLIENT_SECRET=...</pre>"
        )
        return HTMLResponse(body, status_code=503)

    state = secrets.token_urlsafe(24)
    _pending_states[state] = time.time()

    if "GITHUB_OAUTH_CALLBACK_URL" in os.environ:
        callback = CALLBACK_URL
    else:
        callback = str(request.base_url).rstrip("/") + "/api/auth/github/callback"

    params = {
        "client_id": CLIENT_ID,
        "redirect_uri": callback,
        "scope": OAUTH_SCOPE,
        "state": state,
    }
    return RedirectResponse(f"{GITHUB_AUTHORIZE_URL}?{urlencode(params)}")


@router.get("/github/callback")
async def github_callback(request: Request):
    code = request.query_params.get("code")
    state = request.query_params.get("state")
    error = request.query_params.get("error")

    if error:
        return _popup_page("error", f"GitHub authorization failed: {error}")

    if not code or not state:
        return _popup_page("error", "Missing code or state in callback.")

    # Verify state
    created_at = _pending_states.pop(state, None)
    if created_at is None:
        return _popup_page("error", "Invalid or expired OAuth state. Please try again.")
    if time.time() - created_at > _STATE_TTL:
        return _popup_page("error", "OAuth state expired. Please try again.")

    callback = os.environ.get(
        "GITHUB_OAUTH_CALLBACK_URL",
        str(request.base_url).rstrip("/") + "/api/auth/github/callback",
    )

    # Exchange code for access token
    resp = requests.post(
        GITHUB_TOKEN_URL,
        headers={"Accept": "application/json"},
        data={
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "code": code,
            "redirect_uri": callback,
        },
        timeout=30,
    )

    try:
        token_json = resp.json()
    except ValueError:
        return _popup_page("error", "Invalid response from GitHub token endpoint.")

    if "access_token" not in token_json:
        msg = token_json.get("error_description") or token_json.get("error") or "Token exchange failed."
        return _popup_page("error", msg)

    return _popup_page("token", token_json["access_token"])


def _popup_page(result_type: str, value: str) -> HTMLResponse:
    """Returns an HTML page that hands control back to the opener window."""
    if result_type == "token":
        payload = f'{{ type: "oauth-token", token: "{value}" }}'
        message = "Authentication successful. You can close this window."
    else:
        payload = f'{{ type: "oauth-error", error: "{value}" }}'
        message = value

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>AtomChain - GitHub Auth</title></head>
<body style="font-family:sans-serif;background:#0b0e11;color:#eaecef;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
  <p style="max-width:420px;text-align:center">{message}</p>
  <script>
    (function() {{
      if (window.opener) {{
        window.opener.postMessage({payload}, "*");
        window.close();
      }} else {{
        document.body.innerHTML = "<p style='font-family:sans-serif;max-width:420px;text-align:center;color:#eaecef'>" + {payload}.message + "</p>";
      }}
    }})();
  </script>
</body>
</html>"""
    return HTMLResponse(html)