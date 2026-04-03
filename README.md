# Links to Jira

Google Chrome extension that highlights Jira issue IDs as links on various web pages.

Supported web pages:

* GitHub pull requests
* PlanITpoker (https://*.planitpoker.com/board/)

[Install](https://chrome.google.com/webstore/detail/links-to-jira/gkioloikgbfkgonlmmhkgchmoilcbglb) from Chrome Web Store.

[How to install from source code](http://superuser.com/questions/247651/how-does-one-install-an-extension-for-chrome-browser-from-the-local-file-system).

## Development

### Install dependencies

```
npm install
```

### Run tests

```
npm test
```

## Publishing

### Quick publish (build + tag)

```powershell
./scripts/publish.ps1
```

The script runs tests, builds a ZIP, syncs version into `package.json`, creates a git tag, and optionally uploads to the Chrome Web Store.

### Chrome Web Store CLI setup (one-time)

To enable automated upload/publish from the CLI, follow these steps:

#### 1. Create a Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (any name, e.g. "CWS Publishing")
3. Go to **APIs & Services > Library**
4. Search for **Chrome Web Store API** and enable it

#### 2. Create OAuth2 credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Application type: **Desktop app**
4. Note the **Client ID** and **Client Secret**

#### 3. Get a refresh token

1. Go to **APIs & Services > OAuth consent screen**
2. Set up the consent screen (External is fine for personal use; add yourself as a test user)
3. Run the interactive script:

```powershell
./scripts/get-refresh-token.ps1
```

It will prompt for your Client ID/Secret (pre-filled from `.env` if available), open the browser for authorization, capture the redirect automatically, exchange the code for a refresh token, and offer to save everything to `.env.local`.

#### 4. Set environment variables

| Variable         | Value                                    |
| ---------------- | ---------------------------------------- |
| `EXTENSION_ID`   | Your extension ID from the Developer Dashboard (e.g. `gkioloikgbfkgonlmmhkgchmoilcbglb`) |
| `CLIENT_ID`      | OAuth2 Client ID from step 2             |
| `CLIENT_SECRET`  | OAuth2 Client Secret from step 2         |
| `REFRESH_TOKEN`  | Refresh token from step 3                |

Copy `.env` to `.env.local` and fill in your real values:

```bash
cp .env .env.local
```

`scripts/publish.ps1` loads `.env` first (committed, contains placeholders), then `.env.local` (git-ignored, contains secrets). Environment variables already set in the shell take precedence over both files.

#### 5. Publish

Once set, `./scripts/publish.ps1` will automatically upload the ZIP and prompt to publish.

### Manual publish (without CLI setup)

1. Run `./scripts/publish.ps1` to build the ZIP and create a git tag
2. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Upload the ZIP from `webstore/`
4. Push the git tag: `git push origin v<version>`
