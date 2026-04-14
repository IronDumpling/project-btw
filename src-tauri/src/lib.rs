use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

mod capture;
mod shell;
mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            setup_tray(app)?;
            setup_global_shortcut(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            capture::take_screenshot,
            capture::get_active_window_title,
            storage::read_file,
            storage::write_file,
            storage::ensure_dir,
            storage::rename_file,
            storage::list_contacts,
            storage::get_data_dir,
            shell::toggle_overlay,
            shell::show_overlay,
            shell::hide_overlay,
            shell::resize_overlay,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_tray(app: &mut tauri::App) -> tauri::Result<()> {
    let quit = MenuItem::with_id(app, "quit", "Quit project-btw", true, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "Show App", true, None::<&str>)?;
    let toggle_overlay =
        MenuItem::with_id(app, "overlay", "Toggle Overlay (Ctrl+Shift+B)", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show, &toggle_overlay, &quit])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                app.exit(0);
            }
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "overlay" => {
                let _ = shell::toggle_overlay_impl(app.clone());
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

fn setup_global_shortcut(app: &mut tauri::App) -> tauri::Result<()> {
    use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

    let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyB);

    let app_handle = app.handle().clone();
    match app.global_shortcut().on_shortcut(shortcut, move |_, _, _| {
        let app = app_handle.clone();
        std::thread::spawn(move || {
            // Hide overlay if already visible so the chat window is fully exposed.
            if let Some(overlay) = app.get_webview_window("overlay") {
                if overlay.is_visible().unwrap_or(false) {
                    let _ = overlay.hide();
                    std::thread::sleep(std::time::Duration::from_millis(150));
                }
            }
            // Capture screen + active window title.
            let result = capture::capture_now();
            // Broadcast to all windows (overlay will receive it).
            let _ = app.emit("btw-capture", &result);
            // Show overlay.
            let _ = shell::show_overlay_impl(app);
        });
    }) {
        Ok(_) => {}
        Err(e) => {
            let err = e.to_string();
            if err.contains("already registered") || err.contains("HotKey already registered") {
                eprintln!(
                    "[project-btw] Ctrl+Shift+B already in use — app continues without hotkey."
                );
            } else {
                return Err(std::io::Error::other(format!("global shortcut: {e}")).into());
            }
        }
    }

    Ok(())
}
