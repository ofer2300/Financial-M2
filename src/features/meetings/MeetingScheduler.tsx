import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createMeeting, updateMeeting, deleteMeeting, fetchAvailability } from '@/lib/api';
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
  direction: 'rtl' as const,
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
        hour: 'numeric' as const,
        minute: '2-digit' as const,
        hour12: false,
      },
    },
  },
  eventTimeFormat: {
    hour: 'numeric' as const,
    minute: '2-digit' as const,
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
  return false;
}

export function MeetingScheduler() {
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetails & { id?: string } | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // שליפת זמינות משתתפים
  const { data: availability, refetch: refetchAvailability } = useQuery({
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
      refetchAvailability();
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה בקביעת הפגישה',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // עדכון פגישה קיימת
  const updateMeetingMutation = useMutation({
    mutationFn: ({ id, details }: { id: string; details: MeetingDetails }) =>
      updateMeeting(id, details),
    onSuccess: () => {
      toast({
        title: 'הפגישה עודכנה בהצלחה',
        description: 'העדכונים נשלחו למשתתפים',
      });
      setShowDialog(false);
      refetchAvailability();
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה בעדכון הפגישה',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // מחיקת פגישה
  const deleteMeetingMutation = useMutation({
    mutationFn: deleteMeeting,
    onSuccess: () => {
      toast({
        title: 'הפגישה נמחקה בהצלחה',
        description: 'הודעה נשלחה למשתתפים',
      });
      setShowDialog(false);
      refetchAvailability();
    },
    onError: (error: Error) => {
      toast({
        title: 'שגיאה במחיקת הפגישה',
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
    
    setMeetingDetails({
      title: '',
      startTime: selectInfo.start,
      endTime: selectInfo.end,
      participants: [],
      description: '',
      meetingType: 'video',
    });
    
    setShowDialog(true);
  };

  const handleMeetingSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!meetingDetails) return;

    if (checkConflicts(meetingDetails)) {
      toast({
        title: 'קונפליקט בזמנים',
        description: 'קיימת התנגשות עם פגישה אחרת',
        variant: 'destructive',
      });
      return;
    }

    const { id, ...details } = meetingDetails;
    if (id) {
      updateMeetingMutation.mutate({ id, details });
    } else {
      createMeetingMutation.mutate(details);
    }
  };

  const handleDeleteMeeting = () => {
    if (!meetingDetails?.id) return;

    if (window.confirm('האם אתה בטוח שברצונך למחוק את הפגישה?')) {
      deleteMeetingMutation.mutate(meetingDetails.id);
    }
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
        eventClick={(info) => {
          const event = info.event;
          setMeetingDetails({
            id: event.id,
            title: event.title,
            startTime: event.start!,
            endTime: event.end!,
            participants: event.extendedProps.participants || [],
            description: event.extendedProps.description || '',
            meetingType: event.extendedProps.meetingType || 'video',
            recurrence: event.extendedProps.recurrence,
          });
          setShowDialog(true);
        }}
        {...calendarOptions}
      />

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogHeader>
          <h2 className="text-lg font-normal">
            {meetingDetails?.id ? 'עריכת פגישה' : 'קביעת פגישה חדשה'}
          </h2>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleMeetingSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="נושא הפגישה"
              value={meetingDetails?.title || ''}
              onChange={(e) => setMeetingDetails(prev => ({
                ...prev!,
                title: e.target.value,
              }))}
              required
              className="border-gray-200 dark:border-gray-700"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  זמן התחלה
                </label>
                <Input
                  type="datetime-local"
                  value={meetingDetails?.startTime?.toISOString().slice(0, 16)}
                  onChange={(e) => setMeetingDetails(prev => ({
                    ...prev!,
                    startTime: new Date(e.target.value),
                  }))}
                  required
                  className="border-gray-200 dark:border-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  זמן סיום
                </label>
                <Input
                  type="datetime-local"
                  value={meetingDetails?.endTime?.toISOString().slice(0, 16)}
                  onChange={(e) => setMeetingDetails(prev => ({
                    ...prev!,
                    endTime: new Date(e.target.value),
                  }))}
                  required
                  className="border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תיאור
              </label>
              <textarea
                value={meetingDetails?.description || ''}
                onChange={(e) => setMeetingDetails(prev => ({
                  ...prev!,
                  description: e.target.value,
                }))}
                className="w-full min-h-[100px] p-2 border border-gray-200 rounded-md resize-y"
                placeholder="תיאור הפגישה..."
              />
            </div>
            
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

            <div className="flex gap-2">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={createMeetingMutation.isPending || updateMeetingMutation.isPending}
              >
                {meetingDetails?.id ? 'עדכן פגישה' : 'קבע פגישה'}
              </Button>
              {meetingDetails?.id && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteMeeting}
                  disabled={deleteMeetingMutation.isPending}
                >
                  מחק פגישה
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 