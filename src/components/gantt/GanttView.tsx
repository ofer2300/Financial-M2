import { useState } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { Card } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface GanttTask extends Task {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies?: string[];
  type: 'task' | 'milestone' | 'project';
  isDisabled?: boolean;
  styles?: {
    backgroundColor?: string;
    progressColor?: string;
    progressSelectedColor?: string;
  };
}

interface Props {
  tasks: GanttTask[];
  onTaskChange?: (task: GanttTask) => void;
  onDoubleClick?: (task: GanttTask) => void;
  onDelete?: (taskId: string) => void;
}

export function GanttView({ tasks, onTaskChange, onDoubleClick, onDelete }: Props) {
  const [view, setView] = useState<ViewMode>(ViewMode.Day);
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);

  const handleTaskSelect = (task: GanttTask) => {
    setSelectedTask(task);
  };

  const handleExpanderClick = (task: GanttTask) => {
    setSelectedTask(task);
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">תרשים גאנט</h2>
        
        <Select
          value={view}
          onValueChange={(value) => setView(value as ViewMode)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="בחר תצוגה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ViewMode.Day}>יומי</SelectItem>
            <SelectItem value={ViewMode.Week}>שבועי</SelectItem>
            <SelectItem value={ViewMode.Month}>חודשי</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-[500px] overflow-x-auto" dir="ltr">
        <Gantt
          tasks={tasks}
          viewMode={view}
          onSelect={handleTaskSelect}
          onExpanderClick={handleExpanderClick}
          onDateChange={onTaskChange}
          onDelete={onDelete}
          onDoubleClick={onDoubleClick}
          listCellWidth=""
          columnWidth={60}
          ganttHeight={450}
          todayColor="rgba(252, 211, 77, 0.3)"
          barCornerRadius={4}
          barProgressColor="#2563eb"
          barProgressSelectedColor="#1d4ed8"
          barBackgroundColor="#93c5fd"
          barBackgroundSelectedColor="#60a5fa"
          projectProgressColor="#2563eb"
          projectProgressSelectedColor="#1d4ed8"
          projectBackgroundColor="#93c5fd"
          projectBackgroundSelectedColor="#60a5fa"
          milestoneBackgroundColor="#2563eb"
          milestoneBackgroundSelectedColor="#1d4ed8"
          rtl
        />
      </div>

      {selectedTask && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">{selectedTask.name}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">התחלה:</span>{' '}
              {selectedTask.start.toLocaleDateString()}
            </div>
            <div>
              <span className="text-gray-500">סיום:</span>{' '}
              {selectedTask.end.toLocaleDateString()}
            </div>
            <div>
              <span className="text-gray-500">התקדמות:</span>{' '}
              {selectedTask.progress}%
            </div>
            {selectedTask.dependencies && (
              <div>
                <span className="text-gray-500">תלויות:</span>{' '}
                {selectedTask.dependencies.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
} 