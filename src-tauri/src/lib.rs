#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  if let Err(err) = tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_oauth::init())
    .plugin(tauri_plugin_http::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
  {
    // Surface the underlying cause before exiting non-zero rather than panicking
    // with an opaque message (the bare `.expect` hid what actually went wrong).
    eprintln!("Fatal error while running Scribe: {err}");
    std::process::exit(1);
  }
}
