# Deploy to Render + create cron-job.org ping (every 10 minutes)
# Account: yosefnoorani@gmail.com
#
# Set API keys (one-time):
#   $env:RENDER_API_KEY = 'rnd_...'   # https://dashboard.render.com/u/settings#api-keys
#   $env:CRONJOB_API_KEY = '...'      # https://console.cron-job.org/settings
#
# Then: .\scripts\setup-render-and-cron.ps1

$ErrorActionPreference = 'Stop'

$RepoUrl = 'https://github.com/Yosefnoorani/english-learning'
$ServiceName = 'english-learning'
$Branch = 'main'
$BuildCommand = 'npm install && npm run build'
$PublishPath = 'dist'
$ExpectedEmail = 'yosefnoorani@gmail.com'

function Require-Env([string]$Name) {
    if (-not (Get-Item "Env:$Name" -ErrorAction SilentlyContinue)) {
        Write-Host ""
        Write-Host "Missing `$env:$Name"
        Write-Host ""
        Write-Host "=== Links (sign in with $ExpectedEmail) ==="
        Write-Host "Render dashboard:     https://dashboard.render.com/"
        Write-Host "Render API keys:      https://dashboard.render.com/u/settings#api-keys"
        Write-Host "New Static Site:      https://dashboard.render.com/create?type=static"
        Write-Host "Connect GitHub:       https://dashboard.render.com/github"
        Write-Host "Blueprint (render.yaml): https://dashboard.render.com/select-repo?type=blueprint"
        Write-Host "cron-job.org console: https://console.cron-job.org/"
        Write-Host "cron-job API key:     https://console.cron-job.org/settings"
        Write-Host "GitHub repo:          $RepoUrl"
        Write-Host ""
        exit 1
    }
    (Get-Item "Env:$Name").Value
}

function Invoke-RenderApi {
    param([string]$Method, [string]$Path, [object]$Body = $null)
    $key = Require-Env 'RENDER_API_KEY'
    $headers = @{
        Authorization = "Bearer $key"
        Accept        = 'application/json'
    }
    $uri = "https://api.render.com/v1$Path"
    if ($Body) {
        $json = $Body | ConvertTo-Json -Depth 10 -Compress
        return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -Body $json -ContentType 'application/json'
    }
    Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
}

function Get-OrCreate-RenderService {
    $owners = Invoke-RenderApi -Method GET -Path '/owners'
    $owner = $owners[0]
    if (-not $owner) { throw 'No Render workspace found for this API key.' }
    $ownerId = $owner.owner.id
    Write-Host "Render owner: $($owner.owner.name) ($ownerId)"

    $services = Invoke-RenderApi -Method GET -Path "/services?limit=100"
    $existing = $services | Where-Object { $_.service.name -eq $ServiceName }
    if ($existing) {
        $svc = $existing[0].service
        Write-Host "Service already exists: $($svc.name)"
        return $svc
    }

    Write-Host "Creating static site $ServiceName ..."
    $created = Invoke-RenderApi -Method POST -Path '/services' -Body @{
        type         = 'static_site'
        name         = $ServiceName
        ownerId      = $ownerId
        repo         = $RepoUrl
        branch       = $Branch
        autoDeploy   = 'yes'
        serviceDetails = @{
            buildCommand = $BuildCommand
            publishPath  = $PublishPath
        }
    }
    return $created
}

function Get-SiteUrl([object]$Service) {
    if ($Service.serviceDetails.url) { return $Service.serviceDetails.url }
    "https://$($Service.name).onrender.com"
}

function New-CronJob([string]$Url) {
    $key = Require-Env 'CRONJOB_API_KEY'
    $headers = @{
        Authorization = "Bearer $key"
        'Content-Type' = 'application/json'
    }
    $body = @{
        job = @{
            title          = 'English Learning keep-alive'
            url            = $Url
            enabled        = $true
            saveResponses  = $false
            requestMethod  = 0
            schedule       = @{
                timezone  = 'UTC'
                expiresAt = 0
                hours     = @(-1)
                mdays     = @(-1)
                months    = @(-1)
                wdays     = @(-1)
                minutes   = @(0, 10, 20, 30, 40, 50)
            }
        }
    } | ConvertTo-Json -Depth 10

    try {
        $result = Invoke-RestMethod -Method PUT -Uri 'https://api.cron-job.org/jobs' -Headers $headers -Body $body
        Write-Host "Cron job created (id: $($result.jobId))"
    } catch {
        Write-Warning "Cron API error: $($_.Exception.Message)"
        Write-Host "Create manually: https://console.cron-job.org/jobs/create"
        Write-Host "  URL: $Url"
        Write-Host "  Schedule: every 10 minutes"
    }
}

$service = Get-OrCreate-RenderService
$siteUrl = Get-SiteUrl $service
Write-Host ""
Write-Host "Site URL: $siteUrl"
Write-Host "Render service dashboard: https://dashboard.render.com/static/$($service.id)"

if ($env:CRONJOB_API_KEY) {
    New-CronJob -Url $siteUrl
} else {
    Write-Host ""
    Write-Host "Set `$env:CRONJOB_API_KEY and re-run to create cron automatically."
    Write-Host "Or create cron manually: https://console.cron-job.org/jobs/create"
}

Write-Host ""
Write-Host "Done."
