# Claude + Playwright MCP - Generador Automático de Tests

Agente inteligente que usa Claude API + MCP para generar y ejecutar pruebas de Playwright automáticamente.

## 🎭 Modos de Uso

Este proyecto soporta **dos modos de operación**:

1. **🖥️ Modo Interactivo (CLI)** - Interfaz de línea de comandos para uso directo en terminal
2. **🌐 Modo API (NEW!)** - API REST + WebSocket para integración con frontends web

Ver [api/API_USAGE.md](api/API_USAGE.md) para documentación completa de la API.

---

## 🚀 Instalación Inicial

```bash
# 1. Clonar o crear el proyecto
mkdir mcp-agent && cd mcp-agent

# 2. Instalar dependencias
npm install

# 3. Instalar navegadores de Playwright
npx playwright install --with-deps

# 4. Configurar credenciales en .env
nano .env
```

---

## ⚙️ Configuración del .env

```bash
# Copia esto en tu archivo .env
ANTHROPIC_API_KEY=tu_api_key_de_claude_aqui

# Perfil 1: Login con TELÉFONO
PROFILE_PHONE_NUMERO=5551234567
PROFILE_PHONE_PASSWORD=TuPassword123

# Perfil 2: Login con EMAIL
PROFILE_EMAIL_EMAIL=user@example.com
PROFILE_EMAIL_PASSWORD=TuPassword456

# Perfil 3: Login con USERNAME
PROFILE_USER_USERNAME=tu_usuario
PROFILE_USER_PASSWORD=TuPassword789
```

---

## 🎯 Comandos Principales

### Modo Interactivo (CLI)

```bash
# Iniciar el agente en modo interactivo
npm start

# O directamente
node claude-agent-api.js

EJEMPLO: Abre https://www.saucedemo.com/ y genera pruebas usando el PERFIL TELÉFONO
```

### Modo API (Servidor Web)

```bash
# 1. Instalar dependencias de Python
cd api
pip install -r requirements.txt

# 2. Iniciar el servidor FastAPI
python main.py

# El API estará disponible en http://localhost:8000
# Ver api/API_USAGE.md para endpoints y ejemplos

# 3. Probar el API (en otra terminal)
python test_api.py
```

### Ejecutar Tests Generados

```bash
# Todos los tests
npx playwright test

# Test específico
npx playwright test tests/login.spec.ts

# Con interfaz visual
npx playwright test --ui

# En modo debug
npx playwright test --debug

# Ver en el navegador
npx playwright test --headed
```

### Ver Reportes

```bash
# Abrir último reporte HTML
npx playwright show-report

# Ver logs de sesión
cat output/logs/session_*.log

# Ver historial de conversaciones
cat output/conversations/conversation_*.json
```

### Limpiar Archivos

```bash
# Limpiar tests generados
rm tests/generated_test_*.spec.ts

# Limpiar logs
rm -rf output/logs/*

# Limpiar conversaciones
rm -rf output/conversations/*

# Limpiar todo
rm -rf tests/generated_*.spec.ts output/logs/* output/conversations/*
```

---

## 💬 Comandos del Agente Interactivo

Una vez que ejecutas `npm start`, puedes usar estos comandos:

### Comandos Directos

```bash
# Navegar a una URL
navigate https://ejemplo.com

# Hacer click en un elemento
click #boton-login

# Llenar un campo
fill #email usuario@ejemplo.com

# Obtener info de la página
info

# Salir
exit
```

### Comandos en Lenguaje Natural

```bash
# Generar pruebas con perfil teléfono
Abre https://miapp.com y genera pruebas usando el PERFIL TELÉFONO

# Generar pruebas con perfil email
Abre https://miapp.com y genera pruebas usando el PERFIL EMAIL

# Generar pruebas completas
Genera casos de prueba completos para https://miapp.com incluyendo:
- Login
- Navegación
- Formularios
- Checkout

# Generar múltiples perfiles
Genera 3 tests de login para https://miapp.com:
1. Con PERFIL TELÉFONO
2. Con PERFIL EMAIL
3. Con PERFIL USERNAME

# Explorar y generar
Explora https://ejemplo.com y genera los casos de prueba que consideres necesarios
```

---

## 📁 Estructura del Proyecto

```
mcp-agent/
├── tests/                       # Tests generados (Playwright)
│   ├── generated_test_*.spec.ts
│   └── *.spec.ts
├── output/
│   ├── logs/                    # Logs de sesiones
│   │   └── session_*.log
│   └── conversations/           # Historial de chat
│       └── conversation_*.json
├── claude-agent.js              # Agente principal
├── playwright-mcp-server.js     # Servidor MCP
├── playwright.config.ts         # Config de Playwright
├── package.json
└── .env                         # Credenciales
```

