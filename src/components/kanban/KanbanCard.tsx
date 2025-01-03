import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { User, Calendar, ListChecks } from 'lucide-react';

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
  task: Task;
  overlay?: boolean;
  onSubTaskToggle?: (taskId: string, subTaskId: string, completed: boolean) => void;
}

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

export function KanbanCard({ task, overlay, onSubTaskToggle }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getCompletionPercentage = (): number => {
    if (!task.subTasks?.length) return 0;
    const completed = task.subTasks.filter(st => st.completed).length;
    return Math.round((completed / task.subTasks.length) * 100);
  };

  const handleSubTaskToggle = (subTaskId: string, completed: boolean) => {
    if (onSubTaskToggle) {
      onSubTaskToggle(task.id, subTaskId, completed);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50',
        overlay && 'rotate-3'
      )}
      {...attributes}
      {...listeners}
    >
      <CardHeader className="p-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
          <Badge className={priorityColors[task.priority]}>
            {task.priority}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 pt-0 space-y-3">
        <p className="text-sm text-gray-500">{task.description}</p>
        
        <div className="flex flex-wrap gap-1">
          {task.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {task.subTasks && task.subTasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <ListChecks className="h-4 w-4" />
              <span>{getCompletionPercentage()}% הושלם</span>
            </div>
            <div className="space-y-1">
              {task.subTasks.map(subTask => (
                <div key={subTask.id} className="flex items-center gap-2">
                  <Checkbox
                    id={subTask.id}
                    checked={subTask.completed}
                    onCheckedChange={(checked) => handleSubTaskToggle(subTask.id, checked as boolean)}
                  />
                  <label
                    htmlFor={subTask.id}
                    className={cn(
                      'text-sm',
                      subTask.completed && 'line-through text-gray-400'
                    )}
                  >
                    {subTask.title}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center text-xs text-gray-500">
          {task.assignee && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{task.assignee}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(task.dueDate), 'dd/MM/yyyy', { locale: he })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 