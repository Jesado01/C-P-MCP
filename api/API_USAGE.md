# Claude Playwright MCP API - Usage Guide

## Overview

The Claude Playwright Agent now supports two modes:

1. **Interactive Mode** (CLI) - Original terminal-based interface
2. **API Mode** (NEW) - FastAPI backend for web integration

## Starting the API Server

### 1. Install Python Dependencies

```bash
cd api
pip install -r requirements.txt
```

### 2. Make Sure Node Dependencies are Installed

```bash
cd ..
npm install
```

### 3. Configure Environment Variables

Make sure your `.env` file in the project root has:

```bash
ANTHROPIC_API_KEY=your_api_key_here
PROFILE_PHONE_NUMERO=5551234567
PROFILE_PHONE_PASSWORD=YourPassword123
```

### 4. Start the FastAPI Server

```bash
cd api
python main.py
```

The API will be available at: `http://localhost:8000`

## API Endpoints

### Health Check

```bash
GET /
```

Returns API status and version.

### Get Agent Status

```bash
GET /api/status
```

Returns:
```json
{
  "is_running": false,
  "connected_clients": 0,
  "pid": null
}
```

### Start the Agent

```bash
POST /api/agent/start
```

Starts the Claude agent with MCP server.

Response:
```json
{
  "status": "started",
  "message": "Agent started successfully",
  "pid": 12345
}
```

### Send a Message to the Agent

```bash
POST /api/agent/message
Content-Type: application/json

{
  "message": "Abre https://www.saucedemo.com y genera pruebas de login"
}
```

Response:
```json
{
  "status": "sent",
  "message": "Message sent to agent",
  "timestamp": "2025-10-31T12:00:00"
}
```

### Stop the Agent

```bash
POST /api/agent/stop
```

Response:
```json
{
  "status": "stopped",
  "message": "Agent stopped successfully"
}
```

### Restart the Agent

```bash
POST /api/agent/restart
```

## WebSocket Connection

For real-time updates, connect to the WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onopen = () => {
  console.log('Connected to agent');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Message from agent:', data);
};

// Send a message to the agent
ws.send(JSON.stringify({
  type: 'user_message',
  content: 'Abre https://example.com y genera tests'
}));
```

## Message Types from Agent

The agent sends different types of messages via WebSocket:

### 1. Ready Signal
```json
{
  "type": "ready",
  "sessionId": 1730000000000,
  "timestamp": "2025-10-31T12:00:00"
}
```

### 2. Log Messages
```json
{
  "type": "log",
  "message": "🚀 Iniciando servidor MCP...",
  "timestamp": "2025-10-31T12:00:00"
}
```

### 3. Tool Use
```json
{
  "type": "tool_use",
  "tool": "navigate",
  "args": {"url": "https://example.com"},
  "timestamp": "2025-10-31T12:00:00"
}
```

### 4. Tool Result
```json
{
  "type": "tool_result",
  "tool": "navigate",
  "result": "Navegado a https://example.com",
  "timestamp": "2025-10-31T12:00:00"
}
```

### 5. File Saved
```json
{
  "type": "file_saved",
  "filepath": "tests/login.spec.ts",
  "timestamp": "2025-10-31T12:00:00"
}
```

### 6. Response (Final Answer)
```json
{
  "type": "response",
  "content": "He generado las pruebas de login...",
  "hasCode": true,
  "savedFiles": ["tests/login.spec.ts"],
  "timestamp": "2025-10-31T12:00:00"
}
```

### 7. Error
```json
{
  "type": "error",
  "error": "Error message here",
  "timestamp": "2025-10-31T12:00:00"
}
```

## Testing the API

### Using cURL

```bash
# Start the agent
curl -X POST http://localhost:8000/api/agent/start

# Check status
curl http://localhost:8000/api/status

# Send a message
curl -X POST http://localhost:8000/api/agent/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Abre https://www.saucedemo.com y genera tests"}'

# Stop the agent
curl -X POST http://localhost:8000/api/agent/stop
```

### Using Python

```python
import requests
import json

BASE_URL = "http://localhost:8000"

# Start agent
response = requests.post(f"{BASE_URL}/api/agent/start")
print(response.json())

# Send message
response = requests.post(
    f"{BASE_URL}/api/agent/message",
    json={"message": "Abre https://example.com y genera tests"}
)
print(response.json())

# Check status
response = requests.get(f"{BASE_URL}/api/status")
print(response.json())
```

## Interactive Mode (CLI)

The original interactive mode still works:

```bash
# Run without --api flag
node claude-agent-api.js
```

This starts the readline interface for direct terminal interaction.

## Architecture

```
┌─────────────┐
│   Frontend  │
│  (Browser)  │
└──────┬──────┘
       │ HTTP/WebSocket
       ▼
┌─────────────┐
│   FastAPI   │
│  (Python)   │
└──────┬──────┘
       │ stdin/stdout (JSON)
       ▼
┌─────────────────────┐
│ claude-agent-api.js │
│    (--api mode)     │
└──────┬──────────────┘
       │ JSON-RPC
       ▼
┌─────────────────────┐
│ playwright-mcp-     │
│    server.js        │
└─────────────────────┘
```

## Troubleshooting

### Agent Won't Start

1. Check that `ANTHROPIC_API_KEY` is set in `.env`
2. Verify Node.js dependencies: `npm install`
3. Check logs in `output/logs/`

### No Response from Agent

1. Check WebSocket connection
2. Verify agent is running: `GET /api/status`
3. Check that the message format is correct (JSON with `type` and `content`)

### Agent Crashes

1. Check stderr output from the API server
2. Look at session logs in `output/logs/session_*.log`
3. Try restarting: `POST /api/agent/restart`

## Generated Files

Test files are saved in the `tests/` directory and can be executed:

```bash
npx playwright test tests/generated_test_*.spec.ts
```

## CORS

By default, the API allows all origins (`*`). For production, update the CORS settings in `api/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Update this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
