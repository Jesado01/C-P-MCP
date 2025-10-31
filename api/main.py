# api/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import json
import asyncio
import os
from typing import Optional, List
from datetime import datetime

app = FastAPI(title="Claude MCP Agent API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Estado global
class AgentManager:
    def __init__(self):
        self.process: Optional[subprocess.Popen] = None
        self.active_connections: List[WebSocket] = []
        self.is_running = False
        self.message_queue = asyncio.Queue()
        
    async def start(self):
        if self.is_running:
            return {"status": "already_running", "message": "Agent is already running"}
        
        try:
            # Iniciar el agente Node.js
            self.process = subprocess.Popen(
                ['node', '../claude-agent-api.js'],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                cwd=os.path.dirname(__file__)
            )
            
            self.is_running = True
            
            # Iniciar task para leer output
            asyncio.create_task(self._read_output())
            
            return {
                "status": "started",
                "message": "Agent started successfully",
                "pid": self.process.pid
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def _read_output(self):
        """Lee el output del agente y lo envía a los clientes conectados"""
        try:
            while self.is_running and self.process and self.process.poll() is None:
                line = self.process.stdout.readline()
                
                if line:
                    line = line.strip()
                    print(f"[AGENT] {line}")
                    
                    # Enviar a todos los clientes WebSocket
                    await self.broadcast({
                        "type": "agent_message",
                        "content": line,
                        "timestamp": datetime.now().isoformat()
                    })
                    
                await asyncio.sleep(0.1)
        except Exception as e:
            print(f"Error reading output: {e}")
            await self.broadcast({
                "type": "error",
                "content": str(e),
                "timestamp": datetime.now().isoformat()
            })
    
    async def send_message(self, message: str):
        """Envía un mensaje al agente"""
        if not self.is_running or not self.process:
            raise HTTPException(status_code=400, detail="Agent not running")
        
        try:
            # Enviar mensaje al agente
            self.process.stdin.write(message + '\n')
            self.process.stdin.flush()
            
            return {
                "status": "sent",
                "message": "Message sent to agent",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    async def stop(self):
        """Detiene el agente"""
        if not self.is_running:
            return {"status": "not_running", "message": "Agent is not running"}
        
        try:
            if self.process:
                self.process.stdin.write('exit\n')
                self.process.stdin.flush()
                
                # Esperar un momento para que termine gracefully
                await asyncio.sleep(1)
                
                if self.process.poll() is None:
                    self.process.terminate()
                    
                self.process = None
            
            self.is_running = False
            
            await self.broadcast({
                "type": "agent_stopped",
                "content": "Agent has been stopped",
                "timestamp": datetime.now().isoformat()
            })
            
            return {
                "status": "stopped",
                "message": "Agent stopped successfully"
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def broadcast(self, message: dict):
        """Envía un mensaje a todos los clientes conectados"""
        disconnected = []
        
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                disconnected.append(connection)
        
        # Remover conexiones muertas
        for conn in disconnected:
            self.active_connections.remove(conn)
    
    def add_connection(self, websocket: WebSocket):
        self.active_connections.append(websocket)
    
    def remove_connection(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

# Instancia global del manager
agent_manager = AgentManager()

# Modelos Pydantic
class MessageRequest(BaseModel):
    message: str

class StatusResponse(BaseModel):
    is_running: bool
    connected_clients: int
    pid: Optional[int] = None

# Endpoints REST

@app.get("/")
async def root():
    return {
        "name": "Claude MCP Agent API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/api/status", response_model=StatusResponse)
async def get_status():
    """Obtiene el estado actual del agente"""
    return StatusResponse(
        is_running=agent_manager.is_running,
        connected_clients=len(agent_manager.active_connections),
        pid=agent_manager.process.pid if agent_manager.process else None
    )

@app.post("/api/agent/start")
async def start_agent():
    """Inicia el agente MCP"""
    result = await agent_manager.start()
    return result

@app.post("/api/agent/stop")
async def stop_agent():
    """Detiene el agente MCP"""
    result = await agent_manager.stop()
    return result

@app.post("/api/agent/message")
async def send_message(request: MessageRequest):
    """Envía un mensaje al agente"""
    result = await agent_manager.send_message(request.message)
    return result

@app.post("/api/agent/restart")
async def restart_agent():
    """Reinicia el agente"""
    await agent_manager.stop()
    await asyncio.sleep(1)
    result = await agent_manager.start()
    return result

# WebSocket
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket para comunicación en tiempo real con el frontend"""
    await websocket.accept()
    agent_manager.add_connection(websocket)
    
    # Enviar mensaje de bienvenida
    await websocket.send_json({
        "type": "connection_established",
        "content": "Connected to Claude MCP Agent",
        "timestamp": datetime.now().isoformat()
    })
    
    try:
        while True:
            # Recibir mensajes del cliente
            data = await websocket.receive_text()
            
            try:
                message_data = json.loads(data)
                
                # Si el cliente envía un mensaje, reenviarlo al agente
                if message_data.get("type") == "user_message":
                    await agent_manager.send_message(message_data.get("content", ""))
                    
            except json.JSONDecodeError:
                # Si no es JSON, enviarlo directamente
                await agent_manager.send_message(data)
                
    except WebSocketDisconnect:
        agent_manager.remove_connection(websocket)
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        agent_manager.remove_connection(websocket)

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup al cerrar el servidor"""
    await agent_manager.stop()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)