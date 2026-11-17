use std::io::{BufRead, BufReader, Read};
use std::net::TcpStream;

pub struct HttpRequest {
    pub line: String,
    pub authorization: String,
    pub body: Vec<u8>,
}

impl HttpRequest {
    pub fn read_from(stream: &TcpStream) -> Option<HttpRequest> {
        let mut reader = BufReader::new(stream.try_clone().ok()?);
        let mut line = String::new();
        reader.read_line(&mut line).ok()?;
        let mut length = 0usize;
        let mut authorization = String::new();
        loop {
            let mut header = String::new();
            if reader.read_line(&mut header).unwrap_or(0) == 0 || header.trim().is_empty() {
                break;
            }
            let lower = header.to_ascii_lowercase();
            if let Some(value) = lower.strip_prefix("content-length:") {
                length = value.trim().parse().unwrap_or(0);
            }
            if lower.starts_with("authorization:") {
                authorization = header.trim().to_string();
            }
        }
        let mut body = vec![0u8; length];
        let _ = reader.read_exact(&mut body);
        Some(HttpRequest {
            line,
            authorization,
            body,
        })
    }

    pub fn method_and_path(&self) -> String {
        self.line
            .split_whitespace()
            .take(2)
            .collect::<Vec<_>>()
            .join(" ")
    }
}
