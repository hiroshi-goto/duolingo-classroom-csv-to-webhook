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

  // Support both JWT token and base64 storageState
  let storageState: any;

  if (config.duolingoSession.startsWith('eyJ')) {
    // JWT token format - create storageState with cookie
    storageState = {
      cookies: [
        {
          name: 'jwt_token',
          value: config.duolingoSession,
          domain: '.duolingo.com',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: true,
          sameSite: 'Lax' as const,
        },
        {
          name: 'jwt_token',
          value: config.duolingoSession,
          domain: 'schools.duolingo.com',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: true,
          sameSite: 'Lax' as const,
        },
      ],
      origins: [],
    };
  } else {
    // Base64 encoded storageState format
    const sessionJson = Buffer.from(config.duolingoSession, 'base64').toString('utf-8');
    storageState = JSON.parse(sessionJson);
  }

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
    // Go directly to classroom students page
    const classroomUrl = `https://schools.duolingo.com/classroom/${config.classroomId}/students`;
    await page.goto(classroomUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(3000);
    await saveScreenshot(page, '01-classroom', config);

    // Check if logged in
    if (page.url().includes('/login')) {
      throw new Error('Session expired. Please run save-auth to get a new session.');
    }

    // Export CSV - look for "履歴のエクスポート" (Japanese) or "Export" (English)
    const exportButton = page.getByText('履歴のエクスポート').or(page.getByText('Export history'));
    await exportButton.waitFor({ timeout: 15000 });

    // Set up download promise BEFORE clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
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
