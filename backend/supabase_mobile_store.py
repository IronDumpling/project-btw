from datetime import datetime, timezone
from typing import Any

import httpx

from config import SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL


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


def _service_headers() -> dict[str, str]:
    _require_config()
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise SupabaseMobileError("Supabase service role key is not configured. Set SUPABASE_SERVICE_ROLE_KEY.")
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
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


async def export_user_data(token: str, auth_user: dict[str, Any]) -> dict[str, Any]:
    profile = await get_profile(token, auth_user)
    contacts = await list_contacts(token, auth_user["id"])
    memory_patches = await list_memory_patches(token, auth_user["id"])
    return {
        "profile": profile,
        "contacts": contacts,
        "memoryPatches": memory_patches,
        "savedReplies": [],
    }


async def delete_account(token: str, auth_user: dict[str, Any]) -> None:
    user_id = auth_user["id"]
    headers = _service_headers()
    async with httpx.AsyncClient(timeout=15) as client:
        for table in ("mobile_memory_patches", "mobile_contacts", "mobile_profiles"):
            response = await client.delete(
                f"{SUPABASE_URL}/rest/v1/{table}",
                params={"user_id": f"eq.{user_id}"},
                headers=headers,
            )
            _raise_for_table_error(response, f"delete {table}")
        response = await client.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=headers)
    if response.status_code >= 400:
        raise SupabaseMobileError(f"Supabase auth user delete failed: HTTP {response.status_code} {response.text}")


async def list_contacts(token: str, user_id: str) -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{SUPABASE_URL}/rest/v1/mobile_contacts",
            params={"user_id": f"eq.{user_id}", "select": "*", "order": "updated_at.desc"},
            headers=_auth_headers(token),
        )
    _raise_for_table_error(response, "list contacts")
    return [_contact_payload(row) for row in response.json()]


async def create_contact(
    token: str,
    auth_user: dict[str, Any],
    *,
    display_name: str,
    aliases: list[str] | None = None,
    relationship_type: str | None = None,
    notes: str | None = None,
    memory_summary: str | None = None,
) -> dict[str, Any]:
    headers = {**_auth_headers(token), "Prefer": "return=representation"}
    payload = {
        "user_id": auth_user["id"],
        "display_name": display_name.strip() or "Relationship",
        "aliases": aliases or [],
        "relationship_type": relationship_type or "",
        "notes": notes or "",
        "memory_summary": memory_summary or "",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/mobile_contacts",
            params={"select": "*"},
            headers=headers,
            json=payload,
        )
    _raise_for_table_error(response, "create contact")
    rows = response.json()
    return _contact_payload(rows[0] if rows else {})


async def update_contact(
    token: str,
    auth_user: dict[str, Any],
    contact_id: str,
    *,
    display_name: str | None = None,
    aliases: list[str] | None = None,
    relationship_type: str | None = None,
    notes: str | None = None,
    memory_summary: str | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    if display_name is not None:
        payload["display_name"] = display_name.strip() or "Relationship"
    if aliases is not None:
        payload["aliases"] = aliases
    if relationship_type is not None:
        payload["relationship_type"] = relationship_type
    if notes is not None:
        payload["notes"] = notes
    if memory_summary is not None:
        payload["memory_summary"] = memory_summary
    if not payload:
        existing = await get_contact(token, auth_user["id"], contact_id)
        if existing is None:
            raise SupabaseMobileError("Contact not found.")
        return existing
    headers = {**_auth_headers(token), "Prefer": "return=representation"}
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.patch(
            f"{SUPABASE_URL}/rest/v1/mobile_contacts",
            params={"id": f"eq.{contact_id}", "user_id": f"eq.{auth_user['id']}", "select": "*"},
            headers=headers,
            json=payload,
        )
    _raise_for_table_error(response, "update contact")
    rows = response.json()
    if not rows:
        raise SupabaseMobileError("Contact not found.")
    return _contact_payload(rows[0])


async def delete_contact(token: str, auth_user: dict[str, Any], contact_id: str) -> None:
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.delete(
            f"{SUPABASE_URL}/rest/v1/mobile_contacts",
            params={"id": f"eq.{contact_id}", "user_id": f"eq.{auth_user['id']}"},
            headers=_auth_headers(token),
        )
    _raise_for_table_error(response, "delete contact")


async def get_contact(token: str, user_id: str, contact_id: str) -> dict[str, Any] | None:
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{SUPABASE_URL}/rest/v1/mobile_contacts",
            params={"id": f"eq.{contact_id}", "user_id": f"eq.{user_id}", "select": "*", "limit": "1"},
            headers=_auth_headers(token),
        )
    _raise_for_table_error(response, "get contact")
    rows = response.json()
    return _contact_payload(rows[0]) if rows else None


