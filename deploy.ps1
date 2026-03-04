$ErrorActionPreference = "Stop"
$workDir = "c:\Users\EXCALIBUR\Documents\goldenupload3\goldenupload"
Set-Location $workDir

Write-Host "=== Current Directory ===" -ForegroundColor Cyan
Get-Location

Write-Host "`n=== Configuring Git ===" -ForegroundColor Cyan
git config --global core.pager ""
git config --global core.editor ""

Write-Host "`n=== Git Status Before ===" -ForegroundColor Cyan
git status --short

Write-Host "`n=== Adding health endpoint ===" -ForegroundColor Cyan
git add src/app/api/health/route.ts
Write-Host "File added successfully" -ForegroundColor Green

Write-Host "`n=== Git Status After Add ===" -ForegroundColor Cyan
git status --short

Write-Host "`n=== Creating commit ===" -ForegroundColor Cyan
git commit -m "feat: Add health check endpoint"
Write-Host "Commit created successfully" -ForegroundColor Green

Write-Host "`n=== Git Log (last 2 commits) ===" -ForegroundColor Cyan
git log --oneline -2

Write-Host "`n=== Pushing to master ===" -ForegroundColor Cyan
git push origin master
Write-Host "Push completed successfully" -ForegroundColor Green

Write-Host "`n=== Final Status ===" -ForegroundColor Cyan
git status
