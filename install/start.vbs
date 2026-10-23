' MedLearn starten (Windows) - ohne sichtbares Fenster.
' Laeuft MedLearn schon, wird nur der Browser geoeffnet.
Option Explicit
Dim sh, fso, app, url, http, running, node, env
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
app = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
url = "http://localhost:3210"

running = False
On Error Resume Next
Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
http.setTimeouts 1500, 1500, 1500, 1500
http.open "GET", url & "/api/version", False
http.send
If Err.Number = 0 Then
  If http.status = 200 Then running = True
End If
Err.Clear
On Error GoTo 0

If running Then
  sh.Run url
  WScript.Quit
End If

node = app & "\runtime\node\node.exe"
If Not fso.FileExists(node) Then node = "node"
If Not fso.FolderExists(app & "\data") Then fso.CreateFolder(app & "\data")

Set env = sh.Environment("Process")
env("PATH") = app & "\runtime\node;" & sh.ExpandEnvironmentStrings("%USERPROFILE%") & "\.local\bin;" & env("PATH")
env("MEDLEARN_LOG") = app & "\data\server.log"
sh.CurrentDirectory = app
' 0 = Fenster verstecken, False = nicht warten. Der Server oeffnet den Browser selbst.
sh.Run """" & node & """ --disable-warning=ExperimentalWarning server\index.js", 0, False
