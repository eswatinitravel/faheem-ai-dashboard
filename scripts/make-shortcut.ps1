$root = Split-Path -Parent $PSScriptRoot
$shell = New-Object -ComObject WScript.Shell
$targets = @(
  [Environment]::GetFolderPath("Desktop"),
  (Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs")
)
foreach ($dir in $targets) {
  $lnk = $shell.CreateShortcut((Join-Path $dir "Faheem AI.lnk"))
  $lnk.TargetPath = Join-Path $root "START.bat"
  $lnk.WorkingDirectory = $root
  $lnk.WindowStyle = 7
  $lnk.IconLocation = (Join-Path $root "public\icon.ico")
  $lnk.Description = "Faheem AI Dashboard"
  $lnk.Save()
}
Write-Host "Shortcuts ready."
