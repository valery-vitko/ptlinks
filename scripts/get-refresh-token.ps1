# Obtains a Chrome Web Store API refresh token via OAuth2 flow.
# Starts a local HTTP listener to capture the authorization code,
# then exchanges it for a refresh token.

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true

$redirectUri = "http://localhost:8234"
$scope = "https://www.googleapis.com/auth/chromewebstore"
$tokenEndpoint = "https://oauth2.googleapis.com/token"

# Load .env files for defaults
$defaults = @{}
foreach ($envFile in @('.env', '.env.local')) {
    $envPath = Join-Path (Join-Path $PSScriptRoot ..) $envFile
    if (Test-Path $envPath) {
        Get-Content $envPath | ForEach-Object {
            if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.+?)\s*$') {
                $defaults[$Matches[1]] = $Matches[2]
            }
        }
    }
}

# Prompt for Client ID and Secret (pre-fill from .env if available)
$clientId = $defaults['CLIENT_ID']
$clientSecret = $defaults['CLIENT_SECRET']

if ($clientId -and $clientId -ne 'your-client-id.apps.googleusercontent.com') {
    $input = Read-Host "Client ID [$clientId]"
    if ($input) { $clientId = $input }
} else {
    $clientId = Read-Host "Client ID"
}

if ($clientSecret -and $clientSecret -ne 'GOCSPX-...') {
    $input = Read-Host "Client Secret [$clientSecret]"
    if ($input) { $clientSecret = $input }
} else {
    $clientSecret = Read-Host "Client Secret"
}

if (-not $clientId -or -not $clientSecret) {
    Write-Host "Client ID and Client Secret are required." -ForegroundColor Red
    exit 1
}

# Build authorization URL
$authUrl = "https://accounts.google.com/o/oauth2/auth" +
    "?response_type=code" +
    "&scope=$([uri]::EscapeDataString($scope))" +
    "&client_id=$([uri]::EscapeDataString($clientId))" +
    "&redirect_uri=$([uri]::EscapeDataString($redirectUri))" +
    "&access_type=offline"

# Start local HTTP listener before opening browser
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("$redirectUri/")
$listener.Start()

Write-Host "`nOpening browser for authorization..." -ForegroundColor Cyan
Start-Process $authUrl

Write-Host "Waiting for redirect on $redirectUri ..." -ForegroundColor DarkGray

# Wait for the OAuth2 redirect
$context = $listener.GetContext()
$code = $context.Request.QueryString["code"]
$error_ = $context.Request.QueryString["error"]

# Send a response to the browser
$response = $context.Response
if ($code) {
    $body = [System.Text.Encoding]::UTF8.GetBytes(
        "<html><body><h2>Authorization successful!</h2><p>You can close this tab.</p></body></html>"
    )
} else {
    $body = [System.Text.Encoding]::UTF8.GetBytes(
        "<html><body><h2>Authorization failed.</h2><p>Error: $error_</p></body></html>"
    )
}
$response.ContentType = "text/html"
$response.ContentLength64 = $body.Length
$response.OutputStream.Write($body, 0, $body.Length)
$response.Close()
$listener.Stop()

if (-not $code) {
    Write-Host "Authorization failed: $error_" -ForegroundColor Red
    exit 1
}

Write-Host "Authorization code received." -ForegroundColor Green

# Exchange authorization code for tokens
Write-Host "Exchanging code for refresh token..." -ForegroundColor Cyan

$tokenResponse = Invoke-RestMethod -Method Post -Uri $tokenEndpoint -Body @{
    client_id     = $clientId
    client_secret = $clientSecret
    code          = $code
    grant_type    = "authorization_code"
    redirect_uri  = $redirectUri
}

if (-not $tokenResponse.refresh_token) {
    Write-Host "No refresh_token in response. Full response:" -ForegroundColor Red
    $tokenResponse | ConvertTo-Json | Write-Host
    exit 1
}

$refreshToken = $tokenResponse.refresh_token

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Refresh token obtained!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host $refreshToken
Write-Host "================================`n" -ForegroundColor Cyan

# Offer to save to .env.local
$save = Read-Host "Save to .env.local? (Y/n)"
if ($save -ne 'n' -and $save -ne 'N') {
    $envLocalPath = Join-Path (Join-Path $PSScriptRoot ..) ".env.local"

    # Build content from current .env as base, overriding with real values
    $lines = @(
        "EXTENSION_ID=$($defaults['EXTENSION_ID'])"
        "CLIENT_ID=$clientId"
        "CLIENT_SECRET=$clientSecret"
        "REFRESH_TOKEN=$refreshToken"
    )

    $lines | Set-Content $envLocalPath -Encoding UTF8
    Write-Host "Saved to .env.local" -ForegroundColor Green
}
