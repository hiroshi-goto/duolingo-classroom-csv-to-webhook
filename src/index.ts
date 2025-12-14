import { downloadActivityReportCSV } from './duolingo';
import { parseCSV } from './csv-parser';
import { postToWebhook } from './webhook';
import { Config } from './types';

function getConfig(): Config {
  const duolingoSession = process.env.DUOLINGO_SESSION;
  const webhookUrl = process.env.WEBHOOK_URL;
  const className = process.env.CLASSROOM_NAME;
  const classroomId = process.env.CLASSROOM_ID;
  const headless = process.env.HEADLESS !== 'false';

  if (!duolingoSession) {
    throw new Error('DUOLINGO_SESSION environment variable is required');
  }
  if (!webhookUrl) {
    throw new Error('WEBHOOK_URL environment variable is required');
  }
  if (!className) {
    throw new Error('CLASSROOM_NAME environment variable is required');
  }
  if (!classroomId) {
    throw new Error('CLASSROOM_ID environment variable is required');
  }

  return {
    duolingoSession,
    webhookUrl,
    className,
    classroomId,
    headless,
    screenshotDir: process.env.SCREENSHOT_DIR || './screenshots',
    downloadDir: process.env.DOWNLOAD_DIR || './downloads',
  };
}

async function main(): Promise<void> {
  console.log('[Duolingo CSV Exporter]');

  try {
    const config = getConfig();

    // Step 1: Download CSV
    console.log(`\n[1/3] Downloading CSV from class "${config.className}"...`);
    const csvPath = await downloadActivityReportCSV(config);

    // Step 2: Parse CSV
    console.log('[2/3] Parsing CSV...');
    const exportData = parseCSV(csvPath);
    console.log(`  -> ${exportData.members.length} members found`);

    // Step 3: POST to Webhook
    console.log('[3/3] Posting to Webhook...');
    await postToWebhook(config.webhookUrl, exportData);

    console.log('\nDone!');

  } catch (error) {
    console.error('\nError:', error);
    process.exit(1);
  }
}

main();
