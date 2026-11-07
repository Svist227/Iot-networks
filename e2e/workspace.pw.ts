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
  await expect(page.getByRole('columnheader', { name: /Буфер 6/ })).toBeVisible();
  await expect(
    page.getByRole('cell', { name: 'p95 задержки доставки', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: '.artifacts/calculated-results.png', fullPage: true });
  await page.getByRole('button', { name: 'Создать отчёт', exact: true }).click();
  await expect(page.locator('#print-report')).toBeVisible();
  const reportUrl = page.url();
  await page.reload();
  expect(page.url()).toBe(reportUrl);
  await expect(page.locator('#print-report')).toContainText('Обрыв канала');
  await expect(page.locator('#print-report')).toContainText('queue-1.1');
  await page.screenshot({ path: '.artifacts/calculated-report.png', fullPage: true });
  await page.emulateMedia({ media: 'print' });
  await page.screenshot({ path: '.artifacts/calculated-report-print.png', fullPage: true });
  await page.emulateMedia({ media: 'screen' });
  await page.getByRole('link', { name: 'Редактор сети', exact: true }).click();
  await page.getByRole('button', { name: 'История', exact: true }).click();
  expect(await page.getByRole('button').filter({ hasText: 'Обрыв канала' }).count()).toBe(1);
  expect(errors).toEqual([]);
});

test('new parameters change computed results, snapshots survive edits, and legacy runs stay labelled', async ({
  page,
}) => {
  await page.goto('/workspace/#/scenarios');
  await page.getByText('Использовать резервный маршрут', { exact: true }).click();
  await expect(page.getByLabel('Использовать резервный маршрут')).toBeChecked();
  await page.getByRole('button', { name: 'Запустить сценарий', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('выключите резервный маршрут');
  await page.getByText('Использовать резервный маршрут', { exact: true }).click();
  await expect(page.getByLabel('Использовать резервный маршрут')).not.toBeChecked();
  await page.getByLabel('Отправка датчиков').selectOption('synchronized');
  await page.getByLabel('Буфер для сравнения 1, сообщений').fill('100');
  await page.getByRole('button', { name: 'Запустить сценарий', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Обрыв канала', exact: true });
  await dialog.getByRole('button', { name: 'Ускорить воспроизведение', exact: true }).click();
  await dialog
    .getByRole('button', { name: 'Открыть результаты', exact: true })
    .click({ timeout: 20000 });
  await expect(page.getByRole('columnheader', { name: 'Буфер 100', exact: true })).toBeVisible();
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem('setreserve-workspace-v1')!).state.runs[0],
  );
  expect(before.calculation.sendingMode).toBe('synchronized');
  expect(before.calculation.results[0].lost).toBeGreaterThan(50000);
  await page.getByRole('link', { name: 'Редактор сети', exact: true }).click();
  await page.getByRole('button', { name: 'Параметры', exact: true }).click();
  await page.getByLabel('Количество: Температура').fill('800');
  await page.getByRole('button', { name: 'Запустить сценарий', exact: true }).click();
  await dialog.getByRole('button', { name: 'Ускорить воспроизведение', exact: true }).click();
  await dialog
    .getByRole('button', { name: 'Открыть результаты', exact: true })
    .click({ timeout: 20000 });
  const after = await page.evaluate(
    () => JSON.parse(localStorage.getItem('setreserve-workspace-v1')!).state.runs,
  );
  expect(after[0].calculation.results[0].generated).toBe(84000);
  expect(after[1].calculation).toEqual(before.calculation);
  await page.evaluate(() => {
    const value = JSON.parse(localStorage.getItem('setreserve-workspace-v1')!);
    value.state.runs[0].calculation = undefined;
    localStorage.setItem('setreserve-workspace-v1', JSON.stringify(value));
  });
  await page.reload();
  await expect(page.getByText(/Архивный запуск без расчёта/)).toBeVisible();
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

test('station replay uses the calculation snapshot and can be inspected at a chosen time', async ({page}) => {
  await page.goto('/#/projects');
  await page.getByRole('button',{name:/Исследовать насосную/}).click();
  await expect(page.getByText('700',{exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'Запустить сценарий',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Обрыв канала',exact:true});
  await expect(dialog).toBeVisible();
  const slider=dialog.getByRole('slider',{name:'Время воспроизведения'});
  await slider.fill('280');
  await expect(dialog.getByText('4:40',{exact:true}).first()).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Продолжить',exact:true})).toBeVisible();
  const displayed=await dialog.getByRole('region',{name:'Рассчитанное состояние сети'}).textContent();
  await slider.fill('600');
  await dialog.getByRole('button',{name:'Продолжить',exact:true}).click();
  await dialog.getByRole('button',{name:'Открыть результаты',exact:true}).click();
  const run=await page.evaluate(()=>JSON.parse(localStorage.getItem('setreserve-workspace-v1')!).state.runs[0]);
  const point=run.calculation.results.find((r:{buffer:number})=>r.buffer===8000).points.find((p:{time:number})=>Math.abs(p.time-280)<0.001);
  expect(displayed!.replace(/\s/g,'')).toContain(String(point.queue));
  expect(run.nodeCount).toBe(11);
  await page.getByRole('button',{name:'Какой буфер выбрать?'}).click();
  await expect(page.getByText(/Буфер 8.*наименьший/).first()).toBeVisible();
  await page.getByRole('button',{name:'Воспроизвести / режим показа'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
