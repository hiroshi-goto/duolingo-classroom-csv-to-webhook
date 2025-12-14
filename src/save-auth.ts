import { chromium } from 'playwright';
import * as fs from 'fs';

async function saveAuth(): Promise<void> {
  console.log('[Duolingo Session Saver]');
  console.log('Chrome のリモートデバッグポートに接続します...\n');
  console.log('以下の手順で Chrome を起動してください:\n');
  console.log('1. まず現在の Chrome を完全に終了');
  console.log('2. ターミナルで以下を実行:');
  console.log('   google-chrome --remote-debugging-port=9222\n');
  console.log('3. ブラウザで https://schools.duolingo.com にログイン');
  console.log('4. ログイン完了後、このターミナルで Enter を押す\n');

  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => resolve());
  });

  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();

    if (contexts.length === 0) {
      console.error('ブラウザコンテキストが見つかりません');
      process.exit(1);
    }

    const context = contexts[0];
    const pages = context.pages();

    // Find Duolingo page or use first page
    let page = pages.find(p => p.url().includes('duolingo.com')) || pages[0];

    if (!page) {
      console.error('ページが見つかりません');
      process.exit(1);
    }

    // Navigate to Duolingo if not already there
    if (!page.url().includes('schools.duolingo.com')) {
      await page.goto('https://schools.duolingo.com/classroom');
      await page.waitForTimeout(3000);
    }

    // Check if logged in
    if (page.url().includes('/login')) {
      console.error('Duolingo にログインしていません。ブラウザでログインしてから再実行してください。');
      process.exit(1);
    }

    // Get cookies
    const cookies = await context.cookies();
    const storageState = { cookies, origins: [] };

    const sessionJson = JSON.stringify(storageState);
    const sessionBase64 = Buffer.from(sessionJson).toString('base64');

    fs.writeFileSync('duolingo-session.txt', sessionBase64);

    console.log('\n✓ セッション情報を保存しました: duolingo-session.txt');
    console.log('\n設定方法:');
    console.log('gh secret set DUOLINGO_SESSION < duolingo-session.txt');

    // Don't close the browser - user is still using it
  } catch (error: any) {
    if (error.message?.includes('connect')) {
      console.error('\nエラー: Chrome に接続できません。');
      console.error('Chrome が --remote-debugging-port=9222 で起動していることを確認してください。');
    } else {
      console.error('\nエラー:', error.message);
    }
    process.exit(1);
  }
}

saveAuth().catch(console.error);
