// Prevents an extra console window on Windows in release, like the Tauri template.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    cs2_config_manager_lib::run()
}
