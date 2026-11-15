# knave-mail

[![Knave v0.14.23](https://img.shields.io/badge/knave-v0.14.23-blue.svg)](https://github.com/knave-lang/knave/releases/tag/v0.14.23)
[![Nix flake](https://img.shields.io/badge/nix-flake-5277C3.svg?logo=nixos&logoColor=white)](flake.nix)

A fast, keyboard-driven Gmail client for vim users, written in [Knave](https://github.com/knave-lang/knave). It has a window and a CLI.

## Use

Run `direnv allow` once to load the [Nix](https://nixos.org/download/) dev shell, then build:

```sh
(cd frontend && bun install && bun run build)
knave build
```

Try it on fake mail:

```sh
target/knave/knave-mail/knave-mail --backend memory
```

Press `?` in the window for every key.

### Gmail

1. In the [Google Cloud console](https://console.cloud.google.com/), enable the Gmail API and create an OAuth client of type **Desktop app**. Add your address as a test user.
2. Export `KNAVE_MAIL_CLIENT_ID` and `KNAVE_MAIL_CLIENT_SECRET`.
3. Run `knave-mail accounts add` once per account. It opens Google's sign-in page and keeps the token in your keyring.
4. Run `knave-mail`.

### Config

Copy [docs/theme.example.knv](docs/theme.example.knv) and [docs/keymap.example.knv](docs/keymap.example.knv) to `~/.config/knave-mail/` as `theme.knv` and `keymap.knv`, and keep only what you change.

### CLI

Run `knave-mail help` for the commands. Add `--json` for output that scripts and agents can read.

### Logs

The log is at `~/.local/state/knave-mail/knave-mail.log` and holds no tokens or mail content. Set `KNAVE_MAIL_LOG=debug` to log every request, or `KNAVE_MAIL_LOG_FILE` to write it elsewhere.

## Develop

Run `knave task ci` for every check. The code follows a ports and adapters design under `src/`, and the frontend in `frontend/` speaks the protocol in [docs/ipc-protocol.md](docs/ipc-protocol.md).
