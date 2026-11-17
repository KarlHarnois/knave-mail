mod binary;
mod consent_browser;
mod fake_gmail;
mod http_request;
mod trickling_server;
mod truncating_gmail;

pub use binary::{run_binary, BinaryRun};
pub use consent_browser::answer_in_background;
pub use fake_gmail::{start_fake_gmail, FakeGmail};
pub use trickling_server::start_trickling_server;
pub use truncating_gmail::start_truncating_gmail;

use base64::Engine;

pub fn sent_mime(request: &str) -> String {
    let body = request.splitn(3, '\n').nth(2).unwrap_or("");
    let json: serde_json::Value = serde_json::from_str(body).unwrap_or_default();
    let raw = json["raw"].as_str().unwrap_or("");
    let decoded = base64::engine::general_purpose::URL_SAFE
        .decode(raw)
        .unwrap_or_default();
    String::from_utf8_lossy(&decoded).into_owned()
}

pub fn temporary_path(name: &str) -> String {
    static COUNTER: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
    let number = COUNTER.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    let unique = format!(
        "knave-mail-test-{}-{}-{:016x}-{}",
        std::process::id(),
        number,
        rand::random::<u64>(),
        name
    );
    std::env::temp_dir()
        .join(unique)
        .to_string_lossy()
        .into_owned()
}
