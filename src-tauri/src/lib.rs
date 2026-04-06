use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

mod commands;
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
            commands::capture::take_screenshot,
            commands::capture::get_active_window_title,
            commands::storage::read_file,
            commands::storage::write_file,
            commands::storage::ensure_dir,
            commands::storage::list_contacts,
            commands::storage::get_data_dir,
            commands::window::toggle_overlay,
            commands::window::show_overlay,
            commands::window::hide_overlay,
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
                let _ = commands::window::toggle_overlay_impl(app.clone());
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
    app.global_shortcut()
        .on_shortcut(shortcut, move |_, _, _| {
            let _ = commands::window::toggle_overlay_impl(app_handle.clone());
        })
        .map_err(|e| {
            std::io::Error::new(std::io::ErrorKind::Other, format!("global shortcut: {e}"))
        })?;

    Ok(())
}
