import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('output/playwright-clambon');
fs.mkdirSync(OUT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function snapshot(page, name) {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
}

async function getToast(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.clothing-toast');
    if (!el) return { text: '', visible: false };
    return {
      text: String(el.textContent || '').trim(),
      visible: el.classList.contains('visible')
    };
  });
}

async function waitForToastContains(page, needle, timeoutMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const toast = await getToast(page);
    if (toast.text.includes(needle)) return toast.text;
    await sleep(120);
  }
  return null;
}

async function tapKey(page, code, holdMs = 60) {
  await page.keyboard.down(code);
  await sleep(holdMs);
  await page.keyboard.up(code);
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const terrainResponses = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(String(err));
  });
  page.on('response', (resp) => {
    const u = resp.url();
    if (/terrain-data\.js($|\?)/.test(u)) {
      terrainResponses.push({ url: u, status: resp.status() });
    }
  });

  await page.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  await page.waitForFunction(() => !!window.gameUIState?.loadingOverlayEl, null, { timeout: 15000 });
  await page.waitForFunction(() => !window.gameUIState?.loadingOverlayEl?.classList?.contains('active'), null, { timeout: 120000 });
  await page.waitForFunction(() => !!window.gameUIState?.titleActive, null, { timeout: 15000 });

  await snapshot(page, '01_title');

  await page.click('.save-slot-card');
  await page.click('.title-button');

  await page.waitForFunction(() => !window.gameUIState?.titleActive, null, { timeout: 30000 });
  await sleep(1400);
  await snapshot(page, '02_started');

  let gotClambon = false;
  let gotToast = '';

  const directions = ['ArrowRight', 'ArrowLeft'];
  for (const dir of directions) {
    for (let i = 0; i < 80; i++) {
      await page.keyboard.down(dir);
      await sleep(170);
      await page.keyboard.up(dir);

      if (i % 5 === 0) {
        await tapKey(page, 'Space', 70);
      }

      await tapKey(page, 'KeyQ', 50);
      await sleep(120);
      const toast = await getToast(page);
      if (toast.text.includes('クラムボン') && (toast.text.includes('採集') || toast.text.includes('手に入れた'))) {
        gotClambon = true;
        gotToast = toast.text;
        break;
      }
    }
    if (gotClambon) break;
  }

  await snapshot(page, '03_after_search');

  await tapKey(page, 'KeyE', 80);
  await sleep(500);
  await snapshot(page, '04_pouch_open');

  await page.mouse.click(774, 134);
  await sleep(320);
  await snapshot(page, '05_consumable_tab');

  await page.mouse.click(296, 292);
  await sleep(300);
  await snapshot(page, '06_item_menu_open');

  await page.mouse.click(374, 353);
  await sleep(380);
  const discardPrompt = await waitForToastContains(page, '捨てる地点をクリック', 5000);
  await snapshot(page, '07_discard_prompt');

  // Drop near the player so the fast-fall landing can overlap the dropped clambon.
  await page.mouse.click(395, 392);
  await sleep(280);
  await snapshot(page, '08_dropped_clambon');

  let liquidToast = null;
  const offsets = [0, 1, -1, 1, -1, 1, -1, 0];
  for (const dir of offsets) {
    if (dir > 0) {
      await page.keyboard.down('ArrowRight');
      await sleep(220);
      await page.keyboard.up('ArrowRight');
    } else if (dir < 0) {
      await page.keyboard.down('ArrowLeft');
      await sleep(220);
      await page.keyboard.up('ArrowLeft');
    }
    await tapKey(page, 'Space', 85);
    await sleep(90);
    await page.keyboard.down('ArrowDown');
    await sleep(980);
    await page.keyboard.up('ArrowDown');
    await sleep(280);
    liquidToast = await waitForToastContains(page, 'クラムボン液が落ちました', 1500);
    if (liquidToast) break;
  }
  await snapshot(page, '09_after_fastfall');

  const result = {
    gotClambon,
    gotClambonToast: gotToast,
    discardPromptSeen: !!discardPrompt,
    liquidToastSeen: !!liquidToast,
    liquidToastText: liquidToast || '',
    terrainResponses,
    terrainDataLoaded200: terrainResponses.some((r) => r.status === 200),
    consoleErrors
  };

  fs.writeFileSync(path.join(OUT_DIR, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
