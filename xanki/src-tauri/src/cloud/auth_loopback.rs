use crate::cloud;
use crate::error::{AppError, AppResult};
use crate::windows;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicU64, Ordering};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

static AUTH_LOOPBACK_GEN: AtomicU64 = AtomicU64::new(0);

const LOOPBACK_SUCCESS_HTML: &str = "<!DOCTYPE html><html lang=\"ja\"><head><meta charset=\"utf-8\"><title>xanki</title></head><body><p>ログインしました。xanki に戻れます。このタブを閉じてください。</p></body></html>";

pub fn start_auth_loopback(app: &AppHandle) -> AppResult<u16> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|e| AppError::Other(format!("loopback bind: {e}")))?;
    let port = listener
        .local_addr()
        .map_err(|e| AppError::Other(format!("loopback addr: {e}")))?
        .port();
    listener
        .set_nonblocking(true)
        .map_err(|e| AppError::Other(format!("loopback nonblocking: {e}")))?;

    let generation = AUTH_LOOPBACK_GEN.fetch_add(1, Ordering::SeqCst) + 1;
    let handle = app.clone();
    thread::spawn(move || {
        wait_for_auth_callback(listener, generation, handle);
    });

    Ok(port)
}

fn wait_for_auth_callback(listener: TcpListener, generation: u64, app: AppHandle) {
    let deadline = Instant::now() + Duration::from_secs(600);
    loop {
        if Instant::now() >= deadline || generation != AUTH_LOOPBACK_GEN.load(Ordering::SeqCst) {
            return;
        }
        match listener.accept() {
            Ok((stream, _)) => {
                handle_auth_callback_request(stream, &app);
                return;
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(100));
            }
            Err(_) => return,
        }
    }
}

fn handle_auth_callback_request(mut stream: TcpStream, app: &AppHandle) {
    let mut buf = [0u8; 8192];
    let read = match stream.read(&mut buf) {
        Ok(n) if n > 0 => n,
        _ => return,
    };
    let request = String::from_utf8_lossy(&buf[..read]);
    let token = parse_token_from_http_request(&request);
    let ok = matches!(
        token.as_deref().map(cloud::save_session_token),
        Some(Ok(()))
    );
    if ok {
        let _ = app.emit("xanki:auth-complete", ());
        let _ = windows::show_main_window(app);
    }
    let body = if ok {
        LOOPBACK_SUCCESS_HTML
    } else {
        "<!DOCTYPE html><html lang=\"ja\"><head><meta charset=\"utf-8\"><title>xanki</title></head><body><p>ログインに失敗しました。xanki アプリから再度お試しください。</p></body></html>"
    };
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    let _ = stream.write_all(response.as_bytes());
}

fn parse_token_from_http_request(request: &str) -> Option<String> {
    let line = request.lines().next()?;
    let path = line.split_whitespace().nth(1)?;
    let query = path.split('?').nth(1)?;
    for pair in query.split('&') {
        let (key, value) = pair.split_once('=')?;
        if key == "token" {
            return Some(super::decode_form_component(value));
        }
    }
    None
}
