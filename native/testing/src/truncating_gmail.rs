use std::io::Write;
use std::net::{Shutdown, TcpListener, TcpStream};
use std::sync::{Arc, Mutex};
use std::thread;

use super::fake_gmail::FakeGmail;
use super::http_request::HttpRequest;

const TOKEN_ANSWER: &str = "{\"access_token\":\"fake-access\"}";
const CUT_SHORT_ANSWER: &[u8] =
    b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 5000\r\nConnection: close\r\n\r\n{\"labels\":[{\"id\":\"INB";

pub fn start_truncating_gmail() -> FakeGmail {
    let listener = TcpListener::bind("127.0.0.1:0").expect("the truncating server binds");
    let port = listener.local_addr().expect("a local address").port();
    thread::spawn(move || {
        for stream in listener.incoming() {
            let Ok(stream) = stream else { continue };
            thread::spawn(move || answer_cut_short(stream));
        }
    });
    (port, Arc::new(Mutex::new(Vec::new())))
}

fn answer_cut_short(mut stream: TcpStream) {
    let line = HttpRequest::read_from(&stream)
        .map(|request| request.line)
        .unwrap_or_default();
    if line.starts_with("POST /token") {
        let _ = write!(
            stream,
            "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            TOKEN_ANSWER.len(),
            TOKEN_ANSWER
        );
    } else {
        let _ = stream.write_all(CUT_SHORT_ANSWER);
        let _ = stream.flush();
    }
    let _ = stream.shutdown(Shutdown::Both);
}
