use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

pub fn toggle_overlay_impl(app: AppHandle) -> tauri::Result<()> {
    if let Some(overlay) = app.get_webview_window("overlay") {
        if overlay.is_visible()? {
            overlay.hide()?;
        } else {
            overlay.show()?;
            overlay.set_focus()?;
        }
    } else {
        WebviewWindowBuilder::new(&app, "overlay", WebviewUrl::App("overlay".into()))
            .title("project-btw overlay")
            .inner_size(420.0, 600.0)
            .position(20.0, 100.0)
            .resizable(true)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .build()?;
    }
    Ok(())
}

#[tauri::command]
pub async fn toggle_overlay(app: AppHandle) -> Result<(), String> {
    toggle_overlay_impl(app).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn show_overlay(app: AppHandle) -> Result<(), String> {
    if let Some(overlay) = app.get_webview_window("overlay") {
        overlay.show().map_err(|e| e.to_string())?;
        overlay.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn hide_overlay(app: AppHandle) -> Result<(), String> {
    if let Some(overlay) = app.get_webview_window("overlay") {
        overlay.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}
