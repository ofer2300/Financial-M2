import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

type MeetingType = 'video' | 'audio' | 'hybrid';

interface MeetingTypeSelectorProps {
  onChange: (type: MeetingType) => void;
}

export function MeetingTypeSelector({ onChange }: MeetingTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">סוג פגישה</label>
      <RadioGroup
        defaultValue="video"
        onValueChange={(value) => onChange(value as MeetingType)}
        className="flex flex-col space-y-1"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="video" id="video" />
          <Label htmlFor="video">וידאו</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="audio" id="audio" />
          <Label htmlFor="audio">שמע</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="hybrid" id="hybrid" />
          <Label htmlFor="hybrid">היברידי</Label>
        </div>
      </RadioGroup>
    </div>
  );
} 