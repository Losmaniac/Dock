//! Virtual desktop registry blobs: `VirtualDesktopIDs` is a list of 16-byte GUIDs in desktop
//! order, `CurrentVirtualDesktop` is one GUID.

/// `(count, index of the current desktop if it can be found)`.
pub fn parse(ids: &[u8], current: &[u8]) -> (usize, Option<usize>) {
    let count = ids.len() / 16;
    let idx = if current.len() == 16 {
        ids.chunks_exact(16).position(|g| g == current)
    } else {
        None
    };
    (count, idx)
}

#[cfg(test)]
mod tests {
    use super::parse;

    #[test]
    fn finds_the_current_desktop() {
        let a = [1u8; 16];
        let b = [2u8; 16];
        let ids: Vec<u8> = a.iter().chain(b.iter()).copied().collect();
        assert_eq!(parse(&ids, &b), (2, Some(1)));
        assert_eq!(parse(&ids, &[9u8; 16]), (2, None));
        assert_eq!(parse(&[], &[]), (0, None));
        assert_eq!(parse(&ids, &[1u8; 3]), (2, None));
    }
}
