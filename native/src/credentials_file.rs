use std::fs::{self, OpenOptions};
use std::io::{ErrorKind, Write};

use serde_json::{Map, Value};

const PRIVATE_FILE_MODE: u32 = 0o600;

pub fn tokens_in_file(path: &str) -> Result<Map<String, Value>, String> {
    match fs::read_to_string(path) {
        Ok(text) => {
            serde_json::from_str(&text).map_err(|error| format!("cannot read {}: {}", path, error))
        }
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(Map::new()),
        Err(error) => Err(error.to_string()),
    }
}

pub fn write_privately(path: &str, tokens: &Map<String, Value>) -> Result<(), String> {
    let temporary = format!("{}.tmp", path);
    let written = write_private_file(&temporary, &Value::Object(tokens.clone()).to_string())
        .and_then(|_| fs::rename(&temporary, path));
    if written.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    written.map_err(|error| error.to_string())
}

fn write_private_file(path: &str, text: &str) -> std::io::Result<()> {
    let mut options = OpenOptions::new();
    options.write(true).create(true).truncate(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(PRIVATE_FILE_MODE);
    }
    let mut file = options.open(path)?;
    file.write_all(text.as_bytes())?;
    file.sync_all()
}
