use base64::{engine::general_purpose, Engine as _};
use image::ImageFormat;
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use std::time::{SystemTime, UNIX_EPOCH};
use xcap::Monitor;

/// Payload emitted as the `btw-capture` Tauri event.
#[derive(Serialize, Deserialize, Clone)]
pub struct CaptureResult {
    pub screenshot: String,   // "data:image/png;base64,..."
    pub window_title: String,
    pub timestamp: u64,       // Unix seconds
}

/// Blocking capture — called from the hotkey thread before the overlay appears.
pub fn capture_now() -> CaptureResult {
    let screenshot = take_screenshot_sync().unwrap_or_default();
    let window_title = get_window_title_sync().unwrap_or_default();
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    CaptureResult { screenshot, window_title, timestamp }
}

fn take_screenshot_sync() -> Result<String, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    let primary = monitors.into_iter().next().ok_or("No monitor found")?;
    let image = primary.capture_image().map_err(|e| e.to_string())?;
    let mut buf = Vec::new();
    image
        .write_to(&mut Cursor::new(&mut buf), ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    let b64 = general_purpose::STANDARD.encode(&buf);
    Ok(format!("data:image/png;base64,{}", b64))
}

fn get_window_title_sync() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "(Get-Process | Where-Object {$_.MainWindowHandle -ne 0} \
                 | Sort-Object CPU -Descending \
                 | Select-Object -First 1).MainWindowTitle",
            ])
            .output()
            .map_err(|e| e.to_string())?;
        return Ok(String::from_utf8_lossy(&output.stdout).trim().to_string());
    }
    #[cfg(not(target_os = "windows"))]
    Ok(String::new())
}

// ── Tauri commands (callable from frontend directly) ─────────────────────────

#[tauri::command]
pub async fn take_screenshot() -> Result<String, String> {
    take_screenshot_sync()
}

#[tauri::command]
pub async fn get_active_window_title() -> Result<String, String> {
    get_window_title_sync()
}
