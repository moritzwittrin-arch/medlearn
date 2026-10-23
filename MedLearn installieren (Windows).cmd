@echo off
rem MedLearn-Installer fuer Windows: startet das PowerShell-Skript im Ordner "install".
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install\install-windows.ps1"
if errorlevel 1 pause
