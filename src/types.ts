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
  TASKS = 'TASKS',
  ENVIRONMENT = 'ENVIRONMENT',
  AUTH = 'AUTH'
}

export interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
}
