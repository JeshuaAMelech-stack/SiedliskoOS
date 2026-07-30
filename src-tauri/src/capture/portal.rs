use reqwest::Url;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Portal {
    Otodom,
    Olx,
    NieruchomosciOnline,
    Morizon,
    Gratka,
    Generic,
}

impl Portal {
    pub fn detect(url: &Url) -> Self {
        let host = url.host_str().unwrap_or_default().to_lowercase();
        if host.contains("otodom") {
            Self::Otodom
        } else if host.contains("olx") {
            Self::Olx
        } else if host.contains("nieruchomosci-online") {
            Self::NieruchomosciOnline
        } else if host.contains("morizon") {
            Self::Morizon
        } else if host.contains("gratka") {
            Self::Gratka
        } else {
            Self::Generic
        }
    }

    pub fn display_name(self, url: &Url) -> String {
        match self {
            Self::Otodom => "Otodom".to_string(),
            Self::Olx => "OLX".to_string(),
            Self::NieruchomosciOnline => "Nieruchomosci-online".to_string(),
            Self::Morizon => "Morizon".to_string(),
            Self::Gratka => "Gratka".to_string(),
            Self::Generic => url
                .host_str()
                .unwrap_or("Internet")
                .trim_start_matches("www.")
                .to_string(),
        }
    }

    pub fn parser_name(self, used_json_ld: bool) -> String {
        let source = if used_json_ld { "JSON-LD + meta" } else { "meta + tekst" };
        match self {
            Self::Otodom => format!("Otodom Parser v1 · {source}"),
            Self::Olx => format!("OLX Parser v1 · {source}"),
            Self::NieruchomosciOnline => format!("Nieruchomosci-online Parser v1 · {source}"),
            Self::Morizon => format!("Morizon Parser v1 · {source}"),
            Self::Gratka => format!("Gratka Parser v1 · {source}"),
            Self::Generic => format!("Universal Parser v1 · {source}"),
        }
    }
}
