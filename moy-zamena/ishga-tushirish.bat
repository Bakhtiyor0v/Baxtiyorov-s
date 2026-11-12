@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Moy almashtirish tizimi
python server.py
if errorlevel 1 py server.py
pause
