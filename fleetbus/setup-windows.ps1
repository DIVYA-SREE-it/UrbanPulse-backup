$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (!(Test-Path '.venv\Scripts\python.exe')) {
    py -3.12 -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Python 3.12 venv creation failed. Check py -0p.' }
}
$PythonExe = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
& $PythonExe -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw 'pip update failed.' }
# Compatible CUDA-enabled PyTorch baseline for the repository-pinned Ultralytics 8.3.0.
& $PythonExe -m pip install torch==2.5.1 torchvision==0.20.1 --index-url https://download.pytorch.org/whl/cu124
if ($LASTEXITCODE -ne 0) { throw 'CUDA PyTorch installation failed.' }
& $PythonExe -m pip install -r backend\requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed.' }
npm ci
if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
& $PythonExe backend\preflight.py --inference
if ($LASTEXITCODE -ne 0) { Write-Warning 'Preflight found missing assets or runtime errors. Read the JSON above before the demo.' }
