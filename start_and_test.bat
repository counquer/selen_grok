@echo off
setlocal EnableDelayedExpansion

:: CONFIGURACION
set "baseDir=E:\Proyectos\Selen-Grok"
set "csvPath=%baseDir%\Memorias\DB_TRIGGERS.csv"
set "logPath=%baseDir%\logs"
set "trigger=selen"

:: ASEGURAR DIRECTORIO DE LOGS
if not exist "%logPath%" (
    echo [INFO] Creando carpeta de logs en %logPath%
    mkdir "%logPath%"
)

echo [INFO] Verificando existencia del archivo CSV...
if not exist "%csvPath%" (
    echo [ERROR] El archivo no existe en: %csvPath%
    echo [%date% %time%] [ERROR] CSV no encontrado: %csvPath% >> "%logPath%\error.log"
    pause
    exit /b 1
)
echo [OK] Archivo CSV encontrado.

echo [INFO] Verificando si el trigger "%trigger%" existe en la columna "Clave" del CSV...
powershell -Command ^
  "$csv = Import-Csv -Path '%csvPath%' -Delimiter ','; " ^
  "$match = $csv | Where-Object { $_.Clave -and $_.Clave.Trim().ToLower() -eq '%trigger%' }; " ^
  "if ($match) { Write-Host '[OK] Trigger encontrado en el CSV.' -ForegroundColor Green } else { " ^
  "  Write-Host '[ERROR] Trigger no encontrado en el CSV.' -ForegroundColor Red; " ^
  "  Add-Content -Path '%logPath%\error.log' -Value ('[' + (Get-Date -Format o) + '] [ERROR] Trigger no encontrado: %trigger%'); exit 1 }"

echo [INFO] Iniciando servidor Selen-Grok en segundo plano...
cd /d "%baseDir%"
start "" /B cmd /c "npm run dev > nul 2>&1"

echo [INFO] Esperando 5 segundos para que el servidor se levante...
timeout /t 5 /nobreak >nul

echo [INFO] Verificando que el puerto 3000 esté activo...
powershell -Command ^
  "if (Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet) { " ^
  "  Write-Host '[OK] Puerto 3000 activo.' -ForegroundColor Green } else { " ^
  "  Write-Host '[ERROR] El servidor no responde en localhost:3000.' -ForegroundColor Red; " ^
  "  Add-Content -Path '%logPath%\error.log' -Value ('[' + (Get-Date -Format o) + '] [ERROR] Puerto 3000 no responde.'); exit 1 }"

echo [INFO] Ejecutando prueba de API con trigger "%trigger%"...
powershell -Command ^
  "$body = @{ trigger = '%trigger%' } | ConvertTo-Json -Compress; " ^
  "try { " ^
  "  $response = Invoke-WebRequest -Uri 'http://localhost:3000/api/selen' -Method POST -Body $body -ContentType 'application/json; charset=utf-8'; " ^
  "  Write-Host '[OK] Respuesta recibida. Estado HTTP:' $response.StatusCode -ForegroundColor Green; " ^
  "  Write-Host '[RESPUESTA]:' $response.Content -ForegroundColor Gray " ^
  "} catch { " ^
  "  Write-Host '[ERROR] Fallo la solicitud al endpoint.' -ForegroundColor Red; " ^
  "  if ($_.Exception.Response) { " ^
  "    $reader = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream()); " ^
  "    $errorContent = $reader.ReadToEnd(); " ^
  "    Write-Host '[DETALLE]:' $errorContent -ForegroundColor Yellow; " ^
  "    Add-Content -Path '%logPath%\error.log' -Value ('[' + (Get-Date -Format o) + '] [ERROR] ' + $errorContent) " ^
  "  } else { " ^
  "    Write-Host '[DETALLE] No se obtuvo respuesta del servidor.' -ForegroundColor Yellow; " ^
  "    Add-Content -Path '%logPath%\error.log' -Value ('[' + (Get-Date -Format o) + '] [ERROR] No se obtuvo respuesta del servidor.') " ^
  "  } }"

echo [INFO] Revision de logs (si existen)...
if exist "%logPath%\combined.log" start notepad "%logPath%\combined.log"
if exist "%logPath%\error.log" start notepad "%logPath%\error.log"

echo [FINALIZADO] Proceso completo.
pause
