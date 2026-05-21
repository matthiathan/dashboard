export type Priority = 'low' | 'medium' | 'high';
export type Status = 'pending' | 'in_progress' | 'resolved';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
}

export enum AppScreen {
  VIDEO = 'VIDEO',
  DASHBOARD = 'DASHBOARD',
  TASKS = 'TASKS',
  CALENDAR = 'CALENDAR',
  CHRONO = 'CHRONO',
  WEATHER = 'WEATHER',
  TRAFFIC = 'TRAFFIC',
  AUTH = 'AUTH'
}

export interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
}
