use std::borrow::Cow;
use std::sync::mpsc::{self, Receiver, Sender};
use std::thread;

use tao::dpi::LogicalSize;
use tao::event::{Event, WindowEvent};
use tao::event_loop::{ControlFlow, EventLoopBuilder, EventLoopProxy};
use tao::platform::unix::WindowExtUnix;
use tao::window::WindowBuilder;
use wry::http::{Request, Response};
use wry::{NewWindowResponse, WebView, WebViewBuilder, WebViewBuilderExtUnix};

const WIDTH: f64 = 1100.0;
const HEIGHT: f64 = 760.0;
const EXIT_COMMAND: &str = "\u{1}exit ";
const ZOOM_COMMAND: &str = "\u{1}zoom ";
const FOCUS_COMMAND: &str = "\u{1}focus";
const IN_APP_SCHEMES: [&str; 2] = ["knave:", "about:"];

pub fn open_window(
    title: &str,
    startup_script: &str,
    theme_css: &str,
    worker: impl FnOnce(Receiver<String>, EventLoopProxy<String>) + Send + 'static,
) {
    let event_loop = EventLoopBuilder::<String>::with_user_event().build();
    let outbox = event_loop.create_proxy();
    let (sender, inbox) = mpsc::channel::<String>();
    thread::spawn(move || worker(inbox, outbox));
    let window = WindowBuilder::new()
        .with_title(title)
        .with_inner_size(LogicalSize::new(WIDTH, HEIGHT))
        .build(&event_loop)
        .expect("the window opens");
    let theme_css = theme_css.to_string();
    let navigation_sender = sender.clone();
    let new_window_sender = sender.clone();
    let webview = WebViewBuilder::new()
        .with_custom_protocol("knave".into(), move |_, request| {
            asset_response(&request, &theme_css)
        })
        .with_clipboard(true)
        .with_initialization_script(startup_script)
        .with_ipc_handler(move |request| drop(sender.send(request.into_body())))
        .with_navigation_handler(move |url| stays_in_app(&url, &navigation_sender))
        .with_new_window_req_handler(move |url, _| {
            hand_link_to_core(&url, &new_window_sender);
            NewWindowResponse::Deny
        })
        .with_url("knave://localhost/")
        .build_gtk(window.default_vbox().expect("the window has a box"))
        .expect("the webview opens");
    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        match event {
            Event::UserEvent(reply) => handle_reply(&reply, &webview, &window, control_flow),
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            } => *control_flow = ControlFlow::Exit,
            _ => {}
        }
    })
}

fn stays_in_app(url: &str, sender: &Sender<String>) -> bool {
    let in_app = IN_APP_SCHEMES.iter().any(|scheme| url.starts_with(scheme));
    if !in_app {
        hand_link_to_core(url, sender);
    }
    in_app
}

fn hand_link_to_core(url: &str, sender: &Sender<String>) {
    let request = serde_json::json!({ "command": "open-link", "args": { "url": url } });
    drop(sender.send(request.to_string()));
}

fn asset_response(request: &Request<Vec<u8>>, theme_css: &str) -> Response<Cow<'static, [u8]>> {
    let (body, kind): (Cow<'static, [u8]>, &str) = match request.uri().path() {
        "/theme.css" => (
            Cow::Owned(theme_css.as_bytes().to_vec()),
            "text/css; charset=utf-8",
        ),
        "/darkreader.js" => (
            Cow::Borrowed(include_bytes!("../../frontend/dist/darkreader.js")),
            "text/javascript; charset=utf-8",
        ),
        "/app.js" => (
            Cow::Borrowed(include_bytes!("../../frontend/dist/app.js")),
            "text/javascript; charset=utf-8",
        ),
        "/app.css" => (
            Cow::Borrowed(include_bytes!("../../frontend/dist/app.css")),
            "text/css; charset=utf-8",
        ),
        _ => (
            Cow::Borrowed(include_bytes!("../../frontend/dist/index.html")),
            "text/html; charset=utf-8",
        ),
    };
    Response::builder()
        .header("Content-Type", kind)
        .body(body)
        .expect("an asset response")
}

fn handle_reply(
    reply: &str,
    webview: &WebView,
    window: &tao::window::Window,
    control_flow: &mut ControlFlow,
) {
    if let Some(code) = reply.strip_prefix(EXIT_COMMAND) {
        *control_flow = ControlFlow::ExitWithCode(code.parse().unwrap_or(1));
    } else if let Some(level) = reply.strip_prefix(ZOOM_COMMAND) {
        drop(webview.zoom(level.parse().unwrap_or(1.0)));
    } else if reply == FOCUS_COMMAND {
        window.set_focus();
    } else {
        drop(webview.evaluate_script(&format!("window.knaveBridge.receive({})", reply)));
    }
}
