import { ExportData } from './types';

export async function postToWebhook(webhookUrl: string, data: ExportData): Promise<void> {
  console.log(`Posting data to webhook: ${webhookUrl}`);
  console.log(`Members count: ${data.members.length}`);

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'DuolingoClassroomExporter/1.0',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Webhook POST failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  console.log(`Webhook POST successful: ${response.status}`);

  // Try to log response body if available
  try {
    const responseBody = await response.text();
    if (responseBody) {
      console.log(`Webhook response: ${responseBody}`);
    }
  } catch {
    // Ignore if response body is not available
  }
}
