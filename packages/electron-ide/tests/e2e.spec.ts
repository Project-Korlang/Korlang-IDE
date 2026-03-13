import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test('launches Korlang IDE and shows welcome screen', async () => {
  const app = await electron.launch({
    args: [path.join(__dirname, '../dist-electron/main.js')],
    env: {
      ...process.env
    }
  });

  const window = await app.firstWindow();
  await expect(window.getByText('Welcome to Korlang IDE')).toBeVisible();

  await app.close();
});
