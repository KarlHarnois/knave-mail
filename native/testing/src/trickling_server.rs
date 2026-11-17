use std::io::Write;
use std::net::{TcpListener, TcpStream};
use std::thread;
use std::time::Duration;

use super::http_request::HttpRequest;

pub fn start_trickling_server(pause_milliseconds: u64, body: &str) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").expect("the trickling server binds");
    let port = listener.local_addr().expect("a local address").port();
    let body = body.to_string();
    let pause = Duration::from_millis(pause_milliseconds);
    thread::spawn(move || {
        for stream in listener.incoming() {
            let Ok(stream) = stream else { continue };
            let body = body.clone();
            thread::spawn(move || trickle(stream, &body, pause));
        }
    });
    format!("http://127.0.0.1:{}", port)
}

fn trickle(mut stream: TcpStream, body: &str, pause: Duration) {
    let _ = HttpRequest::read_from(&stream);
    let _ = write!(
        stream,
        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    );
    for byte in body.bytes() {
        let _ = stream.flush();
        thread::sleep(pause);
        let _ = stream.write_all(&[byte]);
    }
}
