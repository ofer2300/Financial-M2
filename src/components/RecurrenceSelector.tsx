import React, { useState } from 'react';

interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  endDate?: Date;
}

interface RecurrenceSelectorProps {
  onChange: (recurrence: RecurrencePattern) => void;
}

export const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({ onChange }) => {
  const [recurrence, setRecurrence] = useState<RecurrencePattern>({
    frequency: 'weekly',
    interval: 1,
  });

  const handleFrequencyChange = (frequency: 'daily' | 'weekly' | 'monthly') => {
    const newRecurrence = { ...recurrence, frequency };
    setRecurrence(newRecurrence);
    onChange(newRecurrence);
  };

  const handleIntervalChange = (interval: number) => {
    const newRecurrence = { ...recurrence, interval };
    setRecurrence(newRecurrence);
    onChange(newRecurrence);
  };

  const handleEndDateChange = (endDate: Date | undefined) => {
    const newRecurrence = { ...recurrence, endDate };
    setRecurrence(newRecurrence);
    onChange(newRecurrence);
  };

  return (
    <div className="recurrence-selector">
      <div className="frequency-selector">
        <label>תדירות:</label>
        <div className="button-group">
          <button
            className={`frequency-button ${recurrence.frequency === 'daily' ? 'active' : ''}`}
            onClick={() => handleFrequencyChange('daily')}
          >
            יומי
          </button>
          <button
            className={`frequency-button ${recurrence.frequency === 'weekly' ? 'active' : ''}`}
            onClick={() => handleFrequencyChange('weekly')}
          >
            שבועי
          </button>
          <button
            className={`frequency-button ${recurrence.frequency === 'monthly' ? 'active' : ''}`}
            onClick={() => handleFrequencyChange('monthly')}
          >
            חודשי
          </button>
        </div>
      </div>

      <div className="interval-selector">
        <label>חזור כל:</label>
        <select
          value={recurrence.interval}
          onChange={(e) => handleIntervalChange(Number(e.target.value))}
          className="interval-select"
        >
          {[1, 2, 3, 4, 5, 6].map(num => (
            <option key={num} value={num}>
              {num} {recurrence.frequency === 'daily' ? 'ימים' :
                recurrence.frequency === 'weekly' ? 'שבועות' : 'חודשים'}
            </option>
          ))}
        </select>
      </div>

      <div className="end-date-selector">
        <label>תאריך סיום:</label>
        <input
          type="date"
          onChange={(e) => handleEndDateChange(e.target.value ? new Date(e.target.value) : undefined)}
          className="end-date-input"
        />
      </div>

      <style jsx>{`
        .recurrence-selector {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem;
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .frequency-selector,
        .interval-selector,
        .end-date-selector {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        label {
          font-weight: 500;
          color: #4a5568;
        }

        .button-group {
          display: flex;
          gap: 0.5rem;
        }

        .frequency-button {
          padding: 0.5rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.25rem;
          background: white;
          color: #4a5568;
          cursor: pointer;
          transition: all 0.2s;
        }

        .frequency-button:hover {
          background-color: #f7fafc;
        }

        .frequency-button.active {
          background-color: #4299e1;
          color: white;
          border-color: #4299e1;
        }

        .interval-select,
        .end-date-input {
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.25rem;
          font-size: 1rem;
          color: #4a5568;
        }

        .interval-select:focus,
        .end-date-input:focus {
          outline: none;
          border-color: #4299e1;
          box-shadow: 0 0 0 1px #4299e1;
        }
      `}</style>
    </div>
  );
}; 