@echo off
cd /d "%~dp0"
node public-stop.mjs
node stop.mjs
if errorlevel 1 pause
