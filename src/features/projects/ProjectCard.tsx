import React from 'react';
import { ProjectCard as ProjectCardType } from './types';

interface ProjectCardProps {
  card: ProjectCardType;
  isDragging: boolean;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ card, isDragging }) => {
  return (
    <div
      className={`rounded-lg bg-white p-3 shadow-sm ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <h4 className="mb-2 font-medium">{card.title}</h4>
      {card.description && (
        <p className="mb-2 text-sm text-gray-600">{card.description}</p>
      )}
      
      {card.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {card.labels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {card.assignees.length > 0 && (
        <div className="flex items-center gap-1">
          {card.assignees.map((assignee) => (
            <div
              key={assignee}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-medium"
              title={assignee}
            >
              {assignee.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      )}

      {card.dueDate && (
        <div className="mt-2 text-xs text-gray-500">
          תאריך יעד: {new Date(card.dueDate).toLocaleDateString('he-IL')}
        </div>
      )}
    </div>
  );
}; 