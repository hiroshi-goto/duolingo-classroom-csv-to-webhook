import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { Config } from './types';

async function saveScreenshot(page: Page, name: string, config: Config): Promise<void> {
  const screenshotPath = path.join(config.screenshotDir, `${name}-${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
}

export async function downloadActivityReportCSV(config: Config): Promise<string> {
  if (!fs.existsSync(config.screenshotDir)) {
    fs.mkdirSync(config.screenshotDir, { recursive: true });
  }
  if (!fs.existsSync(config.downloadDir)) {
    fs.mkdirSync(config.downloadDir, { recursive: true });
  }

  // Decode session from base64
  const sessionJson = Buffer.from(config.duolingoSession, 'base64').toString('utf-8');
  const storageState = JSON.parse(sessionJson);

  const browser: Browser = await chromium.launch({
    headless: config.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context: BrowserContext = await browser.newContext({
    storageState,
    viewport: { width: 1920, height: 1080 },
  });

  const page: Page = await context.newPage();

  try {
    // Go directly to classroom
    await page.goto('https://schools.duolingo.com/classroom', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(3000);
    await saveScreenshot(page, '01-classroom', config);

    // Check if logged in
    if (page.url().includes('/login')) {
      throw new Error('Session expired. Please run save-auth to get a new session.');
    }

    // Navigate to class
    const classLink = page.locator(`a:has-text("${config.className}"), [data-test="classroom-card"]:has-text("${config.className}")`);
    await classLink.waitFor({ timeout: 15000 });
    await classLink.click();
    await page.waitForTimeout(3000);
    await saveScreenshot(page, '02-class-page', config);

    // Activity tab
    const activityTab = page.locator('a:has-text("Activity"), button:has-text("Activity"), [data-test="activity-tab"]');
    try {
      await activityTab.waitFor({ timeout: 10000 });
      await activityTab.click();
      await page.waitForTimeout(2000);
    } catch {
      // No activity tab
    }
    await saveScreenshot(page, '03-activity-page', config);

    // Export CSV
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), a:has-text("Export CSV"), [data-test="export-button"]');
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

    await exportButton.waitFor({ timeout: 15000 });
    await exportButton.click();

    const download = await downloadPromise;
    const csvPath = path.join(config.downloadDir, 'activity-report.csv');
    await download.saveAs(csvPath);

    await saveScreenshot(page, '04-after-download', config);

    return csvPath;

  } catch (error) {
    await saveScreenshot(page, 'error', config);
    throw error;
  } finally {
    await browser.close();
  }
}
