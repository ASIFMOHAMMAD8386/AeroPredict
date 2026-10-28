@echo off
cd /d "%~dp0"
node public-share.mjs
if errorlevel 1 pause
