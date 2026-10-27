' Faheem AI ko bina kaali window ke chalata hai (startup aur shortcut ke liye).
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
args = ""
If WScript.Arguments.Count > 0 Then args = " " & WScript.Arguments(0)
CreateObject("WScript.Shell").Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & dir & "\tray.ps1""" & args, 0, False
