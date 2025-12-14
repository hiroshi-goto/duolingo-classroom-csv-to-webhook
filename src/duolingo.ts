import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import { Config } from './types';

// Apply stealth plugin
chromium.use(StealthPlugin());

const DUOLINGO_LOGIN_URL = 'https://schools.duolingo.com/login';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function randomDelay(min: number, max: number): Promise<void> {
  const ms = randomInt(min, max);
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function humanType(page: any, selector: string, text: string): Promise<void> {
  await page.click(selector);
  await randomDelay(300, 600);
  for (const char of text) {
    await page.keyboard.type(char, { delay: randomInt(50, 150) });
  }
}

async function saveScreenshot(page: any, name: string, config: Config): Promise<void> {
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

  const browser = await chromium.launch({
    headless: config.headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
  });

  const page = await context.newPage();

  try {
    // Login page
    await page.goto(DUOLINGO_LOGIN_URL, { waitUntil: 'networkidle' });
    await randomDelay(2000, 4000);
    await saveScreenshot(page, '01-login-page', config);

    // Click "Sign in with Google"
    const googleButton = page.locator('button:has-text("Sign in with Google"), a:has-text("Sign in with Google"), [data-test="google-button"]');
    await googleButton.waitFor({ timeout: 30000 });
    await randomDelay(500, 1000);

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      googleButton.click(),
    ]);

    await randomDelay(2000, 4000);
    await popup.screenshot({ path: path.join(config.screenshotDir, `02-google-popup-${Date.now()}.png`), fullPage: true });

    // Enter email with human-like typing
    await popup.waitForSelector('input[type="email"]', { timeout: 30000 });
    await randomDelay(500, 1000);
    await humanType(popup, 'input[type="email"]', config.googleEmail);
    await randomDelay(300, 800);
    await popup.click('#identifierNext, button:has-text("Next")');
    await randomDelay(3000, 5000);
    await popup.screenshot({ path: path.join(config.screenshotDir, `03-after-email-${Date.now()}.png`), fullPage: true });

    // Enter password with human-like typing
    await popup.waitForSelector('input[type="password"]', { timeout: 30000 });
    await randomDelay(500, 1000);
    await humanType(popup, 'input[type="password"]', config.googlePassword);
    await randomDelay(300, 800);
    await popup.click('#passwordNext, button:has-text("Next")');
    await randomDelay(5000, 8000);

    try {
      await popup.screenshot({ path: path.join(config.screenshotDir, `04-after-password-${Date.now()}.png`), fullPage: true });
    } catch {
      // Popup closed
    }

    // Wait for redirect
    await page.waitForURL(/schools\.duolingo\.com/, { timeout: 60000 });
    await randomDelay(3000, 5000);
    await saveScreenshot(page, '05-dashboard', config);

    // Navigate to class
    const classLink = page.locator(`a:has-text("${config.className}"), [data-test="classroom-card"]:has-text("${config.className}")`);

    try {
      await classLink.waitFor({ timeout: 15000 });
      await randomDelay(300, 800);
      await classLink.click();
      await randomDelay(3000, 5000);
    } catch {
      await page.goto(`https://schools.duolingo.com/classroom`, { waitUntil: 'networkidle' });
      await randomDelay(2000, 4000);
      const classLinkRetry = page.locator(`text="${config.className}"`);
      await randomDelay(300, 800);
      await classLinkRetry.click();
      await randomDelay(3000, 5000);
    }

    await saveScreenshot(page, '06-class-page', config);

    // Activity tab
    const activityTab = page.locator('a:has-text("Activity"), button:has-text("Activity"), [data-test="activity-tab"]');
    try {
      await activityTab.waitFor({ timeout: 10000 });
      await randomDelay(300, 800);
      await activityTab.click();
      await randomDelay(2000, 4000);
    } catch {
      // No activity tab
    }

    await saveScreenshot(page, '07-activity-page', config);

    // Export CSV
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), a:has-text("Export CSV"), [data-test="export-button"]');
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

    await exportButton.waitFor({ timeout: 15000 });
    await randomDelay(300, 800);
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
