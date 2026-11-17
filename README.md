# knave-mail

[![Knave version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FKarlHarnois%2Fknave-mail%2Fmain%2Fflake.lock&query=%24.nodes.knave.original.ref&label=knave&color=blue)](https://github.com/knave-lang/knave/releases)
[![Nix flake](https://img.shields.io/badge/nix-flake-5277C3.svg?logo=nixos&logoColor=white)](flake.nix)

A fast, keyboard-driven Gmail client for vim users, written in [Knave](https://github.com/knave-lang/knave). It has a window and a CLI.

## Use

Run `direnv allow` once to load the [Nix](https://nixos.org/download/) dev shell, then build and install to `~/.local/bin`:

```sh
knave task install
```

Try it on fake mail:

```sh
knave-mail --backend memory
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

Run `knave task ci` for every check. The code follows a ports and adapters design under `src/`. Rust too long for an inline `rust` template lives in the [native](native) crate. The frontend in `frontend/` talks to the core in the messages that [frontend/src/bridge/Protocol.ts](frontend/src/bridge/Protocol.ts) types. Both sides test against the recorded messages in [tests/fixtures/ipc](tests/fixtures/ipc).
