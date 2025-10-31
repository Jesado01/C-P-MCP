const { chromium } = require('playwright');

class SimplePlaywrightServer {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async ensureBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: false });
      this.page = await this.browser.newPage();
    }
  }

  async navigate(url) {
    await this.ensureBrowser();
    await this.page.goto(url, { waitUntil: 'networkidle' });
    return { content: [{ type: 'text', text: `Navegado a ${url}` }] };
  }

  async getPageInfo() {
    await this.ensureBrowser();
    const title = await this.page.title();
    const url = this.page.url();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ title, url }, null, 2)
      }]
    };
  }

  async getText(selector) {
    await this.ensureBrowser();
    try {
      const text = await this.page.textContent(selector, { timeout: 5000 });
      return { content: [{ type: 'text', text: text || '' }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }] };
    }
  }

  async click(selector) {
    await this.ensureBrowser();
    await this.page.click(selector);
    return { content: [{ type: 'text', text: `Click en ${selector}` }] };
  }

  async fill(selector, text) {
    await this.ensureBrowser();
    await this.page.fill(selector, text);
    return { content: [{ type: 'text', text: `Llenado ${selector}` }] };
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
    return { content: [{ type: 'text', text: 'Cerrado' }] };
  }

  async handleRequest(method, params) {
    const { name, arguments: args } = params;

    try {
      switch (name) {
        case 'navigate':
          return await this.navigate(args.url);
        case 'getPageInfo':
          return await this.getPageInfo();
        case 'getText':
          return await this.getText(args.selector);
        case 'click':
          return await this.click(args.selector);
        case 'fill':
          return await this.fill(args.selector, args.text);
        case 'close':
          return await this.closeBrowser();
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }]
      };
    }
  }

  start() {
    process.stdin.setEncoding('utf8');
    
    let buffer = '';
    
    process.stdin.on('data', async (chunk) => {
      buffer += chunk;
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const request = JSON.parse(line);
          
          if (request.method === 'tools/call') {
            const result = await this.handleRequest(request.method, request.params);
            
            const response = {
              jsonrpc: '2.0',
              id: request.id,
              result: result
            };
            
            process.stdout.write(JSON.stringify(response) + '\n');
          }
        } catch (error) {
          const errorResponse = {
            jsonrpc: '2.0',
            id: request?.id || null,
            error: {
              code: -32603,
              message: error.message
            }
          };
          
          process.stdout.write(JSON.stringify(errorResponse) + '\n');
        }
      }
    });

    process.stdin.on('end', async () => {
      await this.closeBrowser();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      await this.closeBrowser();
      process.exit(0);
    });
  }
}

const server = new SimplePlaywrightServer();
server.start();