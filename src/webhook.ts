import { ExportData } from './types';

export async function postToWebhook(webhookUrl: string, data: ExportData): Promise<void> {
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
    throw new Error(`Webhook failed: ${response.status} - ${errorBody}`);
  }
}
