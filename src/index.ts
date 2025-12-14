import { downloadActivityReportCSV } from './duolingo';
import { parseCSV } from './csv-parser';
import { postToWebhook } from './webhook';
import { Config } from './types';

function getConfig(): Config {
  const googleEmail = process.env.GOOGLE_EMAIL;
  const googlePassword = process.env.GOOGLE_PASSWORD;
  const webhookUrl = process.env.WEBHOOK_URL;
  const className = process.env.CLASS_NAME;
  const headless = process.env.HEADLESS !== 'false';

  if (!googleEmail) {
    throw new Error('GOOGLE_EMAIL environment variable is required');
  }
  if (!googlePassword) {
    throw new Error('GOOGLE_PASSWORD environment variable is required');
  }
  if (!webhookUrl) {
    throw new Error('WEBHOOK_URL environment variable is required');
  }
  if (!className) {
    throw new Error('CLASS_NAME environment variable is required');
  }

  return {
    googleEmail,
    googlePassword,
    webhookUrl,
    className,
    headless,
    screenshotDir: process.env.SCREENSHOT_DIR || './screenshots',
    downloadDir: process.env.DOWNLOAD_DIR || './downloads',
  };
}

async function main(): Promise<void> {
  console.log('='.repeat(50));
  console.log('Duolingo Classroom CSV to Webhook');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(50));

  try {
    // Load configuration
    const config = getConfig();
    console.log(`Target class: ${config.className}`);
    console.log(`Headless mode: ${config.headless}`);

    // Step 1: Download CSV from Duolingo Classroom
    console.log('\n[Step 1/3] Downloading CSV from Duolingo Classroom...');
    const csvPath = await downloadActivityReportCSV(config);
    console.log(`CSV saved to: ${csvPath}`);

    // Step 2: Parse CSV to JSON
    console.log('\n[Step 2/3] Parsing CSV to JSON...');
    const exportData = parseCSV(csvPath);
    console.log(`Parsed ${exportData.members.length} members`);
    console.log(`Export timestamp: ${exportData.exported_at}`);

    // Log member summary
    for (const member of exportData.members) {
      console.log(`  - ${member.full_name} (@${member.username}): ${member.total_xp} XP, ${member.streak} day streak`);
    }

    // Step 3: Post to Webhook
    console.log('\n[Step 3/3] Posting to Webhook...');
    await postToWebhook(config.webhookUrl, exportData);

    console.log('\n' + '='.repeat(50));
    console.log('SUCCESS: All steps completed!');
    console.log(`Finished at: ${new Date().toISOString()}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('ERROR: Process failed!');
    console.error(error);
    console.error('='.repeat(50));
    process.exit(1);
  }
}

main();
