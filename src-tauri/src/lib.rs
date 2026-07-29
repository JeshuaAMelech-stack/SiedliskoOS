use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

#[derive(Serialize)]
struct CaptureResult {
    source_url: String,
    final_url: String,
    title: String,
    description: String,
    captured_at: String,
    html_path: String,
    metadata_path: String,
    content_length: usize,
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

fn extract_title(html: &str) -> String {
    let lowercase = html.to_lowercase();
    let Some(start) = lowercase.find("<title") else {
        return String::new();
    };
    let Some(open_end_offset) = lowercase[start..].find('>') else {
        return String::new();
    };
    let content_start = start + open_end_offset + 1;
    let Some(close_offset) = lowercase[content_start..].find("</title>") else {
        return String::new();
    };

    html[content_start..content_start + close_offset]
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn extract_meta_content(html: &str, key: &str) -> String {
    let lowercase = html.to_lowercase();
    for marker in [
        format!(r#"property="{}""#, key),
        format!(r#"property='{}'"#, key),
        format!(r#"name="{}""#, key),
        format!(r#"name='{}'"#, key),
    ] {
        let Some(marker_start) = lowercase.find(&marker) else {
            continue;
        };
        let tag_start = lowercase[..marker_start].rfind("<meta").unwrap_or(marker_start);
        let tag_end = lowercase[marker_start..]
            .find('>')
            .map(|offset| marker_start + offset)
            .unwrap_or(html.len());
        let tag = &html[tag_start..tag_end];
        let tag_lower = tag.to_lowercase();

        for quote in ['\"', '\''] {
            let content_marker = format!("content={quote}");
            if let Some(content_start) = tag_lower.find(&content_marker) {
                let value_start = content_start + content_marker.len();
                if let Some(value_end) = tag[value_start..].find(quote) {
                    return tag[value_start..value_start + value_end]
                        .replace("&amp;", "&")
                        .replace("&quot;", "\"")
                        .replace("&#39;", "'")
                        .split_whitespace()
                        .collect::<Vec<_>>()
                        .join(" ");
                }
            }
        }
    }

    String::new()
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
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) SiedliskoOS/0.3")
        .redirect(reqwest::redirect::Policy::limited(10))
        .timeout(std::time::Duration::from_secs(25))
        .build()
        .map_err(|error| format!("Nie można uruchomić pobierania: {error}"))?;

    let response = client
        .get(parsed_url.clone())
        .send()
        .await
        .map_err(|error| format!("Nie udało się pobrać strony: {error}"))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("Strona zwróciła błąd HTTP {status}."));
    }

    let final_url = response.url().to_string();
    let html = response
        .text()
        .await
        .map_err(|error| format!("Nie udało się odczytać treści strony: {error}"))?;

    if html.trim().is_empty() {
        return Err("Pobrana strona jest pusta.".to_string());
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("Nie można ustalić czasu: {error}"))?
        .as_secs();
    let captured_at = timestamp.to_string();
    let title = {
        let og_title = extract_meta_content(&html, "og:title");
        if og_title.is_empty() { extract_title(&html) } else { og_title }
    };
    let description = {
        let og_description = extract_meta_content(&html, "og:description");
        if og_description.is_empty() {
            extract_meta_content(&html, "description")
        } else {
            og_description
        }
    };

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
    let result = CaptureResult {
        source_url: parsed_url.to_string(),
        final_url,
        title,
        description,
        captured_at,
        html_path: html_path.to_string_lossy().to_string(),
        metadata_path: metadata_path.to_string_lossy().to_string(),
        content_length,
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
