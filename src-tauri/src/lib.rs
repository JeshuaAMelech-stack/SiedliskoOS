mod capture;

use capture::parser::parse_listing;
use capture::portal::Portal;
use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

#[derive(Serialize)]
struct CaptureResult {
    source_url: String,
    final_url: String,
    portal: String,
    parser: String,
    source_title: String,
    title: String,
    description: String,
    location: String,
    price: f64,
    area_ha: f64,
    confidence: u8,
    missing_fields: Vec<String>,
    captured_at: String,
    html_path: String,
    metadata_path: String,
    content_length: usize,
    listing_id: String,
}

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

#[tauri::command]
async fn capture_listing(app: tauri::AppHandle, url: String) -> Result<CaptureResult, String> {
    let parsed_url = reqwest::Url::parse(url.trim())
        .map_err(|_| "Nieprawidłowy adres URL.".to_string())?;

    match parsed_url.scheme() {
        "http" | "https" => {}
        _ => return Err("Obsługiwane są tylko adresy http i https.".to_string()),
    }

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36 SiedliskoOS/0.4")
        .redirect(reqwest::redirect::Policy::limited(10))
        .timeout(std::time::Duration::from_secs(25))
        .build()
        .map_err(|error| format!("Nie można uruchomić pobierania: {error}"))?;

    let response = client
        .get(parsed_url.clone())
        .header("Accept-Language", "pl-PL,pl;q=0.9,en;q=0.8")
        .send()
        .await
        .map_err(|error| format!("Nie udało się pobrać strony: {error}"))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("Strona zwróciła błąd HTTP {status}."));
    }

    let final_url = response.url().to_string();
    let final_parsed = response.url().clone();
    let html = response
        .text()
        .await
        .map_err(|error| format!("Nie udało się odczytać treści strony: {error}"))?;

    if html.trim().is_empty() {
        return Err("Pobrana strona jest pusta.".to_string());
    }

    let portal_kind = Portal::detect(&final_parsed);
    let parsed = parse_listing(portal_kind, &html);

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("Nie można ustalić czasu: {error}"))?
        .as_secs();
    let captured_at = timestamp.to_string();

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Nie można ustalić katalogu danych: {error}"))?;
    let capture_dir = app_data_dir.join("Captures").join(timestamp.to_string());
    std::fs::create_dir_all(&capture_dir)
        .map_err(|error| format!("Nie można utworzyć katalogu przechwycenia: {error}"))?;

    let html_path = capture_dir.join("page.html");
    let metadata_path = capture_dir.join("metadata.json");

    std::fs::write(&html_path, html.as_bytes())
        .map_err(|error| format!("Nie można zapisać strony: {error}"))?;

    let content_length = html.len();
    let listing_id = final_parsed
        .path_segments()
        .and_then(|segments| segments.filter(|segment| !segment.is_empty()).last())
        .unwrap_or_default()
        .to_string();

    let result = CaptureResult {
        source_url: parsed_url.to_string(),
        final_url,
        portal: portal_kind.display_name(&final_parsed),
        parser: portal_kind.parser_name(parsed.used_json_ld),
        source_title: parsed.source_title,
        title: parsed.title,
        description: parsed.description,
        location: parsed.location,
        price: parsed.price,
        area_ha: parsed.area_ha,
        confidence: parsed.confidence,
        missing_fields: parsed.missing_fields,
        captured_at,
        html_path: html_path.to_string_lossy().to_string(),
        metadata_path: metadata_path.to_string_lossy().to_string(),
        content_length,
        listing_id,
    };

    let metadata = serde_json::to_string_pretty(&result)
        .map_err(|error| format!("Nie można przygotować metadanych: {error}"))?;
    std::fs::write(&metadata_path, metadata)
        .map_err(|error| format!("Nie można zapisać metadanych: {error}"))?;

    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![create_backup, capture_listing])
        .run(tauri::generate_context!())
        .expect("error while running SiedliskoOS");
}