---

## 🎓 Ejemplos de Uso

### Ejemplo 1: Pruebas Básicas de Login

```bash
npm start

👤 Tú: Abre https://www.saucedemo.com y genera pruebas de login con el PERFIL EMAIL

🤖 Claude: [Genera automáticamente el código y lo guarda en tests/]

# Ejecutar las pruebas generadas
npx playwright test
```

### Ejemplo 2: E-commerce Completo

```bash
npm start

👤 Tú: Genera suite completa para https://demo-shop.com usando PERFIL TELÉFONO:
- Login/Logout
- Búsqueda de productos
- Agregar al carrito
- Proceso de checkout
- Validaciones de formularios

🤖 Claude: [Genera múltiples archivos .spec.ts]

# Ver los tests generados
ls -la tests/

# Ejecutar
npx playwright test --headed
```

### Ejemplo 3: Pruebas con Múltiples Usuarios

```bash
npm start

👤 Tú: Genera tests para https://app.com con los 3 perfiles:
- PERFIL TELÉFONO: casos positivos
- PERFIL EMAIL: casos negativos
- PERFIL USERNAME: casos edge

🤖 Claude: [Genera tests para cada perfil]

# Ejecutar solo tests de teléfono
npx playwright test --grep "Teléfono"
```

---

## 🔧 Troubleshooting

### Error: "Cannot find ANTHROPIC_API_KEY"

```bash
# Verificar que el .env existe
cat .env

# Verificar que tiene la API key
grep ANTHROPIC_API_KEY .env

# Reinstalar dotenv
npm install dotenv
```

### Error: "Browser not found"

```bash
# Reinstalar navegadores
npx playwright install --with-deps chromium
```

### Error: "MCP Server crashed"

```bash
# Verificar Node.js version (requiere 18+)
node --version

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Los tests no se guardan

```bash
# Verificar que existe la carpeta tests/
mkdir -p tests

# Verificar permisos
chmod 755 tests/

# Ver logs para más info
cat output/logs/session_*.log
```

---

## 📊 Comandos Útiles de Playwright

```bash
# Ver tests disponibles
npx playwright test --list

# Ejecutar tests en paralelo
npx playwright test --workers=4

# Ejecutar test específico
npx playwright test tests/login.spec.ts

# Ejecutar por nombre
npx playwright test --grep "login exitoso"

# Modo debug paso a paso
npx playwright test --debug

# Generar código grabando acciones
npx playwright codegen https://ejemplo.com

# Ver trace de ejecución
npx playwright show-trace trace.zip

# Actualizar snapshots visuales
npx playwright test --update-snapshots
```

---

## 🚨 Seguridad

⚠️ **IMPORTANTE:**

- NUNCA commitees el archivo `.env` a Git
- Las credenciales en `.env` son solo para testing
- No uses credenciales de producción
- Cambia las contraseñas regularmente

```bash
# Verificar que .env está en .gitignore
cat .gitignore | grep .env

# Si no está, agregarlo
echo ".env" >> .gitignore
```

---

## 📝 Tips y Mejores Prácticas

1. **Sé específico con Claude:**

```
   ❌ "genera pruebas"
   ✅ "genera pruebas de login usando PERFIL EMAIL con casos positivos y negativos"
```

2. **Usa perfiles correctamente:**

   - PERFIL TELÉFONO: Apps que usan número de teléfono
   - PERFIL EMAIL: Apps que usan correo electrónico
   - PERFIL USERNAME: Apps que usan nombre de usuario

3. **Revisa el código generado:**

```bash
   # Siempre revisa antes de ejecutar
   cat tests/generated_test_*.spec.ts
```

4. **Ejecuta tests frecuentemente:**

```bash
   # Después de cada generación
   npx playwright test --headed
```

5. **Mantén logs limpios:**

```bash
   # Limpia logs antiguos cada semana
   find output/logs -mtime +7 -delete
```

---

## 🆘 Obtener Ayuda

```bash
# Ver ayuda de Playwright
npx playwright test --help

# Ver configuración actual
npx playwright show-config

# Verificar instalación
npx playwright --version

# Ver logs de Claude
cat output/logs/session_*.log | tail -n 50
```

---

## 📚 Recursos

- [Documentación de Playwright](https://playwright.dev)
- [Claude API Docs](https://docs.anthropic.com)
- [MCP Protocol](https://modelcontextprotocol.io)

---

## 🎉 Quick Start

```bash
# Setup completo en 4 comandos
npm install
npx playwright install --with-deps
nano .env  # Agrega tu ANTHROPIC_API_KEY
npm start  # ¡Listo!
```

---

**¿Dudas?** Revisa los logs en `output/logs/` o el historial en `output/conversations/`
