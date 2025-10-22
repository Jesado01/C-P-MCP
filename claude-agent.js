require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs-extra');
const path = require('path');

class ClaudePlaywrightAgent {
  constructor(apiKey) {
    this.client = new Anthropic({ apiKey });
    this.mcpProcess = null;
    this.conversationHistory = [];
    this.outputDir = path.join(__dirname, 'output');
    this.sessionId = Date.now();
    this.ensureOutputDirs();
  }

  ensureOutputDirs() {
    // Solo logs y conversations en output/
    fs.ensureDirSync(path.join(this.outputDir, 'logs'));
    fs.ensureDirSync(path.join(this.outputDir, 'conversations'));
    
    // Tests en el folder de Playwright
    fs.ensureDirSync(path.join(__dirname, 'tests'));
  }

  async startMCPServer() {
    console.log('🚀 Iniciando servidor MCP...');
    this.mcpProcess = spawn('node', ['playwright-mcp-server.js'], {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('✅ Servidor MCP iniciado\n');
        this.logSession('=== NUEVA SESIÓN INICIADA ===');
        resolve();
      }, 1000);
    });
  }

  async sendToMCP(toolName, args) {
    return new Promise((resolve, reject) => {
      const request = JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: toolName, arguments: args }
      }) + '\n';

      let response = '';
      
      const onData = (data) => {
        response += data.toString();
        if (response.includes('\n')) {
          this.mcpProcess.stdout.off('data', onData);
          try {
            const result = JSON.parse(response.trim());
            resolve(result.result);
          } catch (e) {
            reject(e);
          }
        }
      };

      this.mcpProcess.stdout.on('data', onData);
      this.mcpProcess.stdin.write(request);
    });
  }

  async chat(userMessage) {
    console.log(`\n👤 Tú: ${userMessage}`);
    console.log('🤖 Claude está pensando...\n');

    this.logSession(`\n[USER] ${userMessage}`);

    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8096,

system: `Eres un asistente experto en automatización de pruebas con Playwright.

🔐 PERFILES DE CREDENCIALES DISPONIBLES:

📱 PERFIL TELÉFONO:
- Número: ${process.env.PROFILE_PHONE_NUMERO || 'No configurado'}
- Password: ${process.env.PROFILE_PHONE_PASSWORD || 'No configurado'}

📧 PERFIL EMAIL:
- Email: ${process.env.PROFILE_EMAIL_EMAIL || 'No configurado'}
- Password: ${process.env.PROFILE_EMAIL_PASSWORD || 'No configurado'}

👤 PERFIL USERNAME:
- Username: ${process.env.PROFILE_USER_USERNAME || 'No configurado'}
- Password: ${process.env.PROFILE_USER_PASSWORD || 'No configurado'}

📋 INSTRUCCIONES:

1. El usuario te dirá QUÉ PERFIL usar:
   - "usa perfil teléfono" → PROFILE_PHONE_*
   - "usa perfil email" → PROFILE_EMAIL_*
   - "usa perfil username" → PROFILE_USER_*

2. Si no especifica perfil, pregúntale: "¿Qué perfil uso: teléfono, email o username?"

3. Al generar código, usa SOLO las variables del perfil indicado:

EJEMPLO PERFIL TELÉFONO:
\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Login con Teléfono', () => {
  test('debe iniciar sesión exitosamente', async ({ page }) => {
    await page.goto('URL');
    
    // Usar PROFILE_PHONE_*
    await page.fill('#telefono', process.env.PROFILE_PHONE_NUMERO!);
    await page.fill('#password', process.env.PROFILE_PHONE_PASSWORD!);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/dashboard/);
  });
});
\`\`\`

GUARDAR_CODIGO:login-telefono.spec.ts

EJEMPLO PERFIL EMAIL:
\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Login con Email', () => {
  test('debe iniciar sesión exitosamente', async ({ page }) => {
    await page.goto('URL');
    
    // Usar PROFILE_EMAIL_*
    await page.fill('#email', process.env.PROFILE_EMAIL_EMAIL!);
    await page.fill('#password', process.env.PROFILE_EMAIL_PASSWORD!);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/dashboard/);
  });
});
\`\`\`

GUARDAR_CODIGO:login-email.spec.ts

EJEMPLO PERFIL USERNAME:
\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Login con Username', () => {
  test('debe iniciar sesión exitosamente', async ({ page }) => {
    await page.goto('URL');
    
    // Usar PROFILE_USER_*
    await page.fill('#username', process.env.PROFILE_USER_USERNAME!);
    await page.fill('#password', process.env.PROFILE_USER_PASSWORD!);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/dashboard/);
  });
});
\`\`\`

GUARDAR_CODIGO:login-username.spec.ts

4. NUNCA escribas credenciales directamente en el código
5. Siempre usa process.env.PROFILE_[TIPO]_[CAMPO]

Siempre responde en español.`,
      messages: this.conversationHistory
    });

    const assistantMessage = response.content[0].text;
    
    this.logSession(`[CLAUDE] ${assistantMessage}`);

    this.conversationHistory.push({
      role: 'assistant',
      content: assistantMessage
    });

    await this.saveGeneratedCode(assistantMessage);

    const cleanMessage = assistantMessage.replace(/GUARDAR_CODIGO:.+$/gm, '').trim();
    console.log(`🤖 Claude: ${cleanMessage}\n`);

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
        
        // Guardar directamente en tests/ (Playwright)
        const filepath = path.join(__dirname, 'tests', filename);
        
        try {
          await fs.writeFile(filepath, code, 'utf8');
          console.log(`\n💾 ✅ Test guardado en: tests/${filename}\n`);
          this.logSession(`Test guardado: tests/${filename}`);
        } catch (error) {
          console.error(`❌ Error guardando: ${error.message}`);
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
        console.log('❌ Error:', e.message);
      }
    } else if (command.startsWith('click ')) {
      const selector = command.replace('click ', '');
      try {
        const result = await this.sendToMCP('click', { selector });
        console.log('✅', result.content[0].text);
      } catch (e) {
        console.log('❌ Error:', e.message);
      }
    } else if (command.startsWith('fill ')) {
      const [_, selector, ...textParts] = command.split(' ');
      const text = textParts.join(' ');
      try {
        const result = await this.sendToMCP('fill', { selector, text });
        console.log('✅', result.content[0].text);
      } catch (e) {
        console.log('❌ Error:', e.message);
      }
    } else if (command === 'info') {
      try {
        const result = await this.sendToMCP('getPageInfo', {});
        console.log('📄', result.content[0].text);
      } catch (e) {
        console.log('❌ Error:', e.message);
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

  async startInteractive() {
    await this.startMCPServer();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('=================================');
    console.log('🎭 Claude + Playwright MCP Agent');
    console.log('=================================\n');
    console.log('📁 Estructura:');
    console.log('   ✅ tests/ - Tests de Playwright');
    console.log('   ✅ output/logs/ - Logs de sesión');
    console.log('   ✅ output/conversations/ - Historial\n');
    console.log('Comandos:');
    console.log('  - "genera pruebas para [funcionalidad]"');
    console.log('  - navigate <url>');
    console.log('  - click <selector>');
    console.log('  - fill <selector> <texto>');
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
          console.log('\n👋 Tests guardados en tests/');
          console.log('📊 Logs en output/logs/');
          console.log('💬 Conversaciones en output/conversations/\n');
          console.log('▶️  Ejecuta: npx playwright test\n');
          process.exit(0);
        }

        if (command.startsWith('navigate') || 
            command.startsWith('click') || 
            command.startsWith('fill') ||
            command === 'info') {
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

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('❌ Configura ANTHROPIC_API_KEY en .env');
  process.exit(1);
}

const agent = new ClaudePlaywrightAgent(apiKey);
agent.startInteractive();