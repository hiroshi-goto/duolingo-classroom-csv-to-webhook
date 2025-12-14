import { chromium } from 'playwright';
import * as fs from 'fs';

const DUOLINGO_LOGIN_URL = 'https://schools.duolingo.com/login';

async function saveAuth(): Promise<void> {
  console.log('[Duolingo Session Saver]');
  console.log('ブラウザを起動します。Googleでログインしてください。\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--window-size=1280,800'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  await page.goto(DUOLINGO_LOGIN_URL);

  console.log('ログイン後、Duolingo Schools のダッシュボードが表示されたら Enter を押してください...');

  // Wait for user input
  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => resolve());
  });

  // Check if logged in
  const url = page.url();
  if (!url.includes('schools.duolingo.com')) {
    console.error('エラー: Duolingo Schools にログインできていません。');
    await browser.close();
    process.exit(1);
  }

  // Save storage state
  const storageState = await context.storageState();
  const sessionJson = JSON.stringify(storageState);
  const sessionBase64 = Buffer.from(sessionJson).toString('base64');

  // Save to file
  fs.writeFileSync('duolingo-session.txt', sessionBase64);

  console.log('\n✓ セッション情報を保存しました: duolingo-session.txt');
  console.log('\n次のステップ:');
  console.log('1. GitHub リポジトリの Settings > Secrets > Actions に移動');
  console.log('2. "New repository secret" をクリック');
  console.log('3. Name: DUOLINGO_SESSION');
  console.log('4. Value: duolingo-session.txt の内容を貼り付け');
  console.log('\nまたは gh コマンドで設定:');
  console.log('gh secret set DUOLINGO_SESSION < duolingo-session.txt');

  await browser.close();
}

saveAuth().catch(console.error);
