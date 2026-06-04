# Push to GitHub under yosefnoorani@gmail.com
# Prerequisite: gh auth login (browser) while signed into that Google account on GitHub.

$ErrorActionPreference = 'Stop'
$ExpectedEmail = 'yosefnoorani@gmail.com'
$RepoName = 'english-learning'
$gh = "$env:ProgramFiles\GitHub CLI\gh.exe"

if (-not (Test-Path $gh)) {
    Write-Error 'Install GitHub CLI: winget install GitHub.cli'
}

& $gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Run: gh auth login --hostname github.com --git-protocol https --web"
    Write-Host "Sign in with: $ExpectedEmail"
    exit 1
}

$user = & $gh api user --jq '{login: .login, email: .email}'
$login = & $gh api user --jq .login
$emails = & $gh api user/emails --jq '.[] | select(.primary==true) | .email' 2>$null
if (-not $emails) { $emails = & $gh api user --jq .email }

Write-Host "GitHub user: $login"
if ($emails -and $emails -notmatch [regex]::Escape($ExpectedEmail)) {
    Write-Warning "Primary GitHub email may not be $ExpectedEmail. Verify in GitHub Settings > Emails."
}

Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (git remote get-url origin 2>$null)) {
    & $gh repo create $RepoName --public --source=. --remote=origin --description 'English learning app (Vite + React)'
} else {
    git push -u origin main
}

Write-Host "Done. Repo: https://github.com/$login/$RepoName"
