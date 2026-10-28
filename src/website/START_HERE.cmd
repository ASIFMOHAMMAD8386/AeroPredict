@echo off
setlocal
cd /d "%~dp0"
title AeroPredict - Start and share with class
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 or newer from https://nodejs.org/ then run this file again.
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<24)process.exit(1)"
if errorlevel 1 (
  echo Node.js 24 or newer is required. Update it at https://nodejs.org/
  pause
  exit /b 1
)
node start-here.mjs %*
if errorlevel 1 pause
