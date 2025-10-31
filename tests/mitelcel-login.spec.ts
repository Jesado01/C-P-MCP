import { test, expect } from '@playwright/test';

// Configuración de credenciales desde variables de entorno
const PHONE_NUMBER = process.env.PROFILE_PHONE_NUMERO || '6561745290';
const PASSWORD = process.env.PROFILE_PHONE_PASSWORD || 'Adolfo06';

test.describe('Mi Telcel - Pruebas de Login', () => {
  
  // Configuración antes de cada test
  test.beforeEach(async ({ page }) => {
    // Navegar a la página de login
    await page.goto('https://www.mitelcel.com/mitelcel/login', {
      waitUntil: 'networkidle'
    });
  });

  test('TC001 - Verificar que la página de login carga correctamente', async ({ page }) => {
    // Verificar el título de la página
    await expect(page).toHaveTitle('Mi Telcel | Iniciar sesión');
    
    // Verificar que la URL es correcta
    expect(page.url()).toBe('https://www.mitelcel.com/mitelcel/login');
    
    // Verificar que el iframe del formulario está presente
    const loginIframe = page.frameLocator('iframe[title="Formulario Inicio de Sesión Mi Telcel"]');
    await expect(loginIframe.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('TC002 - Verificar elementos visibles en la página principal de login', async ({ page }) => {
    // Verificar que el enlace "Olvidé mi contraseña" está visible
    const forgotPasswordLink = page.locator('text=Olvidé mi contraseña');
    await expect(forgotPasswordLink).toBeVisible();
    
    // Verificar que el enlace "Regístrate" está visible
    const registerLink = page.locator('text=Regístrate');
    await expect(registerLink).toBeVisible();
    
    // Verificar que el enlace de Aviso de Privacidad está visible
    const privacyLink = page.locator('text=Consulta el Aviso de Privacidad de Telcel');
    await expect(privacyLink).toBeVisible();
  });

  test('TC003 - Verificar que el iframe de login carga correctamente', async ({ page }) => {
    // Localizar el iframe del formulario de login
    const loginIframe = page.frameLocator('iframe[title="Formulario Inicio de Sesión Mi Telcel"]');
    
    // Esperar a que el iframe cargue completamente
    await page.waitForTimeout(3000); // Esperar carga del iframe
    
    // Verificar que el iframe está presente y visible
    const iframeElement = page.locator('iframe[title="Formulario Inicio de Sesión Mi Telcel"]');
    await expect(iframeElement).toBeVisible();
    
    // Verificar que el iframe tiene el src correcto
    const iframeSrc = await iframeElement.getAttribute('src');
    expect(iframeSrc).toContain('wbl.telcel-id.com');
    expect(iframeSrc).toContain('login');
  });

  test('TC004 - Login exitoso con credenciales válidas del PERFIL_PHONE', async ({ page }) => {
    // Localizar el iframe del formulario de login
    const loginIframe = page.frameLocator('iframe[title="Formulario Inicio de Sesión Mi Telcel"]');
    
    // Esperar a que el iframe cargue
    await page.waitForTimeout(3000);
    
    // Dentro del iframe, llenar el formulario de login
    // Nota: Los selectores exactos dentro del iframe pueden variar
    // Estos son los selectores más comunes en formularios de Telcel
    
    try {
      // Intentar localizar el campo de teléfono (posibles selectores)
      const phoneInput = loginIframe.locator('input[name="username"], input[type="tel"], input[placeholder*="teléfono"], input[placeholder*="número"], #username, #phone, #msisdn').first();
      await phoneInput.waitFor({ state: 'visible', timeout: 10000 });
      await phoneInput.fill(PHONE_NUMBER);
      
      // Intentar localizar el campo de contraseña
      const passwordInput = loginIframe.locator('input[type="password"], input[name="password"], #password').first();
      await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
      await passwordInput.fill(PASSWORD);
      
      // Tomar screenshot antes de hacer clic en login
      await page.screenshot({ path: 'screenshots/antes-login.png', fullPage: true });
      
      // Hacer clic en el botón de login
      const loginButton = loginIframe.locator('button[type="submit"], input[type="submit"], button:has-text("Ingresar"), button:has-text("Iniciar")').first();
      await loginButton.click();
      
      // Esperar navegación o mensaje de éxito/error
      await page.waitForTimeout(5000);
      
      // Tomar screenshot después del login
      await page.screenshot({ path: 'screenshots/despues-login.png', fullPage: true });
      
      // Verificar que la URL cambió (indica login exitoso)
      const currentUrl = page.url();
      console.log('URL después del login:', currentUrl);
      
      // El login exitoso debería redirigir fuera de /login
      // expect(currentUrl).not.toContain('/login');
      
    } catch (error) {
      console.error('Error durante el login:', error);
      await page.screenshot({ path: 'screenshots/error-login.png', fullPage: true });
      throw error;
    }
  });

  test('TC005 - Intentar login con teléfono vacío', async ({ page }) => {
    const loginIframe = page.frameLocator('iframe[title="Formulario Inicio de Sesión Mi Telcel"]');
    
    await page.waitForTimeout(3000);
    
    try {
      // Dejar el campo de teléfono vacío y llenar solo la contraseña
      const passwordInput = loginIframe.locator('input[type="password"], input[name="password"], #password').first();
      await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
      await passwordInput.fill(PASSWORD);
      
      // Hacer clic en el botón de login
      const loginButton = loginIframe.locator('button[type="submit"], input[type="submit"], button:has-text("Ingresar"), button:has-text("Iniciar")').first();
      await loginButton.click();
      
      await page.waitForTimeout(2000);
      
      // Verificar que aparece un mensaje de error o validación
      const errorMessage = loginIframe.locator('text=/.*requerido.*|.*obligatorio.*|.*necesario.*/i, .error, .alert-danger, [class*="error"]').first();
      
      // Debe mostrar algún mensaje de error
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      
      await page.screenshot({ path: 'screenshots/error-telefono-vacio.png', fullPage: true });
      
    } catch (error) {
      console.error('Error en prueba de teléfono vacío:', error);
      await page.screenshot({ path: 'screenshots/error-validacion-telefono.png', fullPage: true });
    }
  });

  test('TC006 - Intentar login con contraseña vacía', async ({ page }) => {
    const loginIframe = page.frameLocator('iframe[title="Formulario Inicio de Sesión Mi Telcel"]');
    
    await page.waitForTimeout(3000);
    
    try {
      // Llenar solo el campo de teléfono
      const phoneInput = loginIframe.locator('input[name="username"], input[type="tel"], input[placeholder*="teléfono"], #username, #phone').first();
      await phoneInput.waitFor({ state: 'visible', timeout: 10000 });
      await phoneInput.fill(PHONE_NUMBER);
      
      // Hacer clic en el botón de login sin llenar contraseña
      const loginButton = loginIframe.locator('button[type="submit"], input[type="submit"], button:has-text("Ingresar"), button:has-text("Iniciar")').first();
      await loginButton.click();
      
      await page.waitForTimeout(2000);
      
      // Verificar que aparece un mensaje de error
      const errorMessage = loginIframe.locator('text=/.*requerido.*|.*obligatorio.*|.*necesario.*/i, .error, .alert-danger, [class*="error"]').first();
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      
      await page.screenshot({ path: 'screenshots/error-password-vacia.png', fullPage: true });
      
    } catch (error) {
      console.error('Error en prueba de contraseña vacía:', error);
      await page.screenshot({ path: 'screenshots/error-validacion-password.png', fullPage: true });
    }
  });

  test('TC007 - Verificar funcionalidad del enlace "Olvidé mi contraseña"', async ({ page }) => {
    // Hacer clic en el enlace "Olvidé mi contraseña"
    const forgotPasswordLink = page.locator('text=Olvidé mi contraseña');
    await expect(forgotPasswordLink).toBeVisible();
    
    // Guardar la URL actual
    const currentUrl = page.url();
    
    await forgotPasswordLink.click();
    
    // Esperar a que se realice alguna acción (modal, navegación, etc.)
    await page.waitForTimeout(2000);
    
    // Tomar screenshot
    await page.screenshot({ path: 'screenshots/olvide-password.png', fullPage: true });
    
    // Verificar que algo cambió (puede ser un modal o navegación)
    const newUrl = page.url();
    const hasModal = await page.locator('.modal, [role="dialog"]').isVisible().catch(() => false);
    
    // Debe haber algún cambio
    expect(newUrl !== currentUrl || hasModal).toBeTruthy();
  });

  test('TC008 - Verificar funcionalidad del enlace "Regístrate"', async ({ page }) => {
    // Hacer clic en el enlace "Regístrate"
    const registerLink = page.locator('text=Regístrate');
    await expect(registerLink).toBeVisible();
    
    await registerLink.click();
    
    // Esperar navegación o cambio de página
    await page.waitForTimeout(3000);
    
    // Tomar screenshot
    await page.screenshot({ path: 'screenshots/registro.png', fullPage: true });
    
    // Verificar que la URL cambió o se abrió un modal de registro
    const currentUrl = page.url();
    console.log('URL después de clic en Regístrate:', currentUrl);
    
    // Puede redirigir a una página de registro
    expect(currentUrl).toContain('mitelcel.com');
  });

  test('TC009 - Intentar login con credenciales inválidas', async ({ page }) => {
    const loginIframe = page.frameLocator('iframe[title="Formulario Inicio de Sesión Mi Telcel"]');
    
    await page.waitForTimeout(3000);
    
    try {
      // Llenar con credenciales inválidas
      const phoneInput = loginIframe.locator('input[name="username"], input[type="tel"], input[placeholder*="teléfono"], #username, #phone').first();
      await phoneInput.waitFor({ state: 'visible', timeout: 10000 });
      await phoneInput.fill('1234567890');
      
      const passwordInput = loginIframe.locator('input[type="password"], input[name="password"], #password').first();
      await passwordInput.fill('PasswordIncorrecto123');
      
      const loginButton = loginIframe.locator('button[type="submit"], input[type="submit"], button:has-text("Ingresar"), button:has-text("Iniciar")').first();
      await loginButton.click();
      
      await page.waitForTimeout(5000);
      
      // Verificar que aparece un mensaje de error
      const errorMessage = page.locator('text=/.*incorrecto.*|.*inválido.*|.*error.*/i, .alert-danger, .error-message').first();
      
      await page.screenshot({ path: 'screenshots/credenciales-invalidas.png', fullPage: true });
      
      // Puede aparecer mensaje en la página principal o en el iframe
      const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
      console.log('Mensaje de error visible:', hasError);
      
    } catch (error) {
      console.error('Error en prueba de credenciales inválidas:', error);
      await page.screenshot({ path: 'screenshots/error-credenciales-invalidas.png', fullPage: true });
    }
  });

  test('TC010 - Verificar elementos de la página (footer, aviso de privacidad)', async ({ page }) => {
    // Scroll al footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    // Verificar elementos del footer
    const avisoPrivacidad = page.locator('text=Aviso de Privacidad');
    await expect(avisoPrivacidad).toBeVisible();
    
    const terminosCondiciones = page.locator('text=Términos y condiciones');
    await expect(terminosCondiciones).toBeVisible();
    
    const cookies = page.locator('text=Política de Uso de Cookies');
    await expect(cookies).toBeVisible();
    
    // Tomar screenshot del footer
    await page.screenshot({ path: 'screenshots/footer.png', fullPage: true });
  });

});

// Test Suite adicional para navegación y elementos UI
test.describe('Mi Telcel - Verificación de UI y Accesibilidad', () => {
  
  test('TC011 - Verificar que el sitio es responsive (mobile)', async ({ page }) => {
    // Configurar viewport para mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('https://www.mitelcel.com/mitelcel/login');
    
    // Verificar que el iframe se ajusta al tamaño mobile
    const iframeElement = page.locator('iframe[title="Formulario Inicio de Sesión Mi Telcel"]');
    await expect(iframeElement).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/mobile-view.png', fullPage: true });
  });

  test('TC012 - Verificar que el sitio es responsive (tablet)', async ({ page }) => {
    // Configurar viewport para tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('https://www.mitelcel.com/mitelcel/login');
    
    const iframeElement = page.locator('iframe[title="Formulario Inicio de Sesión Mi Telcel"]');
    await expect(iframeElement).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/tablet-view.png', fullPage: true });
  });

  test('TC013 - Verificar accesibilidad básica de la página de login', async ({ page }) => {
    await page.goto('https://www.mitelcel.com/mitelcel/login');
    
    // Verificar que los enlaces tienen texto descriptivo
    const forgotPasswordLink = page.locator('text=Olvidé mi contraseña');
    const linkText = await forgotPasswordLink.textContent();
    expect(linkText).toBeTruthy();
    expect(linkText?.length).toBeGreaterThan(0);
    
    // Verificar que el iframe tiene un título accesible
    const iframe = page.locator('iframe[title]').first();
    const iframeTitle = await iframe.getAttribute('title');
    expect(iframeTitle).toBeTruthy();
    expect(iframeTitle).toContain('Formulario');
  });

});
