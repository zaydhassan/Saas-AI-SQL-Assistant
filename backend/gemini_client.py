import os
import json
import logging
from dotenv import load_dotenv
from google import genai
from typing import Any, AsyncGenerator, Optional

load_dotenv()

logger = logging.getLogger("gemini_client")

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("GEMINI_API_KEY is not set")

client = genai.Client(api_key=API_KEY)

# Legacy SQL-generation model. Originally "gemini-pro", which has since been
# deprecated by Google and now 404s on v1beta generateContent — so /ask was
# broken. Default switched to a validated-working model; override via env if a
# different model is preferred. The generate_text() contract is unchanged.
MODEL_NAME = os.getenv("GEMINI_TEXT_MODEL", "gemini-2.5-flash")

# Models used for structured (JSON) output and streaming in the BI Copilot
# features. Configurable via env so they can be swapped without code changes.
JSON_MODEL_NAME = os.getenv("GEMINI_JSON_MODEL", "gemini-2.5-flash")
STREAM_MODEL_NAME = os.getenv("GEMINI_STREAM_MODEL", "gemini-2.5-flash")


def generate_text(prompt: str) -> str:
    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt
    )
    return response.text


def generate_json(prompt: str, schema: Optional[dict] = None, model: Optional[str] = None) -> dict:
    """
    Generate a structured JSON response from Gemini.

    Primary path: request JSON output via response_mime_type="application/json"
    and (optionally) a response_schema. Fallback path: if the SDK/model rejects
    structured mode, request plain text constrained to JSON and parse it.

    Always returns a Python dict. Raises ValueError if no valid JSON can be
    produced.
    """
    model_name = model or JSON_MODEL_NAME
    cfg = {"response_mime_type": "application/json"}
    if schema:
        cfg["response_schema"] = schema

    # Try structured output first.
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=cfg,
        )
        text = getattr(response, "text", None) or ""
        return _coerce_json(text)
    except Exception as exc:
        logger.warning("generate_json structured mode failed (%s); falling back to text.", exc)

    # Fallback: ask for raw JSON text and parse.
    fb_prompt = (
        prompt
        + "\n\nRespond with ONLY valid minified JSON. No markdown, no code fences, no commentary."
    )
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=fb_prompt,
        )
        text = getattr(response, "text", None) or ""
        return _coerce_json(text)
    except Exception as exc:
        raise ValueError(f"generate_json: Gemini call failed: {exc}")


async def generate_text_stream(prompt: str, model: Optional[str] = None) -> AsyncGenerator[str, None]:
    """
    Async generator yielding text chunks from Gemini for streaming UIs
    (Root Cause investigation timeline, briefing typewriter, etc.).
    """
    model_name = model or STREAM_MODEL_NAME
    stream = await client.aio.models.generate_content_stream(
        model=model_name,
        contents=prompt,
    )
    async for chunk in stream:
        text = getattr(chunk, "text", None)
        if text:
            yield text


def _coerce_json(text: str) -> dict:
    """Parse Gemini JSON output, tolerating stray markdown fences."""
    if not text:
        raise ValueError("generate_json: empty response")
    cleaned = text.strip()
    # Strip ```json ... ``` fences if present.
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        # remove a leading language tag like 'json'
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(f"generate_json: invalid JSON: {exc}\nraw={text!r}")
    if isinstance(parsed, list):
        # Some schemas are array-typed; wrap so callers always get a dict.
        return {"items": parsed}
    if not isinstance(parsed, dict):
        return {"value": parsed}
    return parsed