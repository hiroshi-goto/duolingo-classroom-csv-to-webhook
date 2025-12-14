import * as fs from 'fs';
import { Member, ExportData } from './types';

// CSV column name mappings (English to JSON key)
const COLUMN_MAPPINGS: Record<string, keyof Member> = {
  'Full name': 'full_name',
  'Name': 'full_name',
  'フルネーム': 'full_name',
  '名前': 'full_name',
  'Username': 'username',
  'ユーザー名': 'username',
  'Email': 'email',
  'メール': 'email',
  'メールアドレス': 'email',
  'Class': 'class',
  'クラス': 'class',
  'Language': 'language',
  '言語': 'language',
  'Streak': 'streak',
  '連続日数': 'streak',
  'Completed units': 'completed_units',
  'Units completed': 'completed_units',
  '完了ユニット': 'completed_units',
  'Completion rate': 'completion_rate',
  '完了率': 'completion_rate',
  'Study days': 'study_days',
  'Days studied': 'study_days',
  '学習日数': 'study_days',
  'Total XP': 'total_xp',
  'XP': 'total_xp',
  '合計XP': 'total_xp',
  'Study time': 'study_time',
  'Time spent': 'study_time',
  '学習時間': 'study_time',
  'Other': 'other',
  'その他': 'other',
  'Lessons': 'lessons',
  'レッスン': 'lessons',
  'Lessons completed': 'lessons',
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

function parseNumber(value: string): number {
  const cleaned = value.replace(/[,\s]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

export function parseCSV(csvPath: string): ExportData {
  console.log(`Parsing CSV file: ${csvPath}`);

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim());

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);
  console.log('CSV Headers:', headers);

  // Map headers to our field names
  const headerMapping: (keyof Member | null)[] = headers.map(header => {
    const trimmed = header.trim();
    return COLUMN_MAPPINGS[trimmed] || null;
  });

  console.log('Header mapping:', headerMapping);

  // Parse data rows
  const members: Member[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    const member: Member = {
      full_name: '',
      username: '',
      email: '',
      class: '',
      language: '',
      streak: 0,
      completed_units: 0,
      completion_rate: '',
      study_days: 0,
      total_xp: 0,
      study_time: '',
      other: '',
      lessons: 0,
    };

    for (let j = 0; j < values.length; j++) {
      const field = headerMapping[j];
      if (!field) continue;

      const value = values[j];

      switch (field) {
        case 'streak':
        case 'completed_units':
        case 'study_days':
        case 'total_xp':
        case 'lessons':
          member[field] = parseNumber(value);
          break;
        default:
          member[field] = value;
      }
    }

    members.push(member);
  }

  console.log(`Parsed ${members.length} members`);

  return {
    exported_at: new Date().toISOString(),
    members,
  };
}
