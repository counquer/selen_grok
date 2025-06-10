@echo off
echo Iniciando servidor de Selen-Grok...
start cmd /k "cd /d E:\Proyectos\Selen-Grok && npm run dev"

echo Esperando 5 segundos para que el servidor se inicie...
timeout /t 5

echo Ejecutando prueba en http://localhost:3000/api/selen...
powershell -Command "try { $body = @{ trigger = \"cochina ven a mi\" } | ConvertTo-Json; $response = Invoke-WebRequest -Uri http://localhost:3000/api/selen -Method Post -Body $body -ContentType \"application/json\"; Write-Host \"Prueba exitosa. Estado: \" $response.StatusCode -ForegroundColor Green; Write-Host \"Respuesta: \" $response.Content -ForegroundColor Green } catch { Write-Host \"Error en la prueba: \" $_.Exception.Message -ForegroundColor Red }"

echo Revisa los logs para detalles...
if exist logs\combined.log start notepad logs\combined.log
if exist logs\error.log start notepad logs\error.log
if not exist logs\combined.log echo Logs no encontrados. Verifica la carpeta logs.
pause