use serde::Serialize;
use serde_json::Value;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

#[derive(Serialize)]
struct CaptureResult {
    source_url: String,
    final_url: String,
    portal: String,
    parser: String,
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

fn decode_html(value: &str) -> String {
    value
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
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

    decode_html(&html[content_start..content_start + close_offset])
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
                    return decode_html(&tag[value_start..value_start + value_end]);
                }
            }
        }
    }

    String::new()
}

fn portal_name(url: &reqwest::Url) -> String {
    let host = url.host_str().unwrap_or_default().to_lowercase();
    if host.contains("otodom") {
        "Otodom".to_string()
    } else if host.contains("olx") {
        "OLX".to_string()
    } else if host.contains("nieruchomosci-online") {
        "Nieruchomosci-online".to_string()
    } else if host.contains("morizon") {
        "Morizon".to_string()
    } else if host.contains("gratka") {
        "Gratka".to_string()
    } else {
        host.trim_start_matches("www.").to_string()
    }
}

fn extract_json_ld_blocks(html: &str) -> Vec<Value> {
    let lower = html.to_lowercase();
    let mut values = Vec::new();
    let mut cursor = 0;

    while let Some(script_offset) = lower[cursor..].find("<script") {
        let script_start = cursor + script_offset;
        let Some(open_end_offset) = lower[script_start..].find('>') else {
            break;
        };
        let open_end = script_start + open_end_offset;
        let opening_tag = &lower[script_start..=open_end];
        cursor = open_end + 1;

        if !opening_tag.contains("ld+json") {
            continue;
        }

        let Some(close_offset) = lower[cursor..].find("</script>") else {
            break;
        };
        let close_start = cursor + close_offset;
        let raw = html[cursor..close_start].trim();
        cursor = close_start + "</script>".len();

        if let Ok(value) = serde_json::from_str::<Value>(raw) {
            values.push(value);
        }
    }

    values
}

fn find_key<'a>(value: &'a Value, keys: &[&str]) -> Option<&'a Value> {
    match value {
        Value::Object(map) => {
            for key in keys {
                if let Some(found) = map.get(*key) {
                    return Some(found);
                }
            }
            for child in map.values() {
                if let Some(found) = find_key(child, keys) {
                    return Some(found);
                }
            }
            None
        }
        Value::Array(items) => items.iter().find_map(|item| find_key(item, keys)),
        _ => None,
    }
}

fn value_as_string(value: &Value) -> Option<String> {
    match value {
        Value::String(text) => Some(decode_html(text)),
        Value::Number(number) => Some(number.to_string()),
        _ => None,
    }
}

fn value_as_number(value: &Value) -> Option<f64> {
    match value {
        Value::Number(number) => number.as_f64(),
        Value::String(text) => parse_number(text),
        Value::Object(map) => map
            .get("value")
            .and_then(value_as_number)
            .or_else(|| map.get("price").and_then(value_as_number)),
        _ => None,
    }
}

fn parse_number(text: &str) -> Option<f64> {
    let cleaned: String = text
        .chars()
        .filter(|character| character.is_ascii_digit() || *character == ',' || *character == '.')
        .collect();

    if cleaned.is_empty() {
        return None;
    }

    let normalised = if cleaned.contains(',') && cleaned.contains('.') {
        cleaned.replace('.', "").replace(',', ".")
    } else {
        cleaned.replace(',', ".")
    };

    normalised.parse::<f64>().ok()
}

fn extract_location(value: &Value) -> Option<String> {
    if let Some(address) = find_key(value, &["address"]) {
        if let Value::Object(map) = address {
            for key in ["addressLocality", "addressRegion", "streetAddress"] {
                if let Some(text) = map.get(key).and_then(value_as_string) {
                    if !text.is_empty() {
                        return Some(text);
                    }
                }
            }
        }
    }

    find_key(value, &["addressLocality", "location", "city"])
        .and_then(value_as_string)
}