async def find_or_create_contact(
    token: str,
    auth_user: dict[str, Any],
    *,
    contact_id: str | None = None,
    display_name: str | None = None,
) -> dict[str, Any]:
    if contact_id:
        contact = await get_contact(token, auth_user["id"], contact_id)
        if contact is not None:
            return contact
    name = (display_name or "Relationship").strip() or "Relationship"
    contacts = await list_contacts(token, auth_user["id"])
    for contact in contacts:
        if contact["displayName"].lower() == name.lower():
            return contact
    return await create_contact(token, auth_user, display_name=name)


async def list_memory_patches(token: str, user_id: str, *, status: str | None = None) -> list[dict[str, Any]]:
    params = {"user_id": f"eq.{user_id}", "select": "*", "order": "created_at.desc"}
    if status:
        params["status"] = f"eq.{status}"
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{SUPABASE_URL}/rest/v1/mobile_memory_patches",
            params=params,
            headers=_auth_headers(token),
        )
    _raise_for_table_error(response, "list memory patches")
    return [_memory_patch_payload(row) for row in response.json()]


async def create_memory_patch(
    token: str,
    auth_user: dict[str, Any],
    *,
    contact_id: str,
    proposed_additions: list[str],
    evidence: list[str],
) -> dict[str, Any]:
    headers = {**_auth_headers(token), "Prefer": "return=representation"}
    payload = {
        "user_id": auth_user["id"],
        "contact_id": contact_id,
        "proposed_additions": proposed_additions,
        "evidence": evidence,
        "status": "pending",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/mobile_memory_patches",
            params={"select": "*"},
            headers=headers,
            json=payload,
        )
    _raise_for_table_error(response, "create memory patch")
    rows = response.json()
    return _memory_patch_payload(rows[0] if rows else {})


async def update_memory_patch_status(
    token: str,
    auth_user: dict[str, Any],
    patch_id: str,
    *,
    status: str,
    proposed_additions: list[str] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"status": status}
    if proposed_additions is not None:
        payload["proposed_additions"] = proposed_additions
    if status == "approved":
        payload["approved_at"] = datetime.now(timezone.utc).isoformat()
    headers = {**_auth_headers(token), "Prefer": "return=representation"}
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.patch(
            f"{SUPABASE_URL}/rest/v1/mobile_memory_patches",
            params={"id": f"eq.{patch_id}", "user_id": f"eq.{auth_user['id']}", "select": "*"},
            headers=headers,
            json=payload,
        )
    _raise_for_table_error(response, "update memory patch")
    rows = response.json()
    if not rows:
        raise SupabaseMobileError("Memory patch not found.")
    return _memory_patch_payload(rows[0])


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


def _raise_for_table_error(response: httpx.Response, action: str) -> None:
    if response.status_code >= 400:
        raise SupabaseMobileError(f"Supabase {action} failed: HTTP {response.status_code} {response.text}")


def _contact_payload(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id", ""),
        "displayName": row.get("display_name") or "Relationship",
        "aliases": row.get("aliases") or [],
        "relationshipType": row.get("relationship_type") or "",
        "notes": row.get("notes") or "",
        "localMemorySummary": row.get("memory_summary") or "",
        "lastAnalysisAt": row.get("last_analysis_at") or "",
        "syncStatus": "synced",
        "createdAt": row.get("created_at") or "",
        "updatedAt": row.get("updated_at") or "",
    }


def _memory_patch_payload(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id", ""),
        "contactId": row.get("contact_id") or "default",
        "proposedAdditions": row.get("proposed_additions") or [],
        "evidence": row.get("evidence") or [],
        "status": row.get("status") or "pending",
        "createdAt": row.get("created_at") or "",
    }
