from typing import Any

import httpx

from config import SUPABASE_ANON_KEY, SUPABASE_URL


class SupabaseMobileError(RuntimeError):
    pass


def _require_config() -> None:
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise SupabaseMobileError("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.")


def _auth_headers(token: str) -> dict[str, str]:
    _require_config()
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


async def get_auth_user(token: str) -> dict[str, Any] | None:
    _require_config()
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(f"{SUPABASE_URL}/auth/v1/user", headers=_auth_headers(token))
    if response.status_code in {401, 403}:
        return None
    if response.status_code >= 400:
        raise SupabaseMobileError(f"Supabase auth lookup failed: HTTP {response.status_code}")
    return response.json()


def is_email_verified(auth_user: dict[str, Any]) -> bool:
    return bool(auth_user.get("email_confirmed_at") or auth_user.get("confirmed_at"))


def _display_name_from_auth(auth_user: dict[str, Any]) -> str:
    metadata = auth_user.get("user_metadata") or {}
    value = metadata.get("display_name") or metadata.get("name") or ""
    return str(value).strip()


def _profile_payload(profile: dict[str, Any] | None, auth_user: dict[str, Any]) -> dict[str, Any]:
    profile = profile or {}
    return {
        "id": auth_user["id"],
        "email": auth_user.get("email") or "",
        "display_name": profile.get("display_name") or "",
        "onboarding": profile.get("onboarding_json") or {},
        "persona_summary": profile.get("persona_summary") or "",
        "persona_markdown": profile.get("persona_markdown") or "",
        "memory_markdown": profile.get("memory_markdown") or "",
        "created_at": profile.get("created_at") or auth_user.get("created_at") or "",
        "updated_at": profile.get("updated_at") or profile.get("created_at") or auth_user.get("updated_at") or "",
        "email_verified": is_email_verified(auth_user),
    }


async def get_profile(token: str, auth_user: dict[str, Any], *, create_if_missing: bool = True) -> dict[str, Any]:
    profile = await _fetch_profile(token, auth_user["id"])
    if profile is None and create_if_missing:
        profile = await _insert_profile(token, auth_user)
    return _profile_payload(profile, auth_user)


async def update_profile(
    token: str,
    auth_user: dict[str, Any],
    *,
    display_name: str | None = None,
    onboarding: dict[str, Any] | None = None,
    persona_summary: str | None = None,
    persona_markdown: str | None = None,
    memory_markdown: str | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    if display_name is not None:
        payload["display_name"] = display_name.strip()
    if onboarding is not None:
        payload["onboarding_json"] = onboarding
    if persona_summary is not None:
        payload["persona_summary"] = persona_summary
    if persona_markdown is not None:
        payload["persona_markdown"] = persona_markdown
    if memory_markdown is not None:
        payload["memory_markdown"] = memory_markdown

    if not payload:
        return await get_profile(token, auth_user)

    await get_profile(token, auth_user, create_if_missing=True)
    headers = {**_auth_headers(token), "Prefer": "return=representation"}
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.patch(
            f"{SUPABASE_URL}/rest/v1/mobile_profiles",
            params={"user_id": f"eq.{auth_user['id']}", "select": "*"},
            headers=headers,
            json=payload,
        )
    _raise_for_profile_error(response, "update")
    rows = response.json()
    profile = rows[0] if rows else await _fetch_profile(token, auth_user["id"])
    return _profile_payload(profile, auth_user)


async def _fetch_profile(token: str, user_id: str) -> dict[str, Any] | None:
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{SUPABASE_URL}/rest/v1/mobile_profiles",
            params={"user_id": f"eq.{user_id}", "select": "*", "limit": "1"},
            headers=_auth_headers(token),
        )
    _raise_for_profile_error(response, "fetch")
    rows = response.json()
    return rows[0] if rows else None


async def _insert_profile(token: str, auth_user: dict[str, Any]) -> dict[str, Any]:
    headers = {**_auth_headers(token), "Prefer": "return=representation"}
    payload = {"user_id": auth_user["id"], "display_name": _display_name_from_auth(auth_user)}
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/mobile_profiles",
            params={"select": "*"},
            headers=headers,
            json=payload,
        )
    if response.status_code == 409:
        profile = await _fetch_profile(token, auth_user["id"])
        if profile:
            return profile
    _raise_for_profile_error(response, "insert")
    rows = response.json()
    return rows[0] if rows else {}


def _raise_for_profile_error(response: httpx.Response, action: str) -> None:
    if response.status_code >= 400:
        raise SupabaseMobileError(f"Supabase profile {action} failed: HTTP {response.status_code} {response.text}")
