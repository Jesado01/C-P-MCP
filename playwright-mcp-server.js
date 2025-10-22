const { chromium } = require('playwright');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const fs = require('fs-extra');
const path = require('path');

class PlaywrightMCPServer {
  constructor() {
    this.browser = null;
    this.page = null;
    this.context = null;
    this.outputDir = path.join(__dirname, 'output');
    this.screenshotCounter = 0;
    this.server = new Server(
      {
        name: 'playwright-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.ensureOutputDirs();
    this.setupTools();
  }

  ensureOutputDirs() {
    fs.ensureDirSync(path.join(this.outputDir, 'logs'));
  }

  setupTools() {
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'navigate':
          return await this.navigate(args.url);
        case 'click':
          return await this.click(args.selector);
        case 'fill':
          return await this.fill(args.selector, args.text);
        case 'getText':
          return await this.getText(args.selector);
        case 'screenshot':
          return await this.screenshot(args.name);
        case 'getPageInfo':
          return await this.getPageInfo();
        case 'saveTest':
          return await this.saveTest(args.filename, args.code);
        case 'close':
          return await this.closeBrowser();
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });

    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'navigate',
            description: 'Navega a una URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'URL a visitar' }
              },
              required: ['url']
            }
          },
          {
            name: 'click',
            description: 'Hace click en un elemento',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string', description: 'Selector CSS' }
              },
              required: ['selector']
            }
          },
          {
            name: 'fill',
            description: 'Llena un campo de texto',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string', description: 'Selector CSS' },
                text: { type: 'string', description: 'Texto a escribir' }
              },
              required: ['selector', 'text']
            }
          },
          {
            name: 'getText',
            description: 'Obtiene el texto de un elemento',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string', description: 'Selector CSS' }
              },
              required: ['selector']
            }
          },
          {
            name: 'screenshot',
            description: 'Toma una captura de pantalla y la guarda',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Nombre del archivo (opcional)' }
              }
            }
          },
          {
            name: 'getPageInfo',
            description: 'Obtiene información de la página',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'saveTest',
            description: 'Guarda código de prueba en archivo',
            inputSchema: {
              type: 'object',
              properties: {
                filename: { type: 'string', description: 'Nombre del archivo' },
                code: { type: 'string', description: 'Código a guardar' }
              },
              required: ['filename', 'code']
            }
          },
          {
            name: 'close',
            description: 'Cierra el navegador',
            inputSchema: { type: 'object', properties: {} }
          }
        ]
      };
    });
  }

  async ensureBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({ 
        headless: false,
        videosPath: path.join(this.outputDir, 'videos')
      });
      this.context = await this.browser.newContext({
        recordVideo: {
          dir: path.join(this.outputDir, 'videos')
        }
      });
      this.page = await this.context.newPage();
    }
  }

  async navigate(url) {
    await this.ensureBrowser();
    await this.page.goto(url);
    const timestamp = new Date().toISOString();
    this.log(`[${timestamp}] Navegado a ${url}`);
    return { content: [{ type: 'text', text: `Navegado a ${url}` }] };
  }

  async click(selector) {
    await this.ensureBrowser();
    await this.page.click(selector);
    const timestamp = new Date().toISOString();
    this.log(`[${timestamp}] Click en ${selector}`);
    return { content: [{ type: 'text', text: `Click en ${selector}` }] };
  }

  async fill(selector, text) {
    await this.ensureBrowser();
    await this.page.fill(selector, text);
    const timestamp = new Date().toISOString();
    this.log(`[${timestamp}] Llenado ${selector} con "${text}"`);
    return { content: [{ type: 'text', text: `Llenado ${selector} con ${text}` }] };
  }

  async getText(selector) {
    await this.ensureBrowser();
    const text = await this.page.textContent(selector);
    const timestamp = new Date().toISOString();
    this.log(`[${timestamp}] Texto obtenido de ${selector}: "${text}"`);
    return { content: [{ type: 'text', text: text || '' }] };
  }

  async screenshot(name) {
    await this.ensureBrowser();
    this.screenshotCounter++;
    const filename = name || `screenshot_${this.screenshotCounter}_${Date.now()}.png`;
    const filepath = path.join(this.outputDir, 'screenshots', filename);
    
    await this.page.screenshot({ path: filepath, fullPage: true });
    const timestamp = new Date().toISOString();
    this.log(`[${timestamp}] Screenshot guardado: ${filepath}`);
    
    return { 
      content: [{ 
        type: 'text', 
        text: `Screenshot guardado en: output/screenshots/${filename}` 
      }] 
    };
  }

  async getPageInfo() {
    await this.ensureBrowser();
    const title = await this.page.title();
    const url = this.page.url();
    const content = await this.page.content();
    
    const info = { title, url, contentLength: content.length };
    const timestamp = new Date().toISOString();
    this.log(`[${timestamp}] Info obtenida: ${JSON.stringify(info)}`);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(info, null, 2)
      }]
    };
  }

  async saveTest(filename, code) {
    const filepath = path.join(this.outputDir, 'tests', filename);
    await fs.writeFile(filepath, code, 'utf8');
    const timestamp = new Date().toISOString();
    this.log(`[${timestamp}] Test guardado: ${filepath}`);
    
    return {
      content: [{
        type: 'text',
        text: `Test guardado en: output/tests/${filename}`
      }]
    };
  }

  log(message) {
    const logFile = path.join(this.outputDir, 'logs', `session_${this.getDateString()}.log`);
    const logMessage = `${message}\n`;
    fs.appendFileSync(logFile, logMessage);
    console.log(message);
  }

  getDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.context.close();
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.context = null;
      this.log('Navegador cerrado');
    }
    return { content: [{ type: 'text', text: 'Navegador cerrado' }] };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new PlaywrightMCPServer();
server.start().catch(console.error);
