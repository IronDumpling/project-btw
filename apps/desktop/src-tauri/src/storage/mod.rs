use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

fn app_data_dir(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap_or_else(|_| {
        dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join(".project-btw")
    })
}

#[tauri::command]
pub async fn get_data_dir(app: AppHandle) -> Result<String, String> {
    let dir = app_data_dir(&app);
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn read_file(app: AppHandle, relative_path: String) -> Result<String, String> {
    let path = app_data_dir(&app).join(&relative_path);
    if !path.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_file(
    app: AppHandle,
    relative_path: String,
    content: String,
) -> Result<(), String> {
    let path = app_data_dir(&app).join(&relative_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn append_to_file(
    app: AppHandle,
    relative_path: String,
    content: String,
) -> Result<(), String> {
    let path = app_data_dir(&app).join(&relative_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    use std::io::Write;
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    file.write_all(content.as_bytes()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn ensure_dir(app: AppHandle, relative_path: String) -> Result<(), String> {
    let path = app_data_dir(&app).join(&relative_path);
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

/// Atomically rename `from_path` to `to_path` within the app data directory.
/// Used for the persona patch flow: write to .tmp, then rename to official path.
/// On failure the original file is unaffected.
#[tauri::command]
pub async fn rename_file(
    app: AppHandle,
    from_path: String,
    to_path: String,
) -> Result<(), String> {
    let base = app_data_dir(&app);
    let from = base.join(&from_path);
    let to = base.join(&to_path);

    if !from.exists() {
        return Err(format!("rename_file: source not found: {}", from_path));
    }
    if let Some(parent) = to.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(&from, &to).map_err(|e| e.to_string())
}

/// Copy a file within the app data directory. Used for persona version backups.
#[tauri::command]
pub async fn copy_file(
    app: AppHandle,
    from_path: String,
    to_path: String,
) -> Result<(), String> {
    let base = app_data_dir(&app);
    let from = base.join(&from_path);
    let to = base.join(&to_path);

    if !from.exists() {
        return Err(format!("copy_file: source not found: {}", from_path));
    }
    if let Some(parent) = to.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::copy(&from, &to).map(|_| ()).map_err(|e| e.to_string())
}

// ── Contact meta.json ────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct ContactMeta {
    pub id: String,
    pub display_name: String,
    pub aliases: Vec<String>,
    pub platform: String,
    pub created_at: String,
    pub capture_count: u32,
    pub last_seen: String,
    pub persona_version: u32,
}

/// Read `contacts/{contact_id}/meta.json`. Returns empty string if not found.
#[tauri::command]
pub async fn read_meta(app: AppHandle, contact_id: String) -> Result<String, String> {
    let path = app_data_dir(&app)
        .join("contacts")
        .join(&contact_id)
        .join("meta.json");
    if !path.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Atomically write `contacts/{contact_id}/meta.json`.
#[tauri::command]
pub async fn write_meta(
    app: AppHandle,
    contact_id: String,
    content: String,
) -> Result<(), String> {
    let base = app_data_dir(&app).join("contacts").join(&contact_id);
    fs::create_dir_all(&base).map_err(|e| e.to_string())?;

    let tmp = base.join("meta.tmp.json");
    let dst = base.join("meta.json");
    fs::write(&tmp, &content).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &dst).map_err(|e| e.to_string())
}

#[derive(Serialize)]
pub struct AliasEntry {
    pub alias: String,
    pub contact_id: String,
}

/// Scan all `contacts/*/meta.json` and return a flat list of (alias, contact_id) pairs.
/// Used by the frontend alias cache to resolve OCR names to stable contact IDs.
#[tauri::command]
pub async fn list_all_aliases(app: AppHandle) -> Result<Vec<AliasEntry>, String> {
    let contacts_dir = app_data_dir(&app).join("contacts");
    if !contacts_dir.exists() {
        return Ok(vec![]);
    }

    let mut entries: Vec<AliasEntry> = Vec::new();
    let dirs = fs::read_dir(&contacts_dir).map_err(|e| e.to_string())?;

    for entry in dirs.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let meta_path = path.join("meta.json");
        if !meta_path.exists() {
            continue;
        }
        let raw = match fs::read_to_string(&meta_path) {
            Ok(s) => s,
            Err(_) => continue,
        };
        let meta: ContactMeta = match serde_json::from_str(&raw) {
            Ok(m) => m,
            Err(_) => continue,
        };
        for alias in &meta.aliases {
            entries.push(AliasEntry {
                alias: alias.clone(),
                contact_id: meta.id.clone(),
            });
        }
    }

    Ok(entries)
}

// ── Contact list ─────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize)]
pub struct ContactEntry {
    pub id: String,
    pub name: String,
    pub platform: String,
}

#[tauri::command]
pub async fn list_contacts(app: AppHandle) -> Result<Vec<ContactEntry>, String> {
    let contacts_dir = app_data_dir(&app).join("contacts");
    if !contacts_dir.exists() {
        return Ok(vec![]);
    }

    let mut contacts = Vec::new();
    let entries = fs::read_dir(&contacts_dir).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let id = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        // Prefer meta.json for display name + platform.
        let meta_path = path.join("meta.json");
        let (name, platform) = if meta_path.exists() {
            let raw = fs::read_to_string(&meta_path).unwrap_or_default();
            let meta: Result<ContactMeta, _> = serde_json::from_str(&raw);
            match meta {
                Ok(m) => (m.display_name, m.platform),
                Err(_) => (id.clone(), String::from("unknown")),
            }
        } else {
            let persona_path = path.join("persona.md");
            if persona_path.exists() {
                parse_contact_header(&persona_path)
            } else {
                (id.clone(), String::from("unknown"))
            }
        };

        contacts.push(ContactEntry { id, name, platform });
    }

    contacts.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(contacts)
}

#[tauri::command]
pub async fn delete_contact(app: AppHandle, contact_id: String) -> Result<(), String> {
    let path = app_data_dir(&app).join("contacts").join(&contact_id);
    if path.exists() {
        fs::remove_dir_all(&path).map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}

fn parse_contact_header(path: &PathBuf) -> (String, String) {
    let content = fs::read_to_string(path).unwrap_or_default();
    let name = content
        .lines()
        .find(|l| l.starts_with("name:"))
        .and_then(|l| l.split_once(':'))
        .map(|(_, v)| v.trim().to_string())
        .unwrap_or_else(|| {
            path.parent()
                .and_then(|p| p.file_name())
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default()
        });
    let platform = content
        .lines()
        .find(|l| l.starts_with("platform:"))
        .and_then(|l| l.split_once(':'))
        .map(|(_, v)| v.trim().to_string())
        .unwrap_or_else(|| String::from("unknown"));
    (name, platform)
}
