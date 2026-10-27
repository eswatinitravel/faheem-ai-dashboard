# Desktop + Start Menu shortcut, aur Startup (laptop on hote hi Faheem AI chale).
$root = Split-Path -Parent $PSScriptRoot
$shell = New-Object -ComObject WScript.Shell
$ico = Join-Path $root "public\icon.ico"
$targets = @(
  [Environment]::GetFolderPath("Desktop"),
  (Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs")
)
foreach ($dir in $targets) {
  $lnk = $shell.CreateShortcut((Join-Path $dir "Faheem AI.lnk"))
  $lnk.TargetPath = Join-Path $root "START.bat"
  $lnk.WorkingDirectory = $root
  $lnk.WindowStyle = 7
  $lnk.IconLocation = $ico
  $lnk.Description = "Faheem AI Dashboard"
  $lnk.Save()
}
$startup = [Environment]::GetFolderPath("Startup")
$s = $shell.CreateShortcut((Join-Path $startup "Faheem AI.lnk"))
$s.TargetPath = "$env:WINDIR\System32\wscript.exe"
$s.Arguments = "`"$root\scripts\tray.vbs`""
$s.WorkingDirectory = $root
$s.IconLocation = $ico
$s.Description = "Faheem AI - startup + taskbar icon"
$s.Save()
Write-Host "Shortcuts + startup ready."
