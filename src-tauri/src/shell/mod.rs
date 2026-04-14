use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

fn get_or_create_overlay(app: &AppHandle) -> tauri::Result<tauri::WebviewWindow> {
    if let Some(overlay) = app.get_webview_window("overlay") {
        return Ok(overlay);
    }
    WebviewWindowBuilder::new(app, "overlay", WebviewUrl::App("overlay".into()))
        .title("project-btw overlay")
        .inner_size(280.0, 76.0)
        .position(20.0, 100.0)
        .resizable(true)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .build()
}

/// Always show overlay (creates it if missing). Used by the capture flow.
pub fn show_overlay_impl(app: AppHandle) -> tauri::Result<()> {
    let overlay = get_or_create_overlay(&app)?;
    overlay.show()?;
    overlay.set_focus()?;
    Ok(())
}

/// Toggle overlay visibility. Used by tray menu.
pub fn toggle_overlay_impl(app: AppHandle) -> tauri::Result<()> {
    let overlay = get_or_create_overlay(&app)?;
    if overlay.is_visible()? {
        overlay.hide()?;
    } else {
        overlay.show()?;
        overlay.set_focus()?;
    }
    Ok(())
}

#[tauri::command]
pub async fn toggle_overlay(app: AppHandle) -> Result<(), String> {
    toggle_overlay_impl(app).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn show_overlay(app: AppHandle) -> Result<(), String> {
    show_overlay_impl(app).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn hide_overlay(app: AppHandle) -> Result<(), String> {
    if let Some(overlay) = app.get_webview_window("overlay") {
        overlay.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Resize the overlay window. Called by frontend when expanding/collapsing the bubble.
/// Collapsed: 280×76, Expanded: 420×520
#[tauri::command]
pub async fn resize_overlay(app: AppHandle, width: u32, height: u32) -> Result<(), String> {
    if let Some(overlay) = app.get_webview_window("overlay") {
        overlay
            .set_size(tauri::Size::Physical(tauri::PhysicalSize {
                width,
                height,
            }))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
