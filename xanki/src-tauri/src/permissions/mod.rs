use crate::models::PermissionStatus;

#[cfg(target_os = "macos")]
pub fn check_permissions() -> PermissionStatus {
    PermissionStatus {
        accessibility: check_accessibility(),
        screen_recording: check_screen_recording(),
    }
}

#[cfg(not(target_os = "macos"))]
pub fn check_permissions() -> PermissionStatus {
    PermissionStatus {
        accessibility: false,
        screen_recording: false,
    }
}

#[cfg(target_os = "macos")]
fn check_accessibility() -> bool {
    extern "C" {
        fn AXIsProcessTrusted() -> bool;
    }
    unsafe { AXIsProcessTrusted() }
}

#[cfg(target_os = "macos")]
fn check_screen_recording() -> bool {
    extern "C" {
        fn CGPreflightScreenCaptureAccess() -> bool;
    }
    unsafe { CGPreflightScreenCaptureAccess() }
}

pub fn open_accessibility_settings() {
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn();
    }
}

pub fn open_screen_recording_settings() {
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture")
            .spawn();
    }
}
