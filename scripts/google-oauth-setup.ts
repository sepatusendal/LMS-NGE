/**
 * One-time local script to authorize this app against a real Google account
 * (not a service account — see src/lib/google-drive/drive-client.ts for
 * why) and print the refresh token to store as GOOGLE_OAUTH_REFRESH_TOKEN.
 *
 * Prerequisites (done once in Google Cloud Console, same project as the
 * existing service account):
 *   1. APIs & Services > Credentials > Create Credentials > OAuth client ID
 *      - Application type: "Web application"
 *      - Authorized redirect URIs: http://localhost:53682/oauth/callback
 *   2. APIs & Services > OAuth consent screen
 *      - Add the dedicated Gmail account as a "Test user" (this keeps the
 *        app in Testing mode, which is fine for drive.file — no Google
 *        verification review needed for this scope)
 *
 * Usage:
 *   GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... npx tsx scripts/google-oauth-setup.ts
 *
 * Open the printed URL, sign in with the DEDICATED Gmail account (not your
 * personal one), approve access. The script prints the refresh token and
 * also writes it to google-oauth-result.json (gitignored) next to this file.
 */
import { createServer } from "http";
import { writeFileSync } from "fs";
import { google } from "googleapis";

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`;

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET (from the OAuth client you created in Google Cloud Console) before running this script.",
  );
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // force a refresh_token even if this account authorized before
  scope: ["https://www.googleapis.com/auth/drive.file"],
});

console.log("\nOpen this URL and sign in with the DEDICATED Gmail account:\n");
console.log(authUrl);
console.log("\nWaiting for authorization...\n");

const server = createServer(async (req, res) => {
  if (!req.url?.startsWith("/oauth/callback")) {
    res.writeHead(404);
    res.end();
    return;
  }

  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end(`Authorization failed: ${error}. You can close this tab.`);
    console.error("Authorization failed:", error);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Missing authorization code. You can close this tab.");
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Authorized! You can close this tab and go back to the terminal.");

    if (!tokens.refresh_token) {
      console.error(
        "\nNo refresh_token returned. This usually means the account already authorized this app before without revoking access.",
      );
      console.error(
        "Fix: revoke access at https://myaccount.google.com/permissions for this app, then run this script again.\n",
      );
      server.close();
      process.exit(1);
    }

    console.log("\nSuccess. Refresh token:\n");
    console.log(tokens.refresh_token);
    console.log("\nSet this as GOOGLE_OAUTH_REFRESH_TOKEN.\n");

    writeFileSync(
      "google-oauth-result.json",
      JSON.stringify({ refresh_token: tokens.refresh_token }, null, 2),
    );
    console.log("Also saved to google-oauth-result.json (gitignored).\n");
  } catch (err) {
    console.error("\nFailed to exchange code for tokens:", err);
  } finally {
    server.close();
    process.exit(0);
  }
});

server.listen(PORT);
