export interface Member {
  full_name: string;
  username: string;
  email: string;
  class: string;
  language: string;
  streak: number;
  completed_units: number;
  completion_rate: string;
  study_days: number;
  total_xp: number;
  study_time: string;
  other: string;
  lessons: number;
}

export interface ExportData {
  exported_at: string;
  members: Member[];
}

export interface Config {
  duolingoSession: string;
  webhookUrl: string;
  className: string;
  headless: boolean;
  screenshotDir: string;
  downloadDir: string;
}
