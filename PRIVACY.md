# Privacy

knave-mail is a desktop mail client that runs only on your computer. It has no server, collects no analytics, and sends nothing to its author or to anyone else.

## What it accesses

knave-mail asks Google for the `https://www.googleapis.com/auth/gmail.modify` permission. It uses that permission to read your mail and labels, change labels (archive, star, mark read), move threads to the trash, and send the messages you write.

## What it stores

All data stays on your computer:

- Mail, labels and sync state are cached in `~/.local/share/knave-mail/cache.sqlite3`.
- Your Google sign-in token is kept in your system keyring.
- The log in `~/.local/state/knave-mail/` records requests, timings and errors. It holds no tokens and no mail content.

`knave-mail accounts remove EMAIL` deletes that account's cached mail. Deleting `~/.local/share/knave-mail` removes the cache for every account.

## Where data goes

knave-mail connects only to Google: `accounts.google.com` and `oauth2.googleapis.com` to sign in, and `gmail.googleapis.com` to read and change your mail. An email's remote images load only when you ask for them.

knave-mail's use of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## Revoking access

Remove knave-mail at [Google Account permissions](https://myaccount.google.com/permissions) to revoke its access to your mail.

## Contact

Open an issue at <https://github.com/KarlHarnois/knave-mail/issues>.
