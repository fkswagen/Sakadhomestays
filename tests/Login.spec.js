import {test, expect} from '@playwright/test';

test('Login with valid credentials', async ({ page }) => {
  await page.goto('http://localhost:5173/auth');
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('flok4499@gmail.com');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('042165648Qq');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('h1')).toContainText('My account');
})