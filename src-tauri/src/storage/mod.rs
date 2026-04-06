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
pub async fn ensure_dir(app: AppHandle, relative_path: String) -> Result<(), String> {
    let path = app_data_dir(&app).join(&relative_path);
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

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
        if path.is_dir() {
            let id = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            let persona_path = path.join("persona.md");
            let (name, platform) = if persona_path.exists() {
                parse_contact_header(&persona_path)
            } else {
                (id.clone(), String::from("unknown"))
            };

            contacts.push(ContactEntry { id, name, platform });
        }
    }

    contacts.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(contacts)
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
