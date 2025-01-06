import React, { useState } from 'react';

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

export const ParticipantSelector: React.FC<ParticipantSelectorProps> = ({ onSelect }) => {
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // רשימת משתתפים לדוגמה - בפועל זה יגיע מהשרת
  const allParticipants: Participant[] = [
    { id: '1', name: 'ישראל ישראלי', email: 'israel@example.com', role: 'מנהל', department: 'הנהלה' },
    { id: '2', name: 'שרה כהן', email: 'sarah@example.com', role: 'מפתחת', department: 'פיתוח' },
    // ... יש להוסיף עוד משתתפים
  ];

  const filteredParticipants = allParticipants.filter(participant =>
    participant.name.includes(searchTerm) ||
    participant.email.includes(searchTerm) ||
    participant.department.includes(searchTerm)
  );

  const toggleParticipant = (participant: Participant) => {
    const isSelected = selectedParticipants.some(p => p.id === participant.id);
    const newSelection = isSelected
      ? selectedParticipants.filter(p => p.id !== participant.id)
      : [...selectedParticipants, participant];
    
    setSelectedParticipants(newSelection);
    onSelect(newSelection);
  };

  return (
    <div className="participant-selector">
      <div className="search-box">
        <input
          type="text"
          placeholder="חפש משתתפים..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="participants-list">
        {filteredParticipants.map(participant => (
          <div
            key={participant.id}
            className={`participant-item ${
              selectedParticipants.some(p => p.id === participant.id) ? 'selected' : ''
            }`}
            onClick={() => toggleParticipant(participant)}
          >
            <div className="participant-info">
              <div className="participant-name">{participant.name}</div>
              <div className="participant-details">
                {participant.department} | {participant.role}
              </div>
            </div>
            <div className="participant-email">{participant.email}</div>
          </div>
        ))}
      </div>

      <div className="selected-count">
        נבחרו {selectedParticipants.length} משתתפים
      </div>

      <style jsx>{`
        .participant-selector {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem;
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .search-box {
          width: 100%;
        }

        .search-input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.25rem;
          font-size: 1rem;
        }

        .participants-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 300px;
          overflow-y: auto;
        }

        .participant-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.25rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .participant-item:hover {
          background-color: #f7fafc;
        }

        .participant-item.selected {
          background-color: #ebf8ff;
          border-color: #4299e1;
        }

        .participant-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .participant-name {
          font-weight: 500;
        }

        .participant-details {
          font-size: 0.875rem;
          color: #4a5568;
        }

        .participant-email {
          font-size: 0.875rem;
          color: #718096;
        }

        .selected-count {
          text-align: center;
          font-size: 0.875rem;
          color: #4a5568;
          padding-top: 0.5rem;
          border-top: 1px solid #e2e8f0;
        }
      `}</style>
    </div>
  );
}; 