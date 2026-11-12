# knave-mail

[![Knave v0.14.23](https://img.shields.io/badge/knave-v0.14.23-blue.svg)](https://github.com/knave-lang/knave/releases/tag/v0.14.23)
[![Nix flake](https://img.shields.io/badge/nix-flake-5277C3.svg?logo=nixos&logoColor=white)](flake.nix)

A fast, minimal desktop email client for vim users, written in [Knave](https://github.com/knave-lang/knave). You read, write and yank from emails with vim keys, and the window uses your system font. It reads Gmail and keeps a local cache, so the window opens and moves without waiting on the network. A CLI exposes the same features to scripts and agents.

## Use

Run `direnv allow` once to load the [Nix](https://nixos.org/download/) dev shell. Then build the frontend and the binary:

```sh
(cd frontend && bun install && bun run build)
knave build
```

The binary is `target/knave/knave-mail/knave-mail`.

### Try it without an account

Start the window on fake accounts and fake mail that live only in memory:

```sh
target/knave/knave-mail/knave-mail --backend memory
```

Add `--latency 800` to slow every call down. Add `--fail deliver` to make sending fail. Both show how the window handles a slow or failing network.

### Connect a Gmail account

1. In the [Google Cloud console](https://console.cloud.google.com/), create a project and enable the Gmail API.
2. Create an OAuth client of type **Desktop app**.
3. On the OAuth consent screen, add your address as a test user. In testing mode, Google expires the saved sign-in after 7 days, and `knave-mail accounts add` signs in again.
4. Export the client's credentials, for example from 1Password with `op run`:

   ```sh
   export KNAVE_MAIL_CLIENT_ID=op://Private/knave-mail/client-id
   export KNAVE_MAIL_CLIENT_SECRET=op://Private/knave-mail/client-secret
   ```

5. Sign in. Your browser opens Google's consent page, and the refresh token goes to your keyring:

   ```sh
   op run -- target/knave/knave-mail/knave-mail accounts add
   ```

   If the browser does not open, open the URL that the command prints.
6. Open the window with `op run -- target/knave/knave-mail/knave-mail`, and press `R` to sync.

Repeat step 5 for each account. `Ctrl-n` and `Ctrl-p` switch between accounts in the window.

### The window

| Where | Keys |
| --- | --- |
| Thread list | `j` `k` `gg` `G` and counts, `Enter` to open, `/` to search, `c` to compose, `e` archive, `#` trash, `s` star, `u` unread, `gi` inbox, `ga` all mail, `R` sync, `:` command line |
| Thread | `j` `k` between messages, `r` reply, `a` reply all, `f` forward, `v` vim text reader for yanking, `i` load remote images, `q` back |
| Composer | vim editing, `:w` keeps the draft, `:x` or `ZZ` sends, `:q!` discards |

A yank in the text reader pastes in the composer, and it also goes to the system clipboard.

### The CLI

Any command word runs the CLI instead of the window. `knave-mail help` lists the commands:

```sh
knave-mail threads list --label INBOX
knave-mail --json threads show t-1
echo "Tuesday works." | knave-mail reply m-1 --dry-run
```

`--json` prints one versioned JSON document, and the exit code names the error kind, so agents can script it.

## Design

The app follows a ports and adapters design:

- `src/domain` holds the mail model and its rules.
- `src/app` implements the `mail-client` driving port over the driven ports in `src/ports`.
- `src/adapters/driving` holds the webview and CLI adapters.
- `src/adapters/driven` holds the Gmail, SQLite, keyring, OAuth and memory adapters.
- `src/composition` wires one set of adapters per backend.

The frontend in `frontend/` speaks the JSON protocol in [docs/ipc-protocol.md](docs/ipc-protocol.md).

## Develop

`knave task ci` runs every check in order, from formatting to the GUI scenarios. Run single steps with these commands:

```sh
knave test
knave task e2e
knave fmt
knave task check-file-lengths
(cd frontend && bun test)
```

The knave tests live in `tests/unit`, `tests/integration` and `tests/e2e`. The integration and e2e tests run against a fake Gmail server with fixtures in `tests/fixtures`. `knave task e2e` drives the window under `xvfb-run` with the scripts in `tests/e2e/gui`.
