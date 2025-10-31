# Frontend Integration Guide

## Overview

El frontend ahora está **completamente integrado** con el backend de Claude Agent API usando WebSocket y REST API.

## ✅ Qué Se Implementó

### 1. **Servicios de Integración**

- `src/services/websocket.ts` - Servicio de WebSocket para comunicación en tiempo real
- `src/services/api.ts` - Servicio REST API para control del agente
- `src/hooks/useAgent.ts` - Hook React personalizado para usar el agente

### 2. **Funcionalidades**

- ✅ **Iniciar/Detener agente** desde la UI
- ✅ **Estado del agente en tiempo real** (Running/Stopped, PID, WebSocket status)
- ✅ **Comunicación bidireccional** vía WebSocket
- ✅ **Mensajes en tiempo real** de Claude
- ✅ **Notificaciones** cuando se guardan archivos
- ✅ **Visualización de uso de herramientas** (navigate, getPageInfo, etc.)
- ✅ **Manejo de errores** completo

### 3. **UI Mejorada**

- Botón **Iniciar/Detener Agente** en el header
- Badges de estado (**Running**, **WebSocket**, **PID**)
- Notificaciones toast para eventos importantes
- Deshabilitación automática del input cuando el agente no está activo

## 🚀 Cómo Usar

### Paso 1: Iniciar el Backend

```bash
# Terminal 1: Iniciar FastAPI
cd /Users/adolfocoronado/Desktop/C-P-MCP/api
python main.py
```

Deberías ver:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Paso 2: Iniciar el Frontend

```bash
# Terminal 2: Iniciar Vite
cd /Users/adolfocoronado/Desktop/C-P-MCP/Front-end
npm install  # Solo la primera vez
npm run dev
```

Deberías ver:
```
  VITE v5.4.19  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Paso 3: Usar la Aplicación

1. **Abre el navegador** en `http://localhost:5173`
2. **Click en "Iniciar Agente"** en el header
3. Espera a que aparezca el badge **🟢 Running** y **🔗 WebSocket**
4. **Escribe un mensaje** como: `"Abre https://www.saucedemo.com y genera tests de login"`
5. **Ve la magia en tiempo real** 🎉

## 📊 Tipos de Mensajes del Agente

El frontend maneja automáticamente diferentes tipos de mensajes:

| Tipo | Descripción | Acción en UI |
|------|-------------|--------------|
| `ready` | Agente listo | Toast notification |
| `log` | Logs del agente | Console (opcional: mostrar en UI) |
| `user_message` | Echo del mensaje del usuario | Ya está en UI |
| `tool_use` | Uso de herramienta MCP | Muestra en chat |
| `tool_result` | Resultado de herramienta | Console log |
| `response` | Respuesta final de Claude | Muestra en chat |
| `file_saved` | Archivo guardado | Toast + lista de archivos |
| `error` | Error del agente | Toast de error |

## 🔧 Configuración

### Cambiar URL del Backend

Si tu backend está en otra dirección, edita:

**`src/services/websocket.ts`:**
```typescript
constructor(url: string = 'ws://YOUR_BACKEND:8000/ws')
```

**`src/services/api.ts`:**
```typescript
const API_BASE_URL = 'http://YOUR_BACKEND:8000';
```

### Cambiar Tiempo de Reconexión

**`src/services/websocket.ts`:**
```typescript
private maxReconnectAttempts = 5;  // Número de intentos
private reconnectDelay = 2000;      // Delay en ms
```

## 🎯 Flujo de Comunicación

```
Frontend                WebSocket               Backend
   │                        │                       │
   │  1. Click "Iniciar"    │                       │
   │──────────────────────────────REST POST────────>│
   │                        │                (spawn agent)
   │<─────────────────────────────200 OK────────────│
   │                        │                       │
   │  2. Connect WebSocket  │                       │
   │────────────────────────>│                       │
   │<─────────────────────── │ ←──────{"type":"ready"}
   │                        │                       │
   │  3. Send Message       │                       │
   │──────────────REST POST────────────────────────>│
   │                        │                (forward to agent)
   │                        │                       │
   │  4. Receive Updates    │                       │
   │<─────────────────────── │ ←──{"type":"log"}────│
   │<─────────────────────── │ ←──{"type":"tool_use"}
   │<─────────────────────── │ ←──{"type":"response"}
```

## 🐛 Troubleshooting

### Backend no se conecta

**Error:** `Failed to check API status`

**Solución:**
```bash
# Verifica que el backend esté corriendo
curl http://localhost:8000/

# Debería devolver:
# {"name":"Claude MCP Agent API","version":"1.0.0","status":"running"}
```

### WebSocket no conecta

**Error:** `WebSocket connection failed`

**Solución:**
1. Verifica que el agente esté corriendo: `GET /api/status`
2. Verifica que no haya firewall bloqueando WebSocket
3. Revisa la consola del navegador para ver el error exacto

### El agente no responde

**Problema:** El agente se inicia pero no responde a mensajes

**Solución:**
1. Revisa la terminal del backend para ver errores
2. Verifica que el `.env` tenga `ANTHROPIC_API_KEY`
3. Verifica los logs en `output/logs/session_*.log`

## 📝 Testing

### Test Manual Rápido

1. Abre DevTools Console (F12)
2. Verifica que veas:
   ```
   [WebSocket] Connected to Claude Agent API
   [WebSocket] Received: ready {...}
   ```
3. Envía un mensaje de prueba
4. Deberías ver:
   ```
   [WebSocket] Sent: {type: "user_message", content: "..."}
   [WebSocket] Received: log {...}
   [WebSocket] Received: response {...}
   ```

### Test con cURL (Backend)

```bash
# Start agent
curl -X POST http://localhost:8000/api/agent/start

# Send message
curl -X POST http://localhost:8000/api/agent/message \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'

# Check status
curl http://localhost:8000/api/status
```

## 🎉 Features Adicionales Posibles

Ideas para mejorar:

- [ ] **Historial de conversaciones** guardado en localStorage
- [ ] **Exportar conversaciones** como Markdown
- [ ] **Ver código generado** en un panel lateral
- [ ] **Descargar tests** desde la UI
- [ ] **Ejecutar tests** desde la UI
- [ ] **Modo oscuro** automático
- [ ] **Configuración de perfil** (PHONE/EMAIL/USERNAME)
- [ ] **Múltiples sesiones** simultáneas

## 🔒 Seguridad

**IMPORTANTE:**

- El `ANTHROPIC_API_KEY` está en el **backend**, no en el frontend ✅
- El frontend NO puede acceder directamente a la API de Claude ✅
- Toda comunicación pasa por tu backend controlado ✅

Para producción, considera:
- Agregar autenticación (JWT, OAuth)
- Rate limiting
- CORS configurado específicamente (no `*`)
- HTTPS obligatorio

---

**¡El frontend está listo para producción!** 🚀
