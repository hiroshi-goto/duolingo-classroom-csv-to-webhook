import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { Config } from './types';

const DUOLINGO_LOGIN_URL = 'https://schools.duolingo.com/login';

// Comprehensive stealth script to evade bot detection
const STEALTH_SCRIPT = `
  // Remove webdriver property
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

  // Override plugins to look like a real browser
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const plugins = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
      ];
      plugins.length = 3;
      return plugins;
    }
  });

  // Override languages
  Object.defineProperty(navigator, 'languages', { get: () => ['ja-JP', 'ja', 'en-US', 'en'] });

  // Override platform
  Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });

  // Override hardwareConcurrency
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });

  // Override deviceMemory
  Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });

  // Override maxTouchPoints
  Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });

  // Mock permissions
  const originalQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications' ?
      Promise.resolve({ state: Notification.permission }) :
      originalQuery(parameters)
  );

  // Override WebGL vendor and renderer
  const getParameterProxyHandler = {
    apply: function(target, thisArg, argumentsList) {
      const param = argumentsList[0];
      const gl = thisArg;
      // UNMASKED_VENDOR_WEBGL
      if (param === 37445) {
        return 'Google Inc. (NVIDIA)';
      }
      // UNMASKED_RENDERER_WEBGL
      if (param === 37446) {
        return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0, D3D11)';
      }
      return Reflect.apply(target, thisArg, argumentsList);
    }
  };

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const originalGetParameter = gl.getParameter.bind(gl);
      gl.getParameter = new Proxy(originalGetParameter, getParameterProxyHandler);
    }
  } catch (e) {}

  // Override chrome runtime
  window.chrome = {
    runtime: {},
    loadTimes: function() {},
    csi: function() {},
    app: {}
  };

  // Override Notification
  const originalNotification = window.Notification;
  window.Notification = function(title, options) {
    return new originalNotification(title, options);
  };
  window.Notification.permission = 'default';
  window.Notification.requestPermission = originalNotification.requestPermission.bind(originalNotification);

  // Prevent iframe detection
  Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
    get: function() {
      return window;
    }
  });
`;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function randomDelay(min: number, max: number): Promise<void> {
  const ms = randomInt(min, max);
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function humanType(page: Page, selector: string, text: string): Promise<void> {
  await page.click(selector);
  await randomDelay(300, 600);
  for (const char of text) {
    await page.keyboard.type(char, { delay: randomInt(50, 150) });
  }
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
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--hide-scrollbars',
      '--mute-audio',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-component-extensions-with-background-pages',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-features=TranslateUI',
      '--disable-hang-monitor',
      '--disable-ipc-flooding-protection',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-renderer-backgrounding',
      '--disable-sync',
      '--force-color-profile=srgb',
      '--metrics-recording-only',
      '--no-default-browser-check',
      '--password-store=basic',
      '--use-mock-keychain',
      '--window-size=1920,1080',
    ],
  });

  const context: BrowserContext = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    geolocation: { longitude: 139.6917, latitude: 35.6895 },
    permissions: ['geolocation'],
    colorScheme: 'light',
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    javaScriptEnabled: true,
  });

  // Apply stealth script to all pages
  await context.addInitScript(STEALTH_SCRIPT);

  const page: Page = await context.newPage();

  // Additional page-level stealth
  await page.addInitScript(STEALTH_SCRIPT);

  try {
    // Login page
    await page.goto(DUOLINGO_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await randomDelay(3000, 5000);
    await saveScreenshot(page, '01-login-page', config);

    // Click "Sign in with Google"
    const googleButton = page.locator('button:has-text("Sign in with Google"), a:has-text("Sign in with Google"), [data-test="google-button"]');
    await googleButton.waitFor({ timeout: 30000 });
    await randomDelay(800, 1500);

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      googleButton.click(),
    ]);

    // Apply stealth to popup
    await popup.addInitScript(STEALTH_SCRIPT);

    await randomDelay(3000, 5000);
    await popup.screenshot({ path: path.join(config.screenshotDir, `02-google-popup-${Date.now()}.png`), fullPage: true });

    // Enter email with human-like typing
    await popup.waitForSelector('input[type="email"]', { timeout: 30000 });
    await randomDelay(800, 1500);
    await humanType(popup, 'input[type="email"]', config.googleEmail);
    await randomDelay(500, 1000);
    await popup.click('#identifierNext, button:has-text("Next")');
    await randomDelay(4000, 6000);
    await popup.screenshot({ path: path.join(config.screenshotDir, `03-after-email-${Date.now()}.png`), fullPage: true });

    // Enter password with human-like typing
    await popup.waitForSelector('input[type="password"]', { timeout: 30000 });
    await randomDelay(800, 1500);
    await humanType(popup, 'input[type="password"]', config.googlePassword);
    await randomDelay(500, 1000);
    await popup.click('#passwordNext, button:has-text("Next")');
    await randomDelay(6000, 10000);

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
      await randomDelay(500, 1000);
      await classLink.click();
      await randomDelay(3000, 5000);
    } catch {
      await page.goto(`https://schools.duolingo.com/classroom`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await randomDelay(2000, 4000);
      const classLinkRetry = page.locator(`text="${config.className}"`);
      await randomDelay(500, 1000);
      await classLinkRetry.click();
      await randomDelay(3000, 5000);
    }

    await saveScreenshot(page, '06-class-page', config);

    // Activity tab
    const activityTab = page.locator('a:has-text("Activity"), button:has-text("Activity"), [data-test="activity-tab"]');
    try {
      await activityTab.waitFor({ timeout: 10000 });
      await randomDelay(500, 1000);
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
    await randomDelay(500, 1000);
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
