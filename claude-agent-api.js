require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs-extra');
const path = require('path');

class ClaudePlaywrightAgent {
  constructor(apiKey, isApiMode = false) {
    this.client = new Anthropic({ apiKey });
    this.mcpProcess = null;
    this.conversationHistory = [];
    this.outputDir = path.join(__dirname, 'output');
    this.sessionId = Date.now();
    this.pendingStdout = null;
    this.isApiMode = isApiMode;
    this.savedFiles = [];
    this.ensureOutputDirs();
  }

  ensureOutputDirs() {
    fs.ensureDirSync(path.join(this.outputDir, 'logs'));
    fs.ensureDirSync(path.join(this.outputDir, 'conversations'));
    fs.ensureDirSync(path.join(__dirname, 'tests'));
  }

  log(message, data = null) {
    if (this.isApiMode) {
      // In API mode, send structured JSON to stdout
      this.sendApiMessage({
        type: 'log',
        message,
        data,
        timestamp: new Date().toISOString()
      });
    } else {
      // In interactive mode, use console
      console.log(message, data || '');
    }
  }

  sendApiMessage(message) {
    if (this.isApiMode) {
      process.stdout.write(JSON.stringify(message) + '\n');
    }
  }

  async startMCPServer() {
    this.log('🚀 Iniciando servidor MCP...');
    this.log('[DEBUG] Spawning: node playwright-mcp-server.js');

    this.mcpProcess = spawn('node', ['playwright-mcp-server.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.mcpProcess.stderr.on('data', (data) => {
      if (!this.isApiMode) {
        console.error('[DEBUG] MCP stderr:', data.toString().trim());
      }
    });

    this.mcpProcess.on('error', (error) => {
      if (!this.isApiMode) {
        console.error('[DEBUG] ❌ MCP process error:', error);
      }
    });

    this.mcpProcess.on('exit', (code, signal) => {
      if (!this.isApiMode) {
        console.log(`[DEBUG] MCP process exited with code ${code}, signal ${signal}`);
      }
    });

    return new Promise((resolve) => {
      setTimeout(() => {
        this.log('✅ Servidor MCP iniciado\n');
        if (!this.isApiMode) {
          console.log('[DEBUG] MCP Process PID:', this.mcpProcess.pid);
        }
        this.logSession('=== NUEVA SESIÓN INICIADA ===');
        resolve();
      }, 2000);
    });
  }

  async sendToMCP(toolName, args) {
    if (!this.isApiMode) {
      console.log(`\n[DEBUG] Enviando a MCP: ${toolName}`, args);
    } else {
      this.sendApiMessage({
        type: 'tool_use',
        tool: toolName,
        args,
        timestamp: new Date().toISOString()
      });
    }
    
    return new Promise((resolve, reject) => {
      const request = JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: toolName, arguments: args }
      }) + '\n';

      if (!this.isApiMode) {
        console.log(`[DEBUG] Request:`, request.trim());
      }

      let response = '';
      const timeout = setTimeout(() => {
        if (!this.isApiMode) {
          console.log(`[DEBUG] ⏰ TIMEOUT`);
        }
        this.mcpProcess.stdout.removeListener('data', onData);
        reject(new Error('MCP timeout'));
      }, 30000);

      const onData = (data) => {
        const chunk = data.toString();
        if (!this.isApiMode) {
          console.log(`[DEBUG] Chunk recibido:`, chunk.substring(0, 200));
        }
        response += chunk;

        if (response.includes('\n')) {
          clearTimeout(timeout);
          this.mcpProcess.stdout.removeListener('data', onData);

          try {
            const result = JSON.parse(response.trim());
            if (!this.isApiMode) {
              console.log(`[DEBUG] ✅ JSON parseado OK`);
            }
            resolve(result.result);
          } catch (e) {
            if (!this.isApiMode) {
              console.error(`[DEBUG] ❌ Error parseando:`, e.message);
              console.error('[DEBUG] Respuesta completa:', response);
            }
            reject(e);
          }
        }
      };

      this.mcpProcess.stdout.on('data', onData);

      try {
        this.mcpProcess.stdin.write(request);
        if (!this.isApiMode) {
          console.log(`[DEBUG] ✅ Request enviado`);
        }
      } catch (error) {
        clearTimeout(timeout);
        this.mcpProcess.stdout.removeListener('data', onData);
        if (!this.isApiMode) {
          console.error(`[DEBUG] ❌ Error escribiendo:`, error);
        }
        reject(error);
      }
    });
  }

  async chat(userMessage) {
    if (userMessage === '' && this.conversationHistory.length > 0) {
      userMessage = 'continúa';
    }

    if (userMessage !== 'continúa') {
      if (!this.isApiMode) {
        console.log(`\n👤 Tú: ${userMessage}`);
        console.log('🤖 Claude está pensando...\n');
      } else {
        this.sendApiMessage({
          type: 'user_message',
          content: userMessage,
          timestamp: new Date().toISOString()
        });
      }
      this.logSession(`\n[USER] ${userMessage}`);

      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });
    }

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8096,
      
      tools: [
        {
          name: 'navigate',
          description: 'Navega a una URL en el navegador',
          input_schema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL a visitar' }
            },
            required: ['url']
          }
        },
        {
          name: 'getPageInfo',
          description: 'Obtiene información de la página actual',
          input_schema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'getText',
          description: 'Obtiene el texto de un elemento',
          input_schema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'Selector CSS' }
            },
            required: ['selector']
          }
        }
      ],
      
      system: `Eres un asistente experto en automatización de pruebas con Playwright.

Tienes herramientas para controlar el navegador:
- navigate(url): Navega a una página
- getPageInfo(): Obtiene info de la página
- getText(selector): Obtiene texto de elementos

USA estas herramientas para inspeccionar páginas y luego genera tests.

PERFILES:
📱 TELÉFONO: ${process.env.PROFILE_PHONE_NUMERO || 'No config'} / ${process.env.PROFILE_PHONE_PASSWORD || 'No config'}

Al generar código, usa process.env.PROFILE_PHONE_NUMERO y process.env.PROFILE_PHONE_PASSWORD

Marca el código con: GUARDAR_CODIGO:nombre.spec.ts

Responde en español.`,
      
      messages: this.conversationHistory
    });

    const toolUses = response.content.filter(c => c.type === 'tool_use');

    if (toolUses.length > 0) {
      if (!this.isApiMode) {
        console.log(`[DEBUG] Claude quiere usar ${toolUses.length} herramientas`);
      }

      this.conversationHistory.push({
        role: 'assistant',
        content: response.content
      });

      const toolResults = [];

      for (const toolUse of toolUses) {
        if (!this.isApiMode) {
          console.log(`🔧 ${toolUse.name}(${JSON.stringify(toolUse.input)})`);
        }

        try {
          const result = await this.sendToMCP(toolUse.name, toolUse.input);
          const resultText = result?.content?.[0]?.text || JSON.stringify(result);

          if (!this.isApiMode) {
            console.log(`✅ ${resultText.substring(0, 100)}...\n`);
          } else {
            this.sendApiMessage({
              type: 'tool_result',
              tool: toolUse.name,
              result: resultText.substring(0, 200),
              timestamp: new Date().toISOString()
            });
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: resultText
          });
        } catch (error) {
          if (!this.isApiMode) {
            console.error(`❌ ${error.message}\n`);
          } else {
            this.sendApiMessage({
              type: 'error',
              error: error.message,
              timestamp: new Date().toISOString()
            });
          }
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `Error: ${error.message}`,
            is_error: true
          });
        }
      }

      this.conversationHistory.push({
        role: 'user',
        content: toolResults
      });

      if (!this.isApiMode) {
        console.log('[DEBUG] Enviando resultados de vuelta a Claude...\n');
      }
      return await this.chat('continúa');
    }

    const textContent = response.content.find(c => c.type === 'text');
    const assistantMessage = textContent?.text || '';

    this.logSession(`[CLAUDE] ${assistantMessage}`);

    this.conversationHistory.push({
      role: 'assistant',
      content: response.content
    });

    // Reset saved files tracking for this response
    this.savedFiles = [];
    await this.saveGeneratedCode(assistantMessage);

    const cleanMessage = assistantMessage.replace(/GUARDAR_CODIGO:.+$/gm, '').trim();

    if (this.isApiMode) {
      // Send structured response in API mode
      this.sendApiMessage({
        type: 'response',
        content: cleanMessage,
        hasCode: this.savedFiles.length > 0,
        savedFiles: this.savedFiles,
        timestamp: new Date().toISOString()
      });
    } else {
      // Interactive mode output
      if (cleanMessage) {
        console.log(`🤖 Claude: ${cleanMessage}\n`);
      }
    }

    this.saveConversation();
    return assistantMessage;
  }

  async saveGeneratedCode(message) {
    const codeBlockRegex = /```(?:typescript|javascript|ts|js)\n([\s\S]*?)```/g;
    const matches = [...message.matchAll(codeBlockRegex)];

    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const code = matches[i][1];
        const filenameMatch = message.match(/GUARDAR_CODIGO:(\S+)/);
        const filename = filenameMatch
          ? filenameMatch[1]
          : `generated_test_${this.sessionId}_${i + 1}.spec.ts`;

        const filepath = path.join(__dirname, 'tests', filename);

        try {
          await fs.writeFile(filepath, code, 'utf8');
          this.savedFiles.push(`tests/${filename}`);

          if (!this.isApiMode) {
            console.log(`\n💾 ✅ Test: tests/${filename}\n`);
          } else {
            this.sendApiMessage({
              type: 'file_saved',
              filepath: `tests/${filename}`,
              timestamp: new Date().toISOString()
            });
          }
          this.logSession(`Test guardado: tests/${filename}`);
        } catch (error) {
          if (!this.isApiMode) {
            console.error(`❌ Error guardando: ${error.message}`);
          } else {
            this.sendApiMessage({
              type: 'error',
              error: `Error saving file: ${error.message}`,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    }
  }

  async executeCommand(command) {
    if (command.startsWith('navigate ')) {
      const url = command.replace('navigate ', '');
      try {
        const result = await this.sendToMCP('navigate', { url });
        console.log('✅', result.content[0].text);
      } catch (e) {
        console.log('❌', e.message);
      }
    } else if (command === 'info') {
      try {
        const result = await this.sendToMCP('getPageInfo', {});
        console.log('📄', result.content[0].text);
      } catch (e) {
        console.log('❌', e.message);
      }
    }
  }

  logSession(message) {
    const logFile = path.join(this.outputDir, 'logs', `session_${this.sessionId}.log`);
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
  }

  saveConversation() {
    const convFile = path.join(this.outputDir, 'conversations', `conversation_${this.sessionId}.json`);
    fs.writeJSONSync(convFile, {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      history: this.conversationHistory
    }, { spaces: 2 });
  }

  async startApiMode() {
    await this.startMCPServer();

    // Send ready signal
    this.sendApiMessage({
      type: 'ready',
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    });

    // Listen for messages on stdin
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      try {
        const message = JSON.parse(line);

        if (message.type === 'message' || message.type === 'user_message') {
          await this.chat(message.content);
        } else if (message.type === 'command') {
          await this.executeCommand(message.content);
        } else if (message.type === 'exit') {
          try {
            await this.sendToMCP('close', {});
            if (this.mcpProcess) {
              this.mcpProcess.kill();
            }
          } catch (e) {}
          this.sendApiMessage({
            type: 'shutdown',
            timestamp: new Date().toISOString()
          });
          process.exit(0);
        }
      } catch (error) {
        this.sendApiMessage({
          type: 'error',
          error: `Failed to parse message: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      }
    });

    rl.on('close', () => {
      try {
        if (this.mcpProcess) {
          this.mcpProcess.kill();
        }
      } catch (e) {}
      process.exit(0);
    });
  }

  async startInteractive() {
    await this.startMCPServer();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('=================================');
    console.log('🎭 Claude + Playwright MCP Agent');
    console.log('=================================\n');
    console.log('Comandos:');
    console.log('  - "Abre [URL] y genera tests"');
    console.log('  - navigate <url>');
    console.log('  - info');
    console.log('  - exit\n');

    const askQuestion = () => {
      rl.question('👤 Tú: ', async (input) => {
        const command = input.trim();

        if (command === 'exit') {
          try {
            await this.sendToMCP('close', {});
            this.mcpProcess.kill();
          } catch (e) {}
          rl.close();
          console.log('\n👋 Listo!\n');
          process.exit(0);
        }

        if (command.startsWith('navigate') || command === 'info') {
          await this.executeCommand(command);
        } else {
          await this.chat(command);
        }

        askQuestion();
      });
    };

    askQuestion();
  }
}

// Entry point
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('❌ Configura ANTHROPIC_API_KEY en .env');
  process.exit(1);
}

// Check for --api flag
const isApiMode = process.argv.includes('--api');

const agent = new ClaudePlaywrightAgent(apiKey, isApiMode);

if (isApiMode) {
  // API mode: communicate via stdin/stdout JSON
  agent.startApiMode();
} else {
  // Interactive mode: readline interface
  agent.startInteractive();
}