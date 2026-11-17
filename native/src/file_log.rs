use std::fs;
use std::path::Path;

pub fn rotate_when_large(path: &str, largest_bytes: u64, kept_files: u64) {
    let log = Path::new(path);
    ensure_folder(log);
    if fs::metadata(log)
        .map(|meta| meta.len() > largest_bytes)
        .unwrap_or(false)
    {
        for number in (1..kept_files).rev() {
            let _ = fs::rename(
                format!("{}.{}", path, number),
                format!("{}.{}", path, number + 1),
            );
        }
        let _ = fs::rename(path, format!("{}.1", path));
    }
}

fn ensure_folder(log: &Path) {
    if let Some(parent) = log.parent() {
        if fs::create_dir_all(parent).is_err() {
            eprintln!(
                "knave-mail: cannot create the log folder {}",
                parent.display()
            );
        }
    }
}
