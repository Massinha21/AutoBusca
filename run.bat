@echo off
title AutoBusca

cd /d "%~dp0"

echo Verificando dependencias...
venv\Scripts\pip.exe install -r requirements.txt

echo Abrindo o navegador...
start http://localhost:5000

echo Iniciando o servidor...
venv\Scripts\python.exe app.py

pause
