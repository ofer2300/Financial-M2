import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Trash } from 'lucide-react';

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  dueDate: string;
  subTasks?: SubTask[];
  parentId?: string;
  assignee?: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
  limit?: number;
  onRemove?: () => void;
}

export function KanbanColumn({ id, title, color, tasks, limit, onRemove }: Props) {
  const { setNodeRef } = useDroppable({
    id,
  });

  const getCompletionPercentage = (task: Task): number => {
    if (!task.subTasks?.length) return 0;
    const completed = task.subTasks.filter(st => st.completed).length;
    return Math.round((completed / task.subTasks.length) * 100);
  };

  const isOverLimit = limit ? tasks.length >= limit : false;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'p-4 rounded-lg',
        color,
        'min-h-[500px]',
        isOverLimit && 'border-2 border-red-400'
      )}
    >
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {limit && (
            <span className="text-sm text-gray-500">
              {tasks.length} / {limit}
            </span>
          )}
        </div>
        {onRemove && (
          <Button
            variant="ghost"
            size="sm"
            className="hover:text-red-500"
            onClick={onRemove}
          >
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>

      <SortableContext
        items={tasks.map(task => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {tasks.map(task => (
            <div key={task.id} className="relative">
              <KanbanCard task={task} />
              {task.subTasks && task.subTasks.length > 0 && (
                <div className="mt-1 px-3">
                  <Progress value={getCompletionPercentage(task)} />
                </div>
              )}
            </div>
          ))}
        </div>
      </SortableContext>
    </div>
  );
} 