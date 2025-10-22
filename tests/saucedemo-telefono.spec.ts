import { test, expect } from '@playwright/test';

test.describe('SauceDemo - Tests con Perfil Teléfono', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('https://www.saucedemo.com');
  });

  test('debe iniciar sesión exitosamente con teléfono', async ({ page }) => {
    // Login con credenciales de teléfono
    await page.fill('[data-test="username"]', process.env.PROFILE_PHONE_NUMERO!);
    await page.fill('[data-test="password"]', process.env.PROFILE_PHONE_PASSWORD!);
    await page.click('[data-test="login-button"]');
    
    // Verificar que llegamos al dashboard
    await expect(page).toHaveURL('https://www.saucedemo.com/inventory.html');
    await expect(page.locator('.title')).toHaveText('Products');
    await expect(page.locator('.shopping_cart_link')).toBeVisible();
  });

  test('debe fallar login con credenciales inválidas', async ({ page }) => {
    await page.fill('[data-test="username"]', 'telefono_invalido');
    await page.fill('[data-test="password"]', 'password_incorrecto');
    await page.click('[data-test="login-button"]');
    
    // Verificar mensaje de error
    await expect(page.locator('[data-test="error"]')).toBeVisible();
    await expect(page.locator('[data-test="error"]')).toContainText('Username and password do not match');
  });

  test('debe agregar productos al carrito exitosamente', async ({ page }) => {
    // Login
    await page.fill('[data-test="username"]', process.env.PROFILE_PHONE_NUMERO!);
    await page.fill('[data-test="password"]', process.env.PROFILE_PHONE_PASSWORD!);
    await page.click('[data-test="login-button"]');
    
    // Agregar productos al carrito
    await page.click('[data-test="add-to-cart-sauce-labs-backpack"]');
    await page.click('[data-test="add-to-cart-sauce-labs-bike-light"]');
    
    // Verificar contador del carrito
    await expect(page.locator('.shopping_cart_badge')).toHaveText('2');
    
    // Ir al carrito
    await page.click('.shopping_cart_link');
    await expect(page).toHaveURL('https://www.saucedemo.com/cart.html');
    
    // Verificar productos en el carrito
    await expect(page.locator('.cart_item')).toHaveCount(2);
    await expect(page.locator('[data-test="inventory-item-name"]').first()).toContainText('Sauce Labs Backpack');
  });

  test('debe completar el proceso de checkout exitosamente', async ({ page }) => {
    // Login
    await page.fill('[data-test="username"]', process.env.PROFILE_PHONE_NUMERO!);
    await page.fill('[data-test="password"]', process.env.PROFILE_PHONE_PASSWORD!);
    await page.click('[data-test="login-button"]');
    
    // Agregar producto
    await page.click('[data-test="add-to-cart-sauce-labs-backpack"]');
    
    // Ir al carrito
    await page.click('.shopping_cart_link');
    
    // Proceder al checkout
    await page.click('[data-test="checkout"]');
    
    // Llenar información de checkout
    await page.fill('[data-test="firstName"]', 'Usuario');
    await page.fill('[data-test="lastName"]', 'Teléfono');
    await page.fill('[data-test="postalCode"]', '12345');
    await page.click('[data-test="continue"]');
    
    // Verificar página de resumen
    await expect(page).toHaveURL('https://www.saucedemo.com/checkout-step-two.html');
    await expect(page.locator('.title')).toHaveText('Checkout: Overview');
    
    // Finalizar compra
    await page.click('[data-test="finish"]');
    
    // Verificar compra exitosa
    await expect(page).toHaveURL('https://www.saucedemo.com/checkout-complete.html');
    await expect(page.locator('.complete-header')).toHaveText('Thank you for your order!');
  });

  test('debe realizar logout exitosamente', async ({ page }) => {
    // Login
    await page.fill('[data-test="username"]', process.env.PROFILE_PHONE_NUMERO!);
    await page.fill('[data-test="password"]', process.env.PROFILE_PHONE_PASSWORD!);
    await page.click('[data-test="login-button"]');
    
    // Abrir menú hamburguesa
    await page.click('#react-burger-menu-btn');
    
    // Hacer logout
    await page.click('[data-test="logout-sidebar-link"]');
    
    // Verificar que regresamos al login
    await expect(page).toHaveURL('https://www.saucedemo.com/');
    await expect(page.locator('[data-test="login-button"]')).toBeVisible();
  });

  test('debe filtrar productos correctamente', async ({ page }) => {
    // Login
    await page.fill('[data-test="username"]', process.env.PROFILE_PHONE_NUMERO!);
    await page.fill('[data-test="password"]', process.env.PROFILE_PHONE_PASSWORD!);
    await page.click('[data-test="login-button"]');
    
    // Verificar productos iniciales
    const initialProducts = await page.locator('.inventory_item').count();
    expect(initialProducts).toBeGreaterThan(0);
    
    // Filtrar por precio (bajo a alto)
    await page.selectOption('[data-test="product_sort_container"]', 'lohi');
    
    // Verificar que el primer producto es el más barato
    const firstPrice = await page.locator('.inventory_item_price').first().textContent();
    const lastPrice = await page.locator('.inventory_item_price').last().textContent();
    
    const firstPriceNum = parseFloat(firstPrice!.replace('$', ''));
    const lastPriceNum = parseFloat(lastPrice!.replace('$', ''));
    
    expect(firstPriceNum).toBeLessThanOrEqual(lastPriceNum);
  });

  test('debe manejar el carrito vacío correctamente', async ({ page }) => {
    // Login
    await page.fill('[data-test="username"]', process.env.PROFILE_PHONE_NUMERO!);
    await page.fill('[data-test="password"]', process.env.PROFILE_PHONE_PASSWORD!);
    await page.click('[data-test="login-button"]');
    
    // Ir al carrito vacío
    await page.click('.shopping_cart_link');
    
    // Verificar carrito vacío
    await expect(page).toHaveURL('https://www.saucedemo.com/cart.html');
    await expect(page.locator('.cart_item')).toHaveCount(0);
    
    // Verificar que no hay badge en el carrito
    await expect(page.locator('.shopping_cart_badge')).not.toBeVisible();
  });
});
