import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Participant {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

interface ParticipantSelectorProps {
  onSelect: (participants: Participant[]) => void;
}

export function ParticipantSelector({ onSelect }: ParticipantSelectorProps) {
  const [selectedParticipants, setSelectedParticipants] = React.useState<Participant[]>([]);

  const handleParticipantSelect = (participantId: string) => {
    // כאן תהיה קריאה לAPI לקבלת פרטי המשתתף
    const participant = {
      id: participantId,
      name: 'משתתף לדוגמה',
      email: 'example@example.com',
      role: 'תפקיד',
      department: 'מחלקה'
    };

    setSelectedParticipants(prev => [...prev, participant]);
    onSelect([...selectedParticipants, participant]);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">בחר משתתפים</label>
      <Select onValueChange={handleParticipantSelect}>
        <SelectTrigger>
          <SelectValue placeholder="בחר משתתף" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">משתתף 1</SelectItem>
          <SelectItem value="2">משתתף 2</SelectItem>
          <SelectItem value="3">משתתף 3</SelectItem>
        </SelectContent>
      </Select>

      <div className="mt-2">
        {selectedParticipants.map(participant => (
          <div key={participant.id} className="flex items-center gap-2 p-2 bg-gray-100 rounded">
            <span>{participant.name}</span>
            <span className="text-sm text-gray-500">({participant.email})</span>
          </div>
        ))}
      </div>
    </div>
  );
} 