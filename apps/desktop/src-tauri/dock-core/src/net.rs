//! URL policy for the only network feature (opt-in calendar/weather widgets).

/// HTTPS only, and never loopback, link-local or private-range hosts, so a compromised
/// webview cannot use the fetch command to probe the local network.
pub fn is_public_https_url(url: &str) -> bool {
    let Some(rest) = url.strip_prefix("https://") else { return false };
    if url.chars().any(|c| c.is_control() || c == ' ') {
        return false;
    }
    let authority = rest.split(['/', '?', '#']).next().unwrap_or("");
    if authority.contains('@') {
        return false; // user:pass@host tricks
    }
    let host = if let Some(stripped) = authority.strip_prefix('[') {
        stripped.split(']').next().unwrap_or("")
    } else {
        authority.split(':').next().unwrap_or("")
    }
    .to_ascii_lowercase();
    if host.is_empty() || host == "localhost" || host.ends_with(".localhost") || host.ends_with(".local") {
        return false;
    }
    if host.contains(':') {
        // IPv6 literal: refuse all of them, they are not needed for calendar/weather hosts.
        return false;
    }
    if let Some(octets) = parse_ipv4(&host) {
        let [a, b, ..] = octets;
        let private = a == 10
            || a == 127
            || a == 0
            || (a == 169 && b == 254)
            || (a == 172 && (16..=31).contains(&b))
            || (a == 192 && b == 168)
            || (a == 100 && (64..=127).contains(&b));
        return !private;
    }
    host.contains('.')
}

fn parse_ipv4(host: &str) -> Option<[u8; 4]> {
    let mut out = [0u8; 4];
    let mut it = host.split('.');
    for slot in &mut out {
        *slot = it.next()?.parse().ok()?;
    }
    it.next().is_none().then_some(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_public_https() {
        assert!(is_public_https_url("https://calendar.google.com/calendar/ical/x/basic.ics"));
        assert!(is_public_https_url("https://api.openweathermap.org/data/2.5/weather?q=Prague&appid=k"));
    }

    #[test]
    fn rejects_other_schemes_and_credentials() {
        assert!(!is_public_https_url("http://example.com/a.ics"));
        assert!(!is_public_https_url("file:///C:/x"));
        assert!(!is_public_https_url("https://user:pw@example.com/"));
        assert!(!is_public_https_url("https://exa mple.com/"));
    }

    #[test]
    fn rejects_local_and_private_hosts() {
        for u in [
            "https://localhost/",
            "https://printer.local/",
            "https://127.0.0.1/",
            "https://10.1.2.3/x",
            "https://192.168.0.5:8443/",
            "https://172.20.0.1/",
            "https://169.254.169.254/latest/meta-data",
            "https://[::1]/",
            "https://intranet/",
        ] {
            assert!(!is_public_https_url(u), "{u}");
        }
        assert!(is_public_https_url("https://172.32.0.1/"));
        assert!(is_public_https_url("https://8.8.8.8/"));
    }
}
