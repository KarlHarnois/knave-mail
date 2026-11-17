use std::fs;
use std::io::Write;
use std::net::{TcpListener, TcpStream};
use std::sync::{Arc, Mutex};
use std::thread;

use super::http_request::HttpRequest;

pub type FakeGmail = (u16, Arc<Mutex<Vec<String>>>);

#[derive(Clone)]
struct Route {
    prefix: String,
    status: u16,
    file: String,
}

pub fn start_fake_gmail(routes: &[(String, String)]) -> FakeGmail {
    let routes: Vec<Route> = routes
        .iter()
        .map(|(prefix, answer)| route_from(prefix, answer))
        .collect();
    let listener = TcpListener::bind("127.0.0.1:0").expect("the fake Gmail server binds");
    let port = listener.local_addr().expect("a local address").port();
    let seen = Arc::new(Mutex::new(Vec::<String>::new()));
    let recorder = Arc::clone(&seen);
    thread::spawn(move || {
        for stream in listener.incoming() {
            let Ok(stream) = stream else { continue };
            let routes = routes.clone();
            let recorder = Arc::clone(&recorder);
            thread::spawn(move || answer(stream, &routes, &recorder));
        }
    });
    (port, seen)
}

fn route_from(prefix: &str, answer: &str) -> Route {
    let (status, file) = answer.split_once(' ').unwrap_or(("200", answer));
    Route {
        prefix: prefix.to_string(),
        status: status.parse().unwrap_or(200),
        file: file.to_string(),
    }
}

fn answer(mut stream: TcpStream, routes: &[Route], recorder: &Mutex<Vec<String>>) {
    let Some(request) = HttpRequest::read_from(&stream) else {
        return;
    };
    let method_and_path = request.method_and_path();
    recorder.lock().expect("the request log").push(format!(
        "{}\n{}\n{}",
        method_and_path,
        request.authorization,
        String::from_utf8_lossy(&request.body)
    ));
    let (status, payload) = match longest_route(routes, &method_and_path) {
        Some(route) => (
            route.status,
            fs::read_to_string(&route.file).unwrap_or_else(|_| String::from("{}")),
        ),
        None => (404, String::from("{\"error\":\"no route\"}")),
    };
    let retry_after = if status == 429 {
        "Retry-After: 2\r\n"
    } else {
        ""
    };
    let _ = write!(
        stream,
        "HTTP/1.1 {} OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n{}Connection: close\r\n\r\n{}",
        status,
        payload.len(),
        retry_after,
        payload
    );
}

fn longest_route<'a>(routes: &'a [Route], method_and_path: &str) -> Option<&'a Route> {
    routes
        .iter()
        .filter(|route| method_and_path.starts_with(route.prefix.as_str()))
        .max_by_key(|route| route.prefix.len())
}
