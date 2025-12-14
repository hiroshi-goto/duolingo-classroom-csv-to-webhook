import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { Config } from './types';

const DUOLINGO_LOGIN_URL = 'https://schools.duolingo.com/login';

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

  const browser: Browser = await chromium.launch({
    headless: config.headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const context: BrowserContext = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'en-US',
    timezoneId: 'Asia/Tokyo',
  });

  const page: Page = await context.newPage();

  try {
    // Login page
    await page.goto(DUOLINGO_LOGIN_URL, { waitUntil: 'networkidle' });
    await delay(2000);
    await saveScreenshot(page, '01-login-page', config);

    // Click "Sign in with Google"
    const googleButton = page.locator('button:has-text("Sign in with Google"), a:has-text("Sign in with Google"), [data-test="google-button"]');
    await googleButton.waitFor({ timeout: 10000 });

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      googleButton.click(),
    ]);

    await delay(2000);
    await popup.screenshot({ path: path.join(config.screenshotDir, `02-google-popup-${Date.now()}.png`), fullPage: true });

    // Enter email
    await popup.waitForSelector('input[type="email"]', { timeout: 15000 });
    await popup.fill('input[type="email"]', config.googleEmail);
    await delay(500);
    await popup.click('#identifierNext, button:has-text("Next")');
    await delay(3000);
    await popup.screenshot({ path: path.join(config.screenshotDir, `03-after-email-${Date.now()}.png`), fullPage: true });

    // Enter password
    await popup.waitForSelector('input[type="password"]', { timeout: 15000 });
    await popup.fill('input[type="password"]', config.googlePassword);
    await delay(500);
    await popup.click('#passwordNext, button:has-text("Next")');
    await delay(5000);

    try {
      await popup.screenshot({ path: path.join(config.screenshotDir, `04-after-password-${Date.now()}.png`), fullPage: true });
    } catch {
      // Popup closed
    }

    // Wait for redirect
    await page.waitForURL(/schools\.duolingo\.com/, { timeout: 30000 });
    await delay(3000);
    await saveScreenshot(page, '05-dashboard', config);

    // Navigate to class
    const classLink = page.locator(`a:has-text("${config.className}"), [data-test="classroom-card"]:has-text("${config.className}")`);

    try {
      await classLink.waitFor({ timeout: 10000 });
      await classLink.click();
      await delay(3000);
    } catch {
      await page.goto(`https://schools.duolingo.com/classroom`, { waitUntil: 'networkidle' });
      await delay(2000);
      const classLinkRetry = page.locator(`text="${config.className}"`);
      await classLinkRetry.click();
      await delay(3000);
    }

    await saveScreenshot(page, '06-class-page', config);

    // Activity tab
    const activityTab = page.locator('a:has-text("Activity"), button:has-text("Activity"), [data-test="activity-tab"]');
    try {
      await activityTab.waitFor({ timeout: 5000 });
      await activityTab.click();
      await delay(2000);
    } catch {
      // No activity tab
    }

    await saveScreenshot(page, '07-activity-page', config);

    // Export CSV
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), a:has-text("Export CSV"), [data-test="export-button"]');
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

    await exportButton.waitFor({ timeout: 10000 });
    await exportButton.click();

    const download = await downloadPromise;
    const csvPath = path.join(config.downloadDir, 'activity-report.csv');
    await download.saveAs(csvPath);

    await saveScreenshot(page, '08-after-download', config);

    return csvPath;

  } catch (error) {
    await saveScreenshot(page, 'error', config);
    throw error;
  } finally {
    await browser.close();
  }
}
