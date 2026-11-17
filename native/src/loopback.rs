use std::io::{ErrorKind, Write};
use std::net::{Shutdown, TcpListener, TcpStream};
use std::thread;
use std::time::{Duration, Instant};

const READ_TIMEOUT: Duration = Duration::from_secs(10);
const POLL_PAUSE: Duration = Duration::from_millis(20);

pub fn next_connection(listener: &TcpListener, deadline: &Instant) -> Result<TcpStream, String> {
    loop {
        match listener.accept() {
            Ok((stream, _)) => return ready_for_reading(stream),
            Err(error) if error.kind() != ErrorKind::WouldBlock => return Err(error.to_string()),
            Err(_) if Instant::now() >= *deadline => {
                return Err(String::from("the browser did not answer in time"))
            }
            Err(_) => thread::sleep(POLL_PAUSE),
        }
    }
}

fn ready_for_reading(stream: TcpStream) -> Result<TcpStream, String> {
    stream
        .set_nonblocking(false)
        .and_then(|_| stream.set_read_timeout(Some(READ_TIMEOUT)))
        .map(|_| stream)
        .map_err(|error| error.to_string())
}

pub fn answer_browser(connection: &TcpStream, status: &str, page: &str) {
    let mut stream = connection;
    let _ = write!(
        stream,
        "HTTP/1.1 {}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        status,
        page.len(),
        page
    );
    let _ = stream.shutdown(Shutdown::Both);
}
