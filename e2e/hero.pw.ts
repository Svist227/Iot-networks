import { test, expect } from '@playwright/test';

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test('hero design and station entry at ' + viewport.width + 'px', async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: viewport.width === 390 ? 'reduce' : 'no-preference' });
    await page.goto('/#/projects');
    const scene = page.getByRole('img', { name: /^Схема телеметрии:/ });
    await expect(scene).toBeVisible();
    const readFlow = () =>
      scene
        .locator('path')
        .evaluateAll((paths) =>
          paths
            .filter((path) => getComputedStyle(path).animationName !== 'none')
            .map((path) => getComputedStyle(path).strokeDashoffset),
        );
    const initialFlow = await readFlow();
    expect(initialFlow).toHaveLength(4);
    await expect.poll(readFlow).not.toEqual(initialFlow);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const gentleFlow = await readFlow();
    expect(gentleFlow).toHaveLength(4);
    await expect.poll(readFlow).not.toEqual(gentleFlow);
    await expect
      .poll(() => scene.evaluate((el) => el.getAnimations({ subtree: true }).length))
      .toBe(4);
    await expect(scene).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('button', { name: /Исследовать насосную станцию/ }).click();
    await expect(page).toHaveURL(/#\/editor/);
  });
}
