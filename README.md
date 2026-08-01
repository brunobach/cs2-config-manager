# CS2 Config Manager

A free, open-source desktop app to manage Counter-Strike 2 configs across multiple Steam accounts.

Built with **Tauri 2** (Rust backend) + **React 19 / Vite / Tailwind CSS v4** (frontend). Windows only (for now).

**English** · [Português (BR)](README.pt-BR.md)

## Features

- **Automatic Steam detection** — finds your Steam install via the registry (with a manual folder override if auto-detect fails).
- **All your accounts, one screen** — lists every Steam account with CS2 configs in `userdata/`, with avatars (local Steam avatar cache, with Steam Web fallback), last played, resolution, bind/convar counts.
- **See what's inside a config** — video settings (resolution, refresh rate, display mode, MSAA, NVIDIA Reflex, quality levels), crosshair (with a **live canvas preview**), viewmodel, mouse sensitivity, radar/HUD and key binds.
- **Edit safely** — friendly editors for crosshair/video/viewmodel/mouse, full bind editor, searchable convar table, and a raw file editor for the four config files.
- **Transfer configs between accounts** — copy video/convars/binds (or everything) from one account to another in two clicks. Perfect for when you log into a second account and everything resets to default.
- **Compare accounts** — side-by-side diff of two accounts' configs, grouped by category, with a "differences only" filter.
- **Automatic backups** — every write operation (edit, transfer, restore) first snapshots the current files. Manual snapshots and one-click restore included.
- **Steam Cloud warning** — the app detects when Steam/CS2 is running and warns you before writing (Steam Cloud can overwrite changes made while the game is open).
- **i18n** — English and Português (Brasil), with more languages welcome.

## Download

Grab the latest Windows installer (`*-setup.exe`, NSIS) from [Releases](../../releases).

> **Important:** close CS2 (and preferably Steam) before editing or transferring configs. Steam Cloud sync can overwrite changes made while the game is running. The app warns you when it detects either process.

## Where does it write?

- **Reads/writes CS2 configs** only inside `Steam/userdata/<accountId>/730/local/cfg/` (the four files: `cs2_video.txt`, `cs2_user_convars_0_slot0.vcfg`, `cs2_user_keys_0_slot0.vcfg`, `cs2_machine_convars.vcfg`).
- **Backups and settings** live in the app data folder: `%APPDATA%/com.cs2configmanager.app/` (`cs2-backups/<accountId>/<timestamp>/` and `settings.json`).
- Every write is atomic (temp file + rename) and preceded by a backup when the target file already existed.

## Development

### Prerequisites

- **Node.js 22+** and npm
- **Rust** (stable, via [rustup](https://rustup.rs/))
- **Microsoft C++ Build Tools** (Windows) — install via the Visual Studio Installer with the **"Desktop development with C++"** workload
- **WebView2** — already present on up-to-date Windows 10/11

> **Windows + Git Bash gotcha:** run `cargo` / `npm run tauri dev` from **cmd.exe or PowerShell**, not Git Bash. Git Bash ships its own `link.exe` (GNU coreutils) that shadows the MSVC linker in `PATH` and breaks the build with `link: extra operand ...`. In cmd/PowerShell, rustc finds the MSVC linker automatically via the registry — no `vcvars` needed.

> **Windows 11 — Smart App Control:** if `cargo build/test` fails with `error 4551 (An Application Control policy has blocked this file)` when running build scripts, **Smart App Control** is blocking freshly compiled unsigned executables. Turn it off in *Windows Security → App & browser control → Smart App Control settings → Off* (one-way switch — standard for dev machines). It will also block running the unsigned app binary, so local `tauri dev` requires it off.

### Commands

```bash
npm install        # install frontend dependencies
npm run dev        # frontend only (Vite, http://localhost:5173) — UI without backend
npm run tauri dev  # full desktop app with hot reload
npm run tauri build # production build + NSIS installer (src-tauri/target/release/bundle)
npm run typecheck  # TypeScript check
cargo test --manifest-path src-tauri/Cargo.toml  # Rust unit tests (VDF parser, SteamID math)
```

### Project structure

```
src/                 Frontend (React 19, Vite, Tailwind v4, react-router, react-i18next)
  components/ui/     shadcn/ui components (radix)
  components/layout/ App shell (sidebar, theme toggle, language switcher)
  features/          accounts (list), account-detail (tabs), compare (diff)
  i18n/locales/      pt-BR.json, en.json
  lib/               api.ts (Tauri command wrappers), types.ts (command contracts)
src-tauri/           Rust backend (Tauri commands: Steam detection, VDF parsing, backups, diff, transfer)
```

## Internationalization (i18n)

UI strings live in `src/i18n/locales/<lang>.json`. To add a language:

1. Copy `en.json` to `<your-lang>.json` and translate the values.
2. Register it in `SUPPORTED_LANGUAGES` in `src/i18n/index.ts`.
3. Open a PR — that's it.

## Release process

Releases are built by GitHub Actions (`.github/workflows/release.yml`): push a tag like `v0.2.0` and the workflow produces a draft release with the Windows NSIS installer.

## Roadmap

- [ ] Crosshair share-code import/export (`CSGO-…`)
- [ ] Shared game cfg folder editor (`autoexec.cfg`, practice cfgs)
- [ ] Custom app icon (currently the default Tauri icon — run `npx tauri icon <png>` to replace)
- [ ] Linux/macOS builds (Steam on those platforms)

## Origin

This app was extracted from lowlights (a local CS2 highlight generator), where the config manager first shipped as a feature. It is now a standalone project so any CS2 player can use it.

## License

[MIT](LICENSE) © brunobach
