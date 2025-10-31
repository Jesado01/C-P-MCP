import { test, expect } from '@playwright/test';

test.describe('Sauce Demo - Login Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('https://www.saucedemo.com');
  });

  test('Login exitoso con usuario estándar', async ({ page }) => {
    // Usar variables de entorno para credenciales
    const username = process.env.PERFIL_USERNAME || 'standard_user';
    const password = 'secret_sauce';

    // Completar formulario de login
    await page.locator('[data-test="username"]').fill(username);
    await page.locator('[data-test="password"]').fill(password);
    await page.locator('[data-test="login-button"]').click();

    // Verificar login exitoso
    await expect(page).toHaveURL('https://www.saucedemo.com/inventory.html');
    await expect(page.locator('.title')).toHaveText('Products');
    await expect(page.locator('.app_logo')).toBeVisible();
  });

  test('Login fallido - credenciales incorrectas', async ({ page }) => {
    await page.locator('[data-test="username"]').fill('usuario_invalido');
    await page.locator('[data-test="password"]').fill('password_incorrecto');
    await page.locator('[data-test="login-button"]').click();

    // Verificar mensaje de error
    const errorMessage = page.locator('[data-test="error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Username and password do not match');
  });

  test('Login fallido - usuario bloqueado', async ({ page }) => {
    await page.locator('[data-test="username"]').fill('locked_out_user');
    await page.locator('[data-test="password"]').fill('secret_sauce');
    await page.locator('[data-test="login-button"]').click();

    // Verificar mensaje de error de usuario bloqueado
    const errorMessage = page.locator('[data-test="error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Sorry, this user has been locked out');
  });

  test('Login fallido - campos vacíos', async ({ page }) => {
    await page.locator('[data-test="login-button"]').click();

    // Verificar mensaje de error
    const errorMessage = page.locator('[data-test="error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Username is required');
  });

  test('Login fallido - solo usuario sin password', async ({ page }) => {
    const username = process.env.PERFIL_USERNAME || 'standard_user';
    
    await page.locator('[data-test="username"]').fill(username);
    await page.locator('[data-test="login-button"]').click();

    // Verificar mensaje de error
    const errorMessage = page.locator('[data-test="error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Password is required');
  });

  test('Cerrar mensaje de error', async ({ page }) => {
    await page.locator('[data-test="username"]').fill('usuario_invalido');
    await page.locator('[data-test="password"]').fill('password_incorrecto');
    await page.locator('[data-test="login-button"]').click();

    // Verificar que el error es visible
    const errorMessage = page.locator('[data-test="error"]');
    await expect(errorMessage).toBeVisible();

    // Cerrar el mensaje de error
    await page.locator('[data-test="error-button"]').click();
    await expect(errorMessage).not.toBeVisible();
  });

  test('Login con diferentes usuarios válidos', async ({ page }) => {
    const validUsers = [
      'standard_user',
      'problem_user',
      'performance_glitch_user',
      'error_user',
      'visual_user'
    ];

    for (const username of validUsers) {
      await page.goto('https://www.saucedemo.com');
      
      await page.locator('[data-test="username"]').fill(username);
      await page.locator('[data-test="password"]').fill('secret_sauce');
      await page.locator('[data-test="login-button"]').click();

      // Verificar login exitoso
      await expect(page).toHaveURL('https://www.saucedemo.com/inventory.html');
      
      // Logout para siguiente iteración
      await page.locator('#react-burger-menu-btn').click();
      await page.locator('#logout_sidebar_link').click();
    }
  });

  test('Verificar elementos del formulario de login', async ({ page }) => {
    // Verificar que los elementos del formulario están presentes
    await expect(page.locator('[data-test="username"]')).toBeVisible();
    await expect(page.locator('[data-test="password"]')).toBeVisible();
    await expect(page.locator('[data-test="login-button"]')).toBeVisible();
    
    // Verificar placeholders
    await expect(page.locator('[data-test="username"]')).toHaveAttribute('placeholder', 'Username');
    await expect(page.locator('[data-test="password"]')).toHaveAttribute('placeholder', 'Password');
    
    // Verificar logo
    await expect(page.locator('.login_logo')).toBeVisible();
  });
});
