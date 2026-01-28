# Chrome Extension Publishing Script
# Builds a ZIP package and creates a git tag for the release

$ErrorActionPreference = "Stop"

# Paths
$rootDir = $PSScriptRoot
$srcDir = Join-Path $rootDir "src"
$webstoreDir = Join-Path $rootDir "webstore"
$manifestPath = Join-Path $srcDir "manifest.json"

# Read version from manifest.json
Write-Host "Reading version from manifest.json..." -ForegroundColor Cyan
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = $manifest.version

Write-Host "Extension: $($manifest.name)" -ForegroundColor Green
Write-Host "Version: $version" -ForegroundColor Green

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

# Summary
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Build Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Package: $zipPath"
Write-Host "Version: $version"
Write-Host "Tag: $tagName"
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Upload $zipFileName to Chrome Web Store Developer Dashboard"
Write-Host "2. Push git tag: git push origin $tagName"
Write-Host "================================`n" -ForegroundColor Cyan
