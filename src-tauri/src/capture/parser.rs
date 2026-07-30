use serde_json::Value;

use super::portal::Portal;

#[derive(Debug, Default)]
pub struct ParsedListing {
    pub source_title: String,
    pub title: String,
    pub description: String,
    pub location: String,
    pub price: f64,
    pub area_ha: f64,
    pub confidence: u8,
    pub missing_fields: Vec<String>,
    pub used_json_ld: bool,
}

pub fn parse_listing(portal: Portal, html: &str) -> ParsedListing {
    let json_ld = extract_json_ld_blocks(html);
    let source_title = json_ld
        .iter()
        .find_map(|value| find_key(value, &["name", "headline"]).and_then(value_as_string))
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| first_non_empty([
            extract_meta_content(html, "og:title"),
            extract_title(html),
        ]));

    let description = json_ld
        .iter()
        .find_map(|value| find_key(value, &["description"]).and_then(value_as_string))
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| first_non_empty([
            extract_meta_content(html, "og:description"),
            extract_meta_content(html, "description"),
        ]));

    let combined = format!("{source_title} {description}");

    let location = json_ld
        .iter()
        .find_map(extract_location)
        .or_else(|| portal_location_from_text(portal, &combined))
        .unwrap_or_default();

    let price = json_ld
        .iter()
        .find_map(|value| find_key(value, &["price", "lowPrice"]).and_then(value_as_number))
        .or_else(|| generic_price_from_text(&combined))
        .unwrap_or(0.0);

    let area_ha = generic_area_from_text(&combined)
        .or_else(|| json_ld.iter().find_map(extract_area_ha))
        .unwrap_or(0.0);

    let title = smart_title(&location, area_ha, &source_title);

    let mut found = 0u8;
    if !title.is_empty() { found += 1; }
    if !description.is_empty() { found += 1; }
    if !location.is_empty() { found += 1; }
    if price > 0.0 { found += 1; }
    if area_ha > 0.0 { found += 1; }

    let mut missing_fields = Vec::new();
    if location.is_empty() { missing_fields.push("miejscowość".to_string()); }
    if price <= 0.0 { missing_fields.push("cena".to_string()); }
    if area_ha <= 0.0 { missing_fields.push("powierzchnia".to_string()); }
    if description.is_empty() { missing_fields.push("opis".to_string()); }

    ParsedListing {
        source_title,
        title,
        description,
        location,
        price,
        area_ha,
        confidence: found * 20,
        missing_fields,
        used_json_ld: !json_ld.is_empty(),
    }
}

fn smart_title(location: &str, area_ha: f64, source_title: &str) -> String {
    let location = clean_location(location);
    let area = format_area(area_ha);

    match (!location.is_empty(), !area.is_empty()) {
        (true, true) => format!("{location} • {area}"),
        (true, false) => location,
        (false, true) => area,
        (false, false) => clean_source_title(source_title),
    }
}

fn format_area(area_ha: f64) -> String {
    if area_ha <= 0.0 {
        return String::new();
    }

    if area_ha >= 1.0 {
        let value = trim_number(area_ha, 2).replace('.', ",");
        format!("{value} ha")
    } else {
        let square_metres = area_ha * 10_000.0;
        format!("{} m²", trim_number(square_metres, 0))
    }
}

fn trim_number(value: f64, decimals: usize) -> String {
    let rendered = format!("{value:.decimals$}");
    rendered
        .trim_end_matches('0')
        .trim_end_matches('.')
        .to_string()
}

fn clean_location(value: &str) -> String {
    value
        .split(',')
        .next()
        .unwrap_or(value)
        .trim()
        .trim_matches(|character: char| matches!(character, '-' | '|' | '•'))
        .trim()
        .to_string()
}

fn clean_source_title(value: &str) -> String {
    let cleaned = value
        .split(" - ")
        .next()
        .unwrap_or(value)
        .split(" | ")
        .next()
        .unwrap_or(value)
        .trim();

    if cleaned.is_empty() || cleaned.eq_ignore_ascii_case("nieruchomość") {
        "Nowa nieruchomość".to_string()
    } else {
        cleaned.chars().take(90).collect()
    }
}

fn portal_location_from_text(_portal: Portal, text: &str) -> Option<String> {
    let lowercase = text.to_lowercase();
    for marker in ["w miejscowości ", "miejscowości ", " wsi "] {
        if let Some(offset) = lowercase.find(marker) {
            let tail = &text[offset + marker.len()..];
            let candidate = tail
                .split(['-', '|', '•', ',', '.', ':'])
                .next()
                .unwrap_or_default()
                .trim();
            if candidate.len() >= 2 && candidate.len() <= 50 {
                return Some(candidate.to_string());
            }
        }
    }

    for marker in [" w ", " koło ", " okolice "] {
        if let Some(offset) = text.to_lowercase().find(marker) {
            let tail = &text[offset + marker.len()..];
            let candidate = tail
                .split(['-', '|', '•', ',', '.'])
                .next()
                .unwrap_or_default()
                .trim();
            if candidate.len() >= 2 && candidate.len() <= 50 {
                return Some(candidate.to_string());
            }
        }
    }
    None
}

