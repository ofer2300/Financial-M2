import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createMeeting, fetchAvailability } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { ParticipantSelector } from '@/components/ParticipantSelector';
import { RecurrenceSelector } from '@/components/RecurrenceSelector';
import { MeetingTypeSelector } from '@/components/MeetingTypeSelector';

interface Participant {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  availability?: string[];
}

interface MeetingDetails {
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

const calendarOptions = {
  slotMinTime: '07:00:00',
  slotMaxTime: '20:00:00',
  allDaySlot: false,
  locale: 'he',
  direction: 'rtl',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
  },
  buttonText: {
    today: 'היום',
    month: 'חודש',
    week: 'שבוע',
    day: 'יום',
  },
  views: {
    timeGrid: {
      dayMaxEvents: true,
      dayMinWidth: 120,
      slotDuration: '00:15:00',
      slotLabelFormat: {
        hour: 'numeric',
        minute: '2-digit',
        hour12: false,
      },
    },
  },
  eventTimeFormat: {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  },
  eventDisplay: 'block',
  eventColor: '#4f46e5',
  eventTextColor: '#ffffff',
  eventBorderColor: 'transparent',
  eventClassNames: 'rounded-md shadow-sm',
};

// פונקציות עזר
function checkConflicts(meetingDetails: MeetingDetails): boolean {
  // לוגיקה לבדיקת קונפליקטים
}

function handleMeetingSubmit(meetingDetails: MeetingDetails): void {
  // לוגיקה לטיפול בהגשת פגישה
}

export function MeetingScheduler() {
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetails | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // שליפת זמינות משתתפים
  const { data: availability } = useQuery({
    queryKey: ['availability'],
    queryFn: fetchAvailability,
  });

  // יצירת פגישה חדשה
  const createMeetingMutation = useMutation({
    mutationFn: createMeeting,
    onSuccess: () => {
      toast({
        title: 'הפגישה נקבעה בהצלחה',
        description: 'הזמנות נשלחו למשתתפים',
      });
      setShowDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה בקביעת הפגישה',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDateSelect = (selectInfo: any) => {
    setSelectedSlot({
      start: selectInfo.start,
      end: selectInfo.end,
    });
    setShowDialog(true);
  };

  return (
    <div className="space-y-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        selectable={true}
        selectMirror={true}
        events={availability}
        select={handleDateSelect}
        {...calendarOptions}
      />

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogHeader>
          <h2 className="text-lg font-normal">קביעת פגישה חדשה</h2>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleMeetingSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="נושא הפגישה"
              onChange={(e) => setMeetingDetails(prev => ({
                ...prev!,
                title: e.target.value,
              }))}
              required
              className="border-gray-200 dark:border-gray-700"
            />
            
            <ParticipantSelector
              onSelect={(participants) => setMeetingDetails(prev => ({
                ...prev!,
                participants,
              }))}
            />

            <RecurrenceSelector
              onChange={(recurrence) => setMeetingDetails(prev => ({
                ...prev!,
                recurrence,
              }))}
            />

            <MeetingTypeSelector
              onChange={(type) => setMeetingDetails(prev => ({
                ...prev!,
                meetingType: type,
              }))}
            />

            <Button type="submit" className="w-full">
              קבע פגישה
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 