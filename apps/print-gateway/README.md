# Lorito Print Gateway para Windows

## Publicar e instalar

En una máquina con .NET 10 SDK y PowerShell:

```powershell
.\publish.ps1
```

El resultado contiene `publish\win-x86` y `publish\win-x64`. Elegir según la arquitectura de Windows; ambos paquetes son autocontenidos y no requieren instalar el runtime aparte.

Definir como variables de entorno del equipo `PRINT_BACKEND_URL`, `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` (todas las URLs deben ser HTTPS). `PRINT_GATEWAY_DATA_PATH` es opcional y por defecto es `%ProgramData%\Lorito\PrintGateway`.

Como administrador, registrar el servicio y conceder acceso a cada cola usada:

```powershell
.\install-service.ps1 -ExecutablePath 'C:\Lorito\win-x64\Lorito.PrintGateway.exe' -PrinterName 'Cocina'
```

El servicio `LoritoPrintGateway` usa la cuenta virtual `NT SERVICE\LoritoPrintGateway`, arranque automático y conserva vínculo, journal y logs en el directorio de datos. Para la bandeja, una vez por usuario estándar:

```powershell
.\install-tray-startup.ps1 -ExecutablePath 'C:\Lorito\win-x64\Lorito.PrintGateway.exe'
```

La bandeja se abre desde su icono; cerrar la ventana solo la oculta y no requiere elevación.

## Diagnóstico

- Servicio detenido: `Get-Service LoritoPrintGateway`; consultar `Get-WinEvent -LogName Application -ProviderName LoritoPrintGateway`.
- Cola inaccesible: confirmar nombre y volver a ejecutar `install-service.ps1 -PrinterName`; verificar acceso de la cuenta virtual.
- Credencial revocada o entorno distinto: volver a vincular desde la bandeja; no copiar `binding.dat` entre equipos o entornos.
- Almacenamiento inválido: revisar permisos de `%ProgramData%\Lorito\PrintGateway` sin borrar `binding.dat` ni `jobs`.
- Llamada nativa bloqueada: revisar `logs\gateway-AAAA-MM-DD.log`, la cola y el resultado físico antes de pedir otro envío. Un resultado incierto no promete cancelación ni recuperación automática.

Los logs diarios retienen siete días y no contienen códigos, credenciales, autorizaciones ni bytes imprimibles. Si no se pueden escribir, se intenta Windows Event Log. La rotación no toca el vínculo ni el journal.

## Matriz de validación

Registrar cada combinación ejecutada; `No probado` no equivale a aprobado.

| Edición/versión Windows | Arquitectura | Modelo/controlador | Conexión | Ancho | Resultado | Evidencia/fecha |
| --- | --- | --- | --- | --- | --- | --- |
| No probado | — | — | — | — | No probado | — |

Casos mínimos: Windows 10 x86/x64 y Windows 11 x64; USB, red y Bluetooth; térmicas de 58/80 mm; texto, imágenes, acentos, ñ y corte; reinicio sin sesión, cierre de sesión, cola desconectada y recuperación. La compatibilidad real de .NET 10 debe comprobarse por edición y versión: este documento no certifica Windows 10 ni ninguna impresora sin evidencia física.
