use base64::{engine::general_purpose, Engine as _};
use std::io::Cursor;
use xcap::Monitor;

#[tauri::command]
pub async fn take_screenshot() -> Result<String, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    let primary = monitors.into_iter().next().ok_or("No monitor found")?;

    let image = primary.capture_image().map_err(|e| e.to_string())?;

    let mut buf = Vec::new();
    image
        .write_to(&mut Cursor::new(&mut buf), image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    let b64 = general_purpose::STANDARD.encode(&buf);
    Ok(format!("data:image/png;base64,{}", b64))
}

#[tauri::command]
pub async fn get_active_window_title() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let output = Command::new("powershell")
            .args([
                "-Command",
                "(Get-Process | Where-Object {$_.MainWindowHandle -ne 0} | Sort-Object CPU -Descending | Select-Object -First 1).MainWindowTitle"
            ])
            .output()
            .map_err(|e| e.to_string())?;
        let title = String::from_utf8_lossy(&output.stdout).trim().to_string();
        return Ok(title);
    }

    #[cfg(not(target_os = "windows"))]
    Ok(String::from("Unknown Window"))
}
