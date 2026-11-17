use std::io::{Read, Write};
use std::net::TcpStream;
use std::thread::{self, JoinHandle};

const FORGED_STATE_ANSWER: &str = "wrong-state";

pub fn answer_in_background(url: &str, stray_path: &str, answer: &str) -> JoinHandle<String> {
    let (url, stray_path, answer) = (url.to_string(), stray_path.to_string(), answer.to_string());
    thread::spawn(move || answer_consent(&url, &stray_path, &answer))
}

fn answer_consent(url: &str, stray_path: &str, answer: &str) -> String {
    let redirect = query_field(url, "redirect_uri")
        .replace("%3A", ":")
        .replace("%2F", "/");
    if !stray_path.is_empty() {
        visit_stray_path(&redirect, stray_path);
    }
    let state = if answer.contains(FORGED_STATE_ANSWER) {
        String::from("forged")
    } else {
        query_field(url, "state")
    };
    let target = format!("{}/?{}&state={}", redirect, answer, state);
    ureq::get(&target)
        .call()
        .ok()
        .and_then(|mut response| response.body_mut().read_to_string().ok())
        .unwrap_or_default()
}

fn query_field(url: &str, name: &str) -> String {
    let query = url.split_once('?').map(|(_, query)| query).unwrap_or("");
    query
        .split('&')
        .filter_map(|pair| pair.split_once('='))
        .find(|(key, _)| *key == name)
        .map(|(_, value)| value.to_string())
        .unwrap_or_default()
}

fn visit_stray_path(redirect: &str, stray_path: &str) {
    if let Ok(mut stream) = TcpStream::connect(redirect.trim_start_matches("http://")) {
        let _ = write!(
            stream,
            "GET {} HTTP/1.1\r\nHost: localhost\r\n\r\n",
            stray_path
        );
        let mut ignored = String::new();
        let _ = stream.read_to_string(&mut ignored);
    }
}
