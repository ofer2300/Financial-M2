import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  endDate?: Date;
}

interface RecurrenceSelectorProps {
  onChange: (recurrence: RecurrencePattern) => void;
}

export function RecurrenceSelector({ onChange }: RecurrenceSelectorProps) {
  const [recurrence, setRecurrence] = React.useState<RecurrencePattern>({
    frequency: 'weekly',
    interval: 1
  });

  const handleFrequencyChange = (frequency: 'daily' | 'weekly' | 'monthly') => {
    const newRecurrence = { ...recurrence, frequency };
    setRecurrence(newRecurrence);
    onChange(newRecurrence);
  };

  const handleIntervalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const interval = parseInt(event.target.value) || 1;
    const newRecurrence = { ...recurrence, interval };
    setRecurrence(newRecurrence);
    onChange(newRecurrence);
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const endDate = event.target.value ? new Date(event.target.value) : undefined;
    const newRecurrence = { ...recurrence, endDate };
    setRecurrence(newRecurrence);
    onChange(newRecurrence);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">תדירות</label>
        <Select onValueChange={handleFrequencyChange} value={recurrence.frequency}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">יומי</SelectItem>
            <SelectItem value="weekly">שבועי</SelectItem>
            <SelectItem value="monthly">חודשי</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium">מרווח</label>
        <Input
          type="number"
          min="1"
          value={recurrence.interval}
          onChange={handleIntervalChange}
          className="w-20"
        />
      </div>

      <div>
        <label className="text-sm font-medium">תאריך סיום (אופציונלי)</label>
        <Input
          type="date"
          onChange={handleEndDateChange}
          value={recurrence.endDate?.toISOString().split('T')[0]}
        />
      </div>
    </div>
  );
} 