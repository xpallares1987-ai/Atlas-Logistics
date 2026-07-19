import { chromium } from 'playwright';
import path from 'path';

(async () => {
  let browser;
  try {
    console.log('Launching browser...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('favicon.ico')) {
        errors.push(msg.text());
        console.error(`[Browser Error] ${msg.text()}`);
      }
    });
    page.on('pageerror', (exception) => {
      errors.push(exception.message);
      console.error(`[Page Exception] ${exception.message}`);
    });

    const url = 'https://xpallares1987-ai.github.io/BPMN-Modeler/';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    console.log('Checking if application loaded correctly...');
    const title = await page.title();
    console.log(`Page title: ${title}`);

    const canvasVisible = await page.locator('#canvas').isVisible();
    console.log(`BPMN canvas visible: ${canvasVisible}`);

    console.log('Importing local file...');
    const localFilePath = path.resolve('public/xml/diagrams/process-main.bpmn');

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('#btnOpen').click(),
    ]);
    await fileChooser.setFiles(localFilePath);

    // Wait a bit to let the app process the file
    await page.waitForTimeout(2000);

    const taskCount = await page.locator('.djs-element').count();
    console.log(`Elements imported: ${taskCount}`);

    if (errors.length > 0) {
      console.error(`Verification FAILED: ${errors.length} console errors found.`);
      process.exit(1);
    } else {
      console.log(
        'Verification PASSED: 0 console errors and application loaded and imported file successfully.'
      );
      process.exit(0);
    }
  } catch (err) {
    console.error('Script failed:', err);
    if (browser) await browser.close();
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
