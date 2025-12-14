import { chromium, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { execSync } from 'child_process';

const USER_DATA_DIR = path.join(process.cwd(), '.chrome-profile');

function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function findChrome(): string {
  const paths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Try which command
  try {
    const result = execSync('which google-chrome || which chromium', { encoding: 'utf-8' });
    return result.trim();
  } catch {
    throw new Error('Chrome が見つかりません。Google Chrome をインストールしてください。');
  }
}

async function saveAuth(): Promise<void> {
  console.log('[Duolingo Session Saver - Google ログイン対応]');
  console.log('=========================================\n');

  const chromePath = findChrome();
  console.log(`Chrome を使用: ${chromePath}\n`);
  console.log('システムの Chrome を起動します。');
  console.log('Google アカウントでログインしてください。\n');

  // Use system Chrome instead of Playwright's Chromium
  const context: BrowserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    executablePath: chromePath,
    viewport: { width: 1280, height: 800 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-infobars',
      '--disable-extensions',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = await context.newPage();

  try {
    // Navigate to Duolingo Schools
    console.log('Duolingo Schools にアクセスしています...\n');
    await page.goto('https://schools.duolingo.com', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    console.log('===========================================');
    console.log('ブラウザでログインを完了してください。');
    console.log('Google アカウントでのログインも可能です。');
    console.log('===========================================\n');

    // Wait for user to login
    await askQuestion('ログイン完了後、Enter を押してください...');

    // Navigate to classroom to verify login
    await page.goto('https://schools.duolingo.com/classroom', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);

    // Check if logged in
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/sign-in')) {
      console.error('\nエラー: ログインが確認できません。');
      console.error('ブラウザでログインを完了してから再度 Enter を押してください。');
      await askQuestion('準備ができたら Enter を押してください...');
    }

    // Get storage state (cookies + localStorage)
    const storageState = await context.storageState();

    const sessionJson = JSON.stringify(storageState);
    const sessionBase64 = Buffer.from(sessionJson).toString('base64');

    fs.writeFileSync('duolingo-session.txt', sessionBase64);

    console.log('\n✓ セッション情報を保存しました: duolingo-session.txt');
    console.log('\n設定方法:');
    console.log('  gh secret set DUOLINGO_SESSION < duolingo-session.txt');
    console.log('\nまたは .env ファイルに追加:');
    console.log('  DUOLINGO_SESSION=$(cat duolingo-session.txt)');

  } catch (error: any) {
    console.error('\nエラー:', error.message);
    process.exit(1);
  } finally {
    await context.close();
  }
}

saveAuth().catch(console.error);
