@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Moy almashtirish tizimi
rem Claude (rasmdan kiritish) kutubxonasi — internet bo'lsa bir marta o'rnatiladi, bo'lmasa o'tkazib yuboriladi
python -c "import anthropic" 2>nul || python -m pip install --quiet anthropic 2>nul
python server.py
if errorlevel 1 py server.py
pause
