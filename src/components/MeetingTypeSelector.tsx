import React, { useState } from 'react';

type MeetingType = 'video' | 'audio' | 'hybrid';

interface MeetingTypeSelectorProps {
  onChange: (type: MeetingType) => void;
}

interface MeetingTypeOption {
  type: MeetingType;
  label: string;
  description: string;
  icon: string;
}

const meetingTypes: MeetingTypeOption[] = [
  {
    type: 'video',
    label: 'שיחת וידאו',
    description: 'פגישה עם וידאו ואודיו לכל המשתתפים',
    icon: '🎥',
  },
  {
    type: 'audio',
    label: 'שיחת אודיו',
    description: 'פגישה קולית בלבד',
    icon: '🎤',
  },
  {
    type: 'hybrid',
    label: 'פגישה היברידית',
    description: 'שילוב של משתתפים פיזיים ווירטואליים',
    icon: '🔄',
  },
];

export const MeetingTypeSelector: React.FC<MeetingTypeSelectorProps> = ({ onChange }) => {
  const [selectedType, setSelectedType] = useState<MeetingType>('video');

  const handleTypeChange = (type: MeetingType) => {
    setSelectedType(type);
    onChange(type);
  };

  return (
    <div className="meeting-type-selector">
      <h3 className="title">סוג פגישה</h3>
      
      <div className="types-grid">
        {meetingTypes.map(({ type, label, description, icon }) => (
          <div
            key={type}
            className={`type-card ${selectedType === type ? 'selected' : ''}`}
            onClick={() => handleTypeChange(type)}
          >
            <div className="type-icon">{icon}</div>
            <div className="type-content">
              <h4 className="type-label">{label}</h4>
              <p className="type-description">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .meeting-type-selector {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem;
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .title {
          font-size: 1.125rem;
          font-weight: 500;
          color: #2d3748;
          margin: 0;
        }

        .types-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .type-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .type-card:hover {
          border-color: #4299e1;
          background-color: #f7fafc;
        }

        .type-card.selected {
          border-color: #4299e1;
          background-color: #ebf8ff;
        }

        .type-icon {
          font-size: 1.5rem;
          padding: 0.5rem;
          background-color: #f7fafc;
          border-radius: 0.375rem;
        }

        .type-content {
          flex: 1;
        }

        .type-label {
          font-size: 1rem;
          font-weight: 500;
          color: #2d3748;
          margin: 0 0 0.25rem 0;
        }

        .type-description {
          font-size: 0.875rem;
          color: #718096;
          margin: 0;
        }
      `}</style>
    </div>
  );
}; 