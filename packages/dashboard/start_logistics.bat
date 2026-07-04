@echo off
title Shipment Dashboard Launcher
echo 1/2: Sincronizando datos de Almacenes Externos...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\xpall\Source\Main\Shipment-Dashboard\scripts\sync_external_warehouses.ps1"

echo.
echo 2/2: Iniciando Shipment Dashboard...
cd /d "C:\Users\xpall\Source\Main\Shipment-Dashboard"

start "" "http://localhost:3000/Control-Tower/Shipment-Dashboard/"
npm run dev

pause
