use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

#[tauri::command]
fn create_backup(app: tauri::AppHandle) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Nie można ustalić katalogu danych: {error}"))?;

    let database_path = app_data_dir.join("siedliskoos.db");
    if !database_path.exists() {
        return Err(format!(
            "Nie znaleziono bazy danych: {}",
            database_path.display()
        ));
    }

    let backups_dir = app_data_dir.join("Backups");
    std::fs::create_dir_all(&backups_dir)
        .map_err(|error| format!("Nie można utworzyć katalogu backupów: {error}"))?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("Nie można ustalić czasu: {error}"))?
        .as_secs();

    let backup_path = backups_dir.join(format!("siedliskoos_{timestamp}.db"));

    std::fs::copy(&database_path, &backup_path)
        .map_err(|error| format!("Nie można skopiować bazy danych: {error}"))?;

    Ok(backup_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![create_backup])
        .run(tauri::generate_context!())
        .expect("error while running SiedliskoOS");
}
