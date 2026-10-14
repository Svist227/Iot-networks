import { test, expect } from '@playwright/test';

test('all sections survive reload on static hosting, including a subfolder', async ({
  page,
  request,
}) => {
  expect((await request.get('/editor')).status()).toBe(404);
  for (const base of ['/', '/workspace/']) {
    for (const [route, heading] of [
      ['projects', 'Ваши сети и эксперименты'],
      ['editor', 'Соберите сеть. Проверьте её запас.'],
      ['scenarios', 'Проверьте сеть в разных условиях'],
      ['results', 'Результаты экспериментов'],
      ['reports', 'Результаты, которыми можно поделиться'],
      ['profile', 'Ваш профиль'],
    ]) {
      await page.goto(base + '#/' + route);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      const response = await page.reload();
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/демо|демонстрац/i);
    }
  }
});

test('playback pauses, shows the event, cancels, and saves only a completed run', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#/editor');
  await page.getByRole('button', { name: 'Запустить сценарий', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Обрыв канала', exact: true });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/#\/editor$/);
  await dialog.getByRole('button', { name: 'Пауза', exact: true }).click();
  const progress = dialog.getByRole('progressbar');
  const pausedAt = await progress.getAttribute('aria-valuenow');
  await page.waitForTimeout(400);
  expect(await progress.getAttribute('aria-valuenow')).toBe(pausedAt);
  await dialog.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await expect(dialog.getByText('Канал связи: временно недоступен.', { exact: true })).toBeVisible({
    timeout: 12000,
  });
  await dialog.getByRole('button', { name: 'Пауза', exact: true }).click();
  await page.screenshot({ path: '.artifacts/scenario-running.jpg', fullPage: true });
  await dialog.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'История', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Запусков пока нет', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Запустить сценарий', exact: true }).first().click();
  await dialog.getByRole('button', { name: 'Ускорить воспроизведение', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Сценарий завершён', exact: true })).toBeVisible(
    { timeout: 20000 },
  );
  await dialog.getByRole('button', { name: 'Открыть результаты', exact: true }).click();
  await expect(page).toHaveURL(/#\/results\?run=/);
  const runUrl = page.url();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Что произойдёт при обрыве связи?', exact: true }),
  ).toBeVisible();
  expect(page.url()).toBe(runUrl);
  await expect(page.locator('body')).not.toContainText(/демо|демонстрац/i);
  await page.getByRole('button', { name: 'Создать отчёт', exact: true }).click();
  await expect(page.locator('#print-report')).toBeVisible();
  const reportUrl = page.url();
  await page.reload();
  expect(page.url()).toBe(reportUrl);
  await expect(page.locator('#print-report')).toContainText('Обрыв канала');
  await page.getByRole('link', { name: 'Редактор сети', exact: true }).click();
  await page.getByRole('button', { name: 'История', exact: true }).click();
  expect(await page.getByRole('button').filter({ hasText: 'Обрыв канала' }).count()).toBe(1);
  expect(errors).toEqual([]);
});

test('scenario-page launch and playback fit a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/scenarios');
  await page.getByRole('button', { name: 'Запустить сценарий', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Пауза', exact: true }).click();
  const size = await dialog.boundingBox();
  expect(size!.width).toBeLessThanOrEqual(390);
  expect(size!.x).toBeGreaterThanOrEqual(0);
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: '.artifacts/scenario-mobile.jpg', fullPage: true });
  await dialog.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Проверьте сеть в разных условиях', exact: true }),
  ).toBeVisible();
});
