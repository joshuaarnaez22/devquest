# Steam platform adapters

This directory is empty in the web build. The Steam/Tauri build re-implements
the `src/platform/` interfaces here (storage, fullscreen, browser open, etc.)
without changing game code. See docs/03-Technical-Architecture.md §14.
