import { ExportData } from './types';

export async function postToWebhook(webhookUrl: string, data: ExportData, apiKey?: string): Promise<void> {
  // Dify API format
  if (apiKey) {
    const response = await fetch('https://api.dify.ai/v1/workflows/run', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          exported_at: data.exported_at,
          members: JSON.stringify(data.members),
        },
        response_mode: 'blocking',
        user: 'github-actions',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Dify API failed: ${response.status} - ${errorBody}`);
    }

    const result = await response.json();
    console.log('Dify response:', JSON.stringify(result, null, 2));
    return;
  }

  // Standard webhook format
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