fn first_non_empty<const N: usize>(values: [String; N]) -> String {
    values.into_iter().find(|value| !value.trim().is_empty()).unwrap_or_default()
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
    let Some(start) = lowercase.find("<title") else { return String::new(); };
    let Some(open_end_offset) = lowercase[start..].find('>') else { return String::new(); };
    let content_start = start + open_end_offset + 1;
    let Some(close_offset) = lowercase[content_start..].find("</title>") else { return String::new(); };
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
        let Some(marker_start) = lowercase.find(&marker) else { continue; };
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

fn extract_json_ld_blocks(html: &str) -> Vec<Value> {
    let lower = html.to_lowercase();
    let mut values = Vec::new();
    let mut cursor = 0;

    while let Some(script_offset) = lower[cursor..].find("<script") {
        let script_start = cursor + script_offset;
        let Some(open_end_offset) = lower[script_start..].find('>') else { break; };
        let open_end = script_start + open_end_offset;
        let opening_tag = &lower[script_start..=open_end];
        cursor = open_end + 1;
        if !opening_tag.contains("ld+json") { continue; }
        let Some(close_offset) = lower[cursor..].find("</script>") else { break; };
        let close_start = cursor + close_offset;
        let raw = html[cursor..close_start].trim();
        cursor = close_start + "</script>".len();
        if let Ok(value) = serde_json::from_str::<Value>(raw) { values.push(value); }
    }
    values
}

fn find_key<'a>(value: &'a Value, keys: &[&str]) -> Option<&'a Value> {
    match value {
        Value::Object(map) => {
            for key in keys {
                if let Some(found) = map.get(*key) { return Some(found); }
            }
            map.values().find_map(|child| find_key(child, keys))
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
    if cleaned.is_empty() { return None; }
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
                    if !text.is_empty() { return Some(text); }
                }
            }
        }
    }
    find_key(value, &["addressLocality", "location", "city"]).and_then(value_as_string)
}

fn extract_area_ha(value: &Value) -> Option<f64> {
    let raw = find_key(value, &["floorSize", "area", "landArea", "surface", "usableArea"])?;
    let amount = value_as_number(raw)?;
    let unit = match raw {
        Value::Object(map) => map.get("unitText").and_then(value_as_string).unwrap_or_default().to_lowercase(),
        _ => String::new(),
    };
    if unit.contains("ha") { Some(amount) }
    else if unit.contains("m") || amount > 100.0 { Some(amount / 10_000.0) }
    else { Some(amount) }
}

fn generic_area_from_text(text: &str) -> Option<f64> {
    let normalised = text
        .replace("m²", " m2 ")
        .replace("mkw", " m2 ")
        .replace("hektarów", " ha ")
        .replace("hektara", " ha ")
        .replace("hektary", " ha ")
        .replace('(', " ")
        .replace(')', " ")
        .replace(':', " ")
        .replace(';', " ");

    let words: Vec<&str> = normalised.split_whitespace().collect();
    let mut hectare_candidates = Vec::new();
    let mut square_metre_candidates = Vec::new();

    for index in 1..words.len() {
        let unit = words[index]
            .trim_matches(|c: char| !c.is_alphanumeric())
            .to_lowercase();
        if unit != "ha" && unit != "m2" {
            continue;
        }

        let mut raw_number = words[index - 1]
            .trim_matches(|c: char| !(c.is_ascii_digit() || c == ',' || c == '.'))
            .to_string();

        // Polish listings often format thousands with spaces: "35 400 m2".
        if unit == "m2" && index >= 2 {
            let previous = words[index - 2]
                .trim_matches(|c: char| !c.is_ascii_digit());
            if previous.len() <= 3
                && !previous.is_empty()
                && raw_number.chars().all(|c| c.is_ascii_digit())
                && raw_number.len() == 3
            {
                raw_number = format!("{previous}{raw_number}");
            }
        }

        let Some(number) = parse_number(&raw_number) else { continue; };
        if number <= 0.0 {
            continue;
        }

        if unit == "ha" {
            // Ignore tiny hectare fragments such as soil-class breakdowns (0.23 ha).
            hectare_candidates.push(number);
        } else if number >= 100.0 {
            square_metre_candidates.push(number / 10_000.0);
        }
    }

    // Prefer a clearly stated total in hectares. In descriptions such as
    // "35 400 m2 (3,54 ha)" this returns 3.54, not a later soil-class fragment.
    if let Some(value) = hectare_candidates
        .iter()
        .copied()
        .filter(|value| *value >= 0.1)
        .max_by(|a, b| a.total_cmp(b))
    {
        return Some(value);
    }

    square_metre_candidates
        .into_iter()
        .max_by(|a, b| a.total_cmp(b))
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
                    if character.is_ascii_digit() || character == ',' || character == '.' { number.push(character); }
                }
            }
            if let Some(price) = parse_number(&number) {
                if price >= 1_000.0 { return Some(price); }
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_land_title_from_location_and_hectares() {
        assert_eq!(smart_title("Mierzyno", 11.5, "Nieruchomość"), "Mierzyno • 11,5 ha");
    }

    #[test]
    fn creates_square_metre_title_for_small_plot() {
        assert_eq!(smart_title("Robakowo", 0.125, "Działka"), "Robakowo • 1250 m²");
    }

    #[test]
    fn reads_total_area_before_soil_class_fragments() {
        let text = "Działka rolna o powierzchni 35 400 m2 (3,54 ha). grunty IIIb - 0,27 ha IVa - 1,86 ha";
        assert_eq!(generic_area_from_text(text), Some(3.54));
    }

    #[test]
    fn reads_spaced_square_metres() {
        assert_eq!(generic_area_from_text("powierzchnia 35 400 m2"), Some(3.54));
    }
}
