# v3.35 Phone HTTPS: laptop ke Wi-Fi IP ke liye apna (self-signed) certificate. Phone page ka mic HTTPS mangta hai.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
$ips = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notmatch 'vEthernet|VirtualBox|VMware|WSL|Docker|Loopback|Bluetooth|Tailscale' } |
  ForEach-Object { $_.IPAddress })
if (-not $ips) { Write-Host " Wi-Fi IP nahi mila. Pehle Wi-Fi se jurein."; exit 1 }
$san = '2.5.29.17={text}DNS=localhost&' + (($ips | ForEach-Object { 'IPAddress=' + $_ }) -join '&')
$c = New-SelfSignedCertificate -Subject 'CN=Faheem AI Phone' -TextExtension @($san) -CertStoreLocation 'Cert:\CurrentUser\My' -NotAfter (Get-Date).AddYears(2) -KeyExportPolicy Exportable
$p = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
New-Item -ItemType Directory -Force -Path 'data' | Out-Null
Export-PfxCertificate -Cert $c -FilePath 'data\phone-cert.pfx' -Password (ConvertTo-SecureString $p -AsPlainText -Force) | Out-Null
Set-Content -Path 'data\phone-cert.pass' -Value $p -NoNewline
Remove-Item ('Cert:\CurrentUser\My\' + $c.Thumbprint)
Write-Host (" Certificate bana: " + ($ips -join ', '))