fn extract_area_ha(value: &Value) -> Option<f64> {
    let raw = find_key(
        value,
        &["floorSize", "area", "landArea", "surface", "usableArea"],
    )?;
    let amount = value_as_number(raw)?;

    let unit = match raw {
        Value::Object(map) => map
            .get("unitText")
            .and_then(value_as_string)
            .unwrap_or_default()
            .to_lowercase(),
        _ => String::new(),
    };

    if unit.contains("ha") {
        Some(amount)
    } else if amount > 100.0 {
        Some(amount / 10_000.0)
    } else {
        Some(amount)
    }
}

fn generic_area_from_text(text: &str) -> Option<f64> {
    let normalised = text
        .replace("m²", " m2 ")
        .replace("mkw", " m2 ")
        .replace("hektarów", " ha ")
        .replace("hektara", " ha ")
        .replace("hektary", " ha ");
    let words: Vec<&str> = normalised.split_whitespace().collect();

    for index in 1..words.len() {
        let unit = words[index].to_lowercase();
        if unit == "ha" || unit == "m2" {
            if let Some(number) = parse_number(words[index - 1]) {
                return Some(if unit == "m2" { number / 10_000.0 } else { number });
            }
        }
    }

    None
}

fn generic_price_from_text(text: &str) -> Option<f64> {
    let normalised = text.replace("zł", " PLN ").replace("PLN", " PLN ");
    let words: Vec<&str> = normalised.split_whitespace().collect();

    for index in 1..words.len() {
        if words[index].eq_ignore_ascii_case("PLN") {
            let mut number = String::new();
            let start = index.saturating_sub(3);
            for word in &words[start..index] {
                for character in word.chars() {
                    if character.is_ascii_digit() || character == ',' || character == '.' {
                        number.push(character);
                    }
                }
            }
            if let Some(price) = parse_number(&number) {
                if price >= 1_000.0 {
                    return Some(price);
                }
            }
        }
    }

    None
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

    let json_ld = extract_json_ld_blocks(&html);
    let title = json_ld
        .iter()
        .find_map(|value| find_key(value, &["name", "headline"]).and_then(value_as_string))
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| {
            let og_title = extract_meta_content(&html, "og:title");
            if og_title.is_empty() { extract_title(&html) } else { og_title }
        });

    let description = json_ld
        .iter()
        .find_map(|value| find_key(value, &["description"]).and_then(value_as_string))
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| {
            let og_description = extract_meta_content(&html, "og:description");
            if og_description.is_empty() {
                extract_meta_content(&html, "description")
            } else {
                og_description
            }
        });

    let location = json_ld
        .iter()
        .find_map(extract_location)
        .unwrap_or_default();

    let price = json_ld
        .iter()
        .find_map(|value| find_key(value, &["price", "lowPrice"]).and_then(value_as_number))
        .or_else(|| generic_price_from_text(&format!("{title} {description}")))
        .unwrap_or(0.0);

    let area_ha = json_ld
        .iter()
        .find_map(extract_area_ha)
        .or_else(|| generic_area_from_text(&format!("{title} {description}")))
        .unwrap_or(0.0);

    let mut found = 0u8;
    if !title.is_empty() { found += 1; }
    if !description.is_empty() { found += 1; }
    if !location.is_empty() { found += 1; }
    if price > 0.0 { found += 1; }
    if area_ha > 0.0 { found += 1; }
    let confidence = found * 20;

    let mut missing_fields = Vec::new();
    if title.is_empty() { missing_fields.push("tytuł".to_string()); }
    if location.is_empty() { missing_fields.push("miejscowość".to_string()); }
    if price <= 0.0 { missing_fields.push("cena".to_string()); }
    if area_ha <= 0.0 { missing_fields.push("powierzchnia".to_string()); }
    if description.is_empty() { missing_fields.push("opis".to_string()); }

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
    let portal = portal_name(&final_parsed);
    let parser = if json_ld.is_empty() {
        "Meta/tekst"
    } else {
        "JSON-LD + meta"
    }
    .to_string();

    let result = CaptureResult {
        source_url: parsed_url.to_string(),
        final_url,
        portal,
        parser,
        title,
        description,
        location,
        price,
        area_ha,
        confidence,
        missing_fields,
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
