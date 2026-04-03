# Chrome Extension Publishing Script
# Builds a ZIP package and creates a git tag for the release

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true

# Load .env files. Priority: shell env > .env.local > .env
$rootDir = Join-Path $PSScriptRoot ..
$shellEnvKeys = @{}
foreach ($key in @('EXTENSION_ID', 'CLIENT_ID', 'CLIENT_SECRET', 'REFRESH_TOKEN')) {
    if (Get-Item "env:$key" -ErrorAction SilentlyContinue) {
        $shellEnvKeys[$key] = $true
    }
}
foreach ($envFile in @('.env', '.env.local')) {
    $envPath = Join-Path $rootDir $envFile
    if (Test-Path $envPath) {
        Get-Content $envPath | ForEach-Object {
            if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.+?)\s*$') {
                $key = $Matches[1]
                if (-not $shellEnvKeys[$key]) {
                    [Environment]::SetEnvironmentVariable($key, $Matches[2], 'Process')
                }
            }
        }
        Write-Host "Loaded $envFile" -ForegroundColor DarkGray
    }
}

# Run tests before packaging
Write-Host "Running tests..." -ForegroundColor Cyan
npm test
Write-Host "All tests passed!" -ForegroundColor Green

# Paths
$srcDir = Join-Path $rootDir "src"
$webstoreDir = Join-Path $rootDir "webstore"
$manifestPath = Join-Path $srcDir "manifest.json"

# Read version from manifest.json
Write-Host "Reading version from manifest.json..." -ForegroundColor Cyan
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = $manifest.version

Write-Host "Extension: $($manifest.name)" -ForegroundColor Green
Write-Host "Version: $version" -ForegroundColor Green

# Sync version into package.json
$packageJsonPath = Join-Path $rootDir "package.json"
$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
if ($packageJson.version -ne $version) {
    $packageJson.version = $version
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath -Encoding UTF8
    Write-Host "Synced package.json version to $version" -ForegroundColor Yellow
}

# Create webstore directory if it doesn't exist
if (-not (Test-Path $webstoreDir)) {
    New-Item -ItemType Directory -Path $webstoreDir | Out-Null
    Write-Host "Created webstore directory" -ForegroundColor Yellow
}

# Output ZIP file path
$zipFileName = "links-to-jira-v$version.zip"
$zipPath = Join-Path $webstoreDir $zipFileName

# Remove existing ZIP if present
if (Test-Path $zipPath) {
    Write-Host "Removing existing ZIP file..." -ForegroundColor Yellow
    Remove-Item $zipPath -Force
}

# Create ZIP archive
Write-Host "Creating ZIP package..." -ForegroundColor Cyan
Compress-Archive -Path "$srcDir\*" -DestinationPath $zipPath -CompressionLevel Optimal

$zipSize = (Get-Item $zipPath).Length / 1KB
Write-Host "Package created: $zipFileName ($([math]::Round($zipSize, 2)) KB)" -ForegroundColor Green

# Git tagging
$tagName = "v$version"
Write-Host "`nChecking git tags..." -ForegroundColor Cyan

$existingTag = git tag -l $tagName 2>$null
if ($existingTag) {
    Write-Host "Git tag '$tagName' already exists" -ForegroundColor Yellow
    $createTag = Read-Host "Do you want to delete and recreate it? (y/N)"
    if ($createTag -eq 'y' -or $createTag -eq 'Y') {
        git tag -d $tagName
        git tag -a $tagName -m "Release $version"
        Write-Host "Git tag '$tagName' recreated" -ForegroundColor Green
    }
} else {
    git tag -a $tagName -m "Release $version"
    Write-Host "Git tag '$tagName' created" -ForegroundColor Green
}

# Chrome Web Store upload (requires env vars — see README for setup)
$cwsReady = $env:EXTENSION_ID -and $env:CLIENT_ID -and $env:CLIENT_SECRET -and $env:REFRESH_TOKEN
if ($cwsReady) {
    Write-Host "`nUploading to Chrome Web Store..." -ForegroundColor Cyan
    npx chrome-webstore-upload upload --source $zipPath --extension-id $env:EXTENSION_ID --client-id $env:CLIENT_ID --client-secret $env:CLIENT_SECRET --refresh-token $env:REFRESH_TOKEN

    $publishNow = Read-Host "Publish to Chrome Web Store now? (y/N)"
    if ($publishNow -eq 'y' -or $publishNow -eq 'Y') {
        npx chrome-webstore-upload publish --extension-id $env:EXTENSION_ID --client-id $env:CLIENT_ID --client-secret $env:CLIENT_SECRET --refresh-token $env:REFRESH_TOKEN
        Write-Host "Published to Chrome Web Store!" -ForegroundColor Green
    } else {
        Write-Host "Uploaded but not published. Publish manually from the Developer Dashboard." -ForegroundColor Yellow
    }
}

# Summary
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Build Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Package: $zipPath"
Write-Host "Version: $version"
Write-Host "Tag: $tagName"
if (-not $cwsReady) {
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "1. Upload $zipFileName to Chrome Web Store Developer Dashboard"
    Write-Host "   (or set CWS env vars to automate — see README)"
    Write-Host "2. Push git tag: git push origin $tagName"
}
Write-Host "================================`n" -ForegroundColor Cyan
