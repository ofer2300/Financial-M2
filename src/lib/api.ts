import { MeetingDetails } from '@/types/meetings';

export async function fetchAvailability() {
  // לוגיקה לשליפת זמינות משתתפים מהשרת
  return [];
}

export async function createMeeting(meetingDetails: MeetingDetails) {
  // לוגיקה ליצירת פגישה חדשה בשרת
  const response = await fetch('/api/meetings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(meetingDetails),
  });

  if (!response.ok) {
    throw new Error('שגיאה ביצירת הפגישה');
  }

  return response.json();
}

export async function createGoogleCalendarEvent(event: any) {
  // כאן תהיה קריאה לשרת ליצירת אירוע בגוגל קלנדר
  return {};
}

export async function createOutlookCalendarEvent(event: any) {
  // כאן תהיה קריאה לשרת ליצירת אירוע באאוטלוק
  return {};
}

export async function sendEmailInvitation(email: string, event: any) {
  // כאן תהיה קריאה לשרת לשליחת הזמנה במייל
  return {};
}

export async function createConferenceRoom(details: {
  title: string;
  startTime: Date;
  type: 'video' | 'audio' | 'hybrid';
  participants: Array<{ email: string; name: string }>;
}) {
  // כאן תהיה קריאה לשרת ליצירת חדר ועידה
  return {
    id: crypto.randomUUID(),
    url: 'https://meet.example.com/room-id',
    password: '123456'
  };
}

export async function updateMeeting(meetingId: string, meetingDetails: MeetingDetails) {
  // לוגיקה לעדכון פגישה קיימת בשרת
  const response = await fetch(`/api/meetings/${meetingId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(meetingDetails),
  });

  if (!response.ok) {
    throw new Error('שגיאה בעדכון הפגישה');
  }

  return response.json();
}

export async function deleteMeeting(meetingId: string) {
  // לוגיקה למחיקת פגישה מהשרת
  const response = await fetch(`/api/meetings/${meetingId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('שגיאה במחיקת הפגישה');
  }

  return response.json();
} 