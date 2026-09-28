# Coaching Fee Manager - Google Drive mini version

This is a **prototype, not a production release**. A teacher signs in with Google and the app creates a spreadsheet named "Coaching Fee Manager Data" in **that teacher's own Google Drive**. Each authenticated request uses that teacher's Google token and only reads/writes the spreadsheet visible to that account. There is no shared app database, payment gateway, or paid plan required for development. Each teacher's data is separate by their Google Drive permissions, not by trusting an email parameter in the browser.

## Setup before Google login works

1. Create a Google Cloud project under the chosen owner's Google account. Enable **Google Drive API** and **Google Sheets API**. Configure an **External** OAuth consent screen, publishing details, authorized domain/home page and privacy policy if Google asks for them. Request `openid`, `email`, `profile`, and `https://www.googleapis.com/auth/drive.file`. Google calls `drive.file` non-sensitive. Its OAuth verification help says verification is not mandatory for apps using only non-sensitive scopes; brand verification is needed if the app wants a displayed name and logo. Publishing, policy compliance, consent configuration and real testing still matter. Testing mode limits the app to manually added test users; do not promise "anyone" until production publication and actual user testing.
2. Create a **Web application** OAuth client, with authorized redirect URI `https://coaching-fee-manager-mvp.onrender.com/api/auth/callback`. For local testing also add `http://localhost:3000/api/auth/callback`. Add the client ID and client secret to Render environment as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (never commit them). Set `APP_URL` exactly to the deployed HTTPS origin. `SESSION_SECRET` must be 32+ random characters.
3. Deploy and test with two distinct consenting test Google accounts: create a batch and student in A, confirm the sheet appears in A's Drive and **not** B's app session/Drive; create B's batch and verify A cannot see it. Confirm reload persistence, logout, receipt, and no shared data. No real student data until this passes and backup/recovery are in place.

Local: `npm ci && cp .env.example .env && npm run dev`. Build: `npm run build`. The local preview has no working Google sign-in without your own OAuth client.

## Data and limits

All records are stored as JSON split across cells of the `Records` tab (not nice tables for manual editing); the app owns the layout, so do not edit cells. Google API quotas, Sheet size, connection latency, and free Render cold starts can slow or block use. Writing uses a process-local queue; concurrent writes from more than one Render instance or another device at precisely the same time may overwrite each other because Google Sheets lacks an atomic transaction here. **Do not use for real financial records or sensitive student details yet.** This is a small demo, not a tested multi-user accounting system. Implement optimistic concurrency/storage revision control, audit trails, stronger validation, privacy policy, and load testing before release.

JSON backup export and replacement restore are available in the Backup section; restore validates the file but replaces every record in that account, rather than merging. Download the current backup before restoring. Photos are kept as compressed base64 in the Sheet, so excessive photos can hit its capacity. The full demo video uses sample data and is embedded in the Guide. Hindi translation covers navigation and key controls, while longer supporting text remains in English. WhatsApp links open a user-reviewed draft; the app does not send messages. PDF sharing uses the device share menu when available.

Google access/refresh tokens are held in an encrypted, HTTP-only, 8-hour cookie; there is no server-side token database. Logout clears the app cookie, not the user's entire Google account session or previously granted Google authorization. Teachers can revoke app access from their Google Account permissions. Existing SQLite demo data is not imported into their Google Sheet. The old disposable demo has separate data, and any Render redeploy may remove it. Android WebView APK has not been device-tested; OAuth through embedded WebViews may be blocked by Google. Use the normal system browser for Google sign-in, or test/rework Android sign-in before promising APK compatibility.

## Sources

- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get
- https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/update
- https://support.google.com/cloud/answer/13464321
