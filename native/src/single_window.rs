use std::io::Read;
use std::os::unix::net::UnixListener;
use std::path::PathBuf;
use std::thread;

use sha2::{Digest, Sha256};
use tao::event_loop::EventLoopProxy;

const NAME_BYTES: usize = 8;
const FOCUS_REQUEST: &str = "focus";
const FOCUS_COMMAND: &str = "\u{1}focus";

pub fn socket_path_for(cache_path: &str) -> String {
    let folder = std::env::var_os("XDG_RUNTIME_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir);
    let digest = Sha256::digest(cache_path.as_bytes());
    let short: String = digest
        .iter()
        .take(NAME_BYTES)
        .map(|byte| format!("{:02x}", byte))
        .collect();
    folder
        .join(format!("knave-mail-{}.sock", short))
        .to_string_lossy()
        .into_owned()
}

pub fn forward_launches(socket: UnixListener, outbox: &EventLoopProxy<String>) {
    let outbox = outbox.clone();
    thread::spawn(move || {
        for stream in socket.incoming() {
            let Ok(mut stream) = stream else { continue };
            let mut asked = String::new();
            let _ = stream.read_to_string(&mut asked);
            if asked.trim() == FOCUS_REQUEST {
                drop(outbox.send_event(String::from(FOCUS_COMMAND)));
            }
        }
    });
}
