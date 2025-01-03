export interface Participant {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  availability?: string[];
}

export interface MeetingDetails {
  title: string;
  startTime: Date;
  endTime: Date;
  participants: Participant[];
  description: string;
  meetingType: 'video' | 'audio' | 'hybrid';
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
} 