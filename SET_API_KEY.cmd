@echo off
setlocal
cd /d "%~dp0src\website"
call SET_API_KEY.cmd %*
