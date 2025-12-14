import { chromium } from 'playwright';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

function getChromeUserDataDir(): string {
  const platform = os.platform();
  const home = os.homedir();

  switch (platform) {
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', 'Google', 'Chrome');
    case 'win32':
      return path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data');
    case 'linux':
      return path.join(home, '.config', 'google-chrome');
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

function getChromeExecutable(): string {
  const platform = os.platform();

  switch (platform) {
    case 'darwin':
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    case 'win32':
      return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    case 'linux':
      return '/usr/bin/google-chrome';
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

async function saveAuth(): Promise<void> {
  console.log('[Duolingo Session Saver]');
  console.log('ローカルの Chrome からセッション情報を取得します...\n');

  const userDataDir = getChromeUserDataDir();
  const executablePath = getChromeExecutable();

  if (!fs.existsSync(userDataDir)) {
    console.error(`Chrome プロファイルが見つかりません: ${userDataDir}`);
    process.exit(1);
  }

  console.log(`Chrome プロファイル: ${userDataDir}`);
  console.log('注意: Chrome を閉じてから実行してください。\n');

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    executablePath,
    channel: 'chrome',
    args: ['--profile-directory=Default'],
  });

  const page = await browser.newPage();

  try {
    await page.goto('https://schools.duolingo.com/classroom');
    await page.waitForTimeout(3000);

    // Check if logged in
    if (page.url().includes('/login')) {
      console.log('Duolingo にログインしていません。');
      console.log('ブラウザでログインして、Enter を押してください...');
      await new Promise<void>((resolve) => {
        process.stdin.once('data', () => resolve());
      });
    }

    // Wait for dashboard
    await page.waitForURL(/schools\.duolingo\.com/, { timeout: 60000 });

    // Get storage state
    const storageState = await browser.storageState();
    const sessionJson = JSON.stringify(storageState);
    const sessionBase64 = Buffer.from(sessionJson).toString('base64');

    fs.writeFileSync('duolingo-session.txt', sessionBase64);

    console.log('\n✓ セッション情報を保存しました: duolingo-session.txt');
    console.log('\n設定方法:');
    console.log('gh secret set DUOLINGO_SESSION < duolingo-session.txt');

  } finally {
    await browser.close();
  }
}

saveAuth().catch(console.error);
