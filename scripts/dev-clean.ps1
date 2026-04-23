# Kills stale Next.js dev processes, removes the Next.js dev lock, then starts the dev server.
param([int]$Port = 3000)

$nextDevProcesses = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq 'node.exe' -and $_.CommandLine -match 'next(\\|/)dist\\bin\\next\\s+dev|next dev'
}

if ($nextDevProcesses) {
  Write-Host "Stopping existing next dev processes..."
  $nextDevProcesses | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Milliseconds 750
}

$listening = netstat -ano | Select-String ":$Port\s.*LISTENING"
if ($listening) {
  $portPid = ($listening -split '\s+')[-1]
  Write-Host "Freeing port $Port (PID $portPid)..."
  Stop-Process -Id $portPid -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 400
}

$lockPath = Join-Path $PSScriptRoot "..\\.next\\dev\\lock"
if (Test-Path $lockPath) {
  Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 250
  if (Test-Path $lockPath) {
    Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
  }
  if (-not (Test-Path $lockPath)) {
    Write-Host "Removed stale Next.js dev lock."
  }
}

Write-Host "Starting Next.js dev server on port $Port..."
& npx next dev --port $Port
