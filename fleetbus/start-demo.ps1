$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$PythonExe = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
$BackendDir = Join-Path $PSScriptRoot 'backend'
if (!(Test-Path $PythonExe)) { throw 'Run setup-windows.ps1 first, or use your existing venv with the manual commands in SPRINT_README.md.' }
if (!(Test-Path 'node_modules')) { throw 'Run npm ci first.' }
# Exactly one edge process; do not use --reload or multiple uvicorn workers.
$CentralProcess = Start-Process -FilePath $PythonExe -WorkingDirectory $BackendDir -ArgumentList '-m uvicorn app.main:app --host 127.0.0.1 --port 8000' -PassThru
$EdgeProcess = Start-Process -FilePath $PythonExe -WorkingDirectory $BackendDir -ArgumentList '-m uvicorn edge.main:app --host 127.0.0.1 --port 8001' -PassThru
try {
    Write-Host 'Central: http://127.0.0.1:8000/health'
    Write-Host 'Edge status: http://127.0.0.1:8001/api/status'
    Write-Host 'Frontend: http://localhost:5173'
    npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
} finally {
    foreach ($DemoProcess in @($CentralProcess, $EdgeProcess)) {
        if (!$DemoProcess.HasExited) { Stop-Process -Id $DemoProcess.Id }
    }
}
