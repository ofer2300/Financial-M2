import React, { useState, useEffect } from 'react';
import { ViewMode, Task, Gantt } from 'gantt-task-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Download, Link, AlertTriangle, Users } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import 'gantt-task-react/dist/index.css';

interface GanttTask extends Task {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies?: string[];
  isOnCriticalPath?: boolean;
  assignedResources?: Resource[];
}

interface Resource {
  id: string;
  name: string;
  role: string;
  availability: {
    start: Date;
    end: Date;
    hoursPerDay: number;
  }[];
}

interface Props {
  tasks: GanttTask[];
  resources: Resource[];
  onTaskUpdate: (taskId: string, updates: Partial<GanttTask>) => void;
  onTaskLink: (sourceId: string, targetId: string) => void;
  onTaskUnlink: (sourceId: string, targetId: string) => void;
  onResourceAssign: (taskId: string, resourceId: string) => void;
  onResourceUnassign: (taskId: string, resourceId: string) => void;
}

export function GanttChart({
  tasks,
  resources,
  onTaskUpdate,
  onTaskLink,
  onTaskUnlink,
  onResourceAssign,
  onResourceUnassign,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [isLinking, setIsLinking] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [linkSource, setLinkSource] = useState<string | null>(null);
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [showResources, setShowResources] = useState(true);
  const [isAssigningResource, setIsAssigningResource] = useState(false);

  // חישוב הנתיב הקריטי
  useEffect(() => {
    const calculateCriticalPath = () => {
      // יצירת גרף של המשימות
      const graph = new Map<string, { task: GanttTask; edges: string[] }>();
      tasks.forEach(task => {
        graph.set(task.id, {
          task,
          edges: task.dependencies || [],
        });
      });

      // חישוב הזמן המוקדם ביותר לכל משימה
      const earliestStart = new Map<string, number>();
      const calculateEarliestStart = (taskId: string): number => {
        if (earliestStart.has(taskId)) {
          return earliestStart.get(taskId)!;
        }

        const node = graph.get(taskId);
        if (!node) return 0;

        const dependencies = node.edges;
        const maxDependencyEnd = dependencies.length > 0
          ? Math.max(...dependencies.map(depId => {
              const depNode = graph.get(depId);
              if (!depNode) return 0;
              return calculateEarliestStart(depId) + getDuration(depNode.task);
            }))
          : 0;

        earliestStart.set(taskId, maxDependencyEnd);
        return maxDependencyEnd;
      };

      // חישוב הזמן המאוחר ביותר לכל משימה
      const latestStart = new Map<string, number>();
      const calculateLatestStart = (taskId: string, projectEnd: number): number => {
        if (latestStart.has(taskId)) {
          return latestStart.get(taskId)!;
        }

        const node = graph.get(taskId);
        if (!node) return projectEnd;

        const dependents = Array.from(graph.entries())
          .filter(([_, { edges }]) => edges.includes(taskId))
          .map(([id]) => id);

        const minDependentStart = dependents.length > 0
          ? Math.min(...dependents.map(depId => calculateLatestStart(depId, projectEnd)))
          : projectEnd;

        const start = minDependentStart - getDuration(node.task);
        latestStart.set(taskId, start);
        return start;
      };

      // חישוב משך הפרויקט
      const projectEnd = Math.max(...tasks.map(task => {
        const start = calculateEarliestStart(task.id);
        return start + getDuration(task);
      }));

      // זיהוי משימות בנתיב הקריטי
      tasks.forEach(task => {
        const early = calculateEarliestStart(task.id);
        const late = calculateLatestStart(task.id, projectEnd);
        onTaskUpdate(task.id, { isOnCriticalPath: early === late });
      });
    };

    calculateCriticalPath();
  }, [tasks]);

  // חישוב משך משימה בימים
  const getDuration = (task: GanttTask) => {
    return Math.ceil((task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24));
  };

  // ייצוא לאקסל
  const exportToExcel = () => {
    const data = tasks.map(task => ({
      'שם משימה': task.name,
      'תאריך התחלה': format(task.start, 'dd/MM/yyyy', { locale: he }),
      'תאריך סיום': format(task.end, 'dd/MM/yyyy', { locale: he }),
      'התקדמות': `${task.progress}%`,
      'תלויות': task.dependencies?.join(', ') || '',
      'משאבים': task.assignedResources?.map(r => r.name).join(', ') || '',
      'נתיב קריטי': task.isOnCriticalPath ? 'כן' : 'לא',
    }));

    // כאן יש להוסיף את הלוגיקה של ייצוא לאקסל
  };

  // בדיקת זמינות משאב
  const isResourceAvailable = (resource: Resource, task: GanttTask) => {
    return resource.availability.some(period => 
      period.start <= task.start && period.end >= task.end
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ViewMode.Day}>יום</SelectItem>
              <SelectItem value={ViewMode.Week}>שבוע</SelectItem>
              <SelectItem value={ViewMode.Month}>חודש</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setShowCriticalPath(!showCriticalPath)}
          >
            <AlertTriangle className={`ml-2 h-4 w-4 ${showCriticalPath ? 'text-red-500' : ''}`} />
            נתיב קריטי
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowResources(!showResources)}
          >
            <Users className="ml-2 h-4 w-4" />
            משאבים
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsLinking(!isLinking)}
          >
            <Link className={`ml-2 h-4 w-4 ${isLinking ? 'text-blue-500' : ''}`} />
            קישור משימות
          </Button>

          <Button
            variant="outline"
            onClick={exportToExcel}
          >
            <Download className="ml-2 h-4 w-4" />
            ייצוא
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Gantt
          tasks={tasks.map(task => ({
            ...task,
            styles: {
              backgroundColor: task.isOnCriticalPath && showCriticalPath
                ? '#FEE2E2'
                : undefined,
              progressColor: task.isOnCriticalPath && showCriticalPath
                ? '#EF4444'
                : undefined,
            },
          }))}
          viewMode={viewMode}
          locale="he"
          onSelect={task => {
            if (isLinking) {
              if (linkSource === null) {
                setLinkSource(task.id);
              } else {
                onTaskLink(linkSource, task.id);
                setLinkSource(null);
              }
            } else {
              setSelectedTask(task.id);
              setIsAssigningResource(true);
            }
          }}
          onDateChange={(task, start, end) => {
            onTaskUpdate(task.id, { start, end });
          }}
          onProgressChange={(task, progress) => {
            onTaskUpdate(task.id, { progress });
          }}
          onDoubleClick={() => {
            // כאן אפשר להוסיף לוגיקה לעריכת משימה
          }}
          listCellWidth={showResources ? '200px' : undefined}
          ganttHeight={400}
        />
      </div>

      <Dialog open={isAssigningResource} onOpenChange={setIsAssigningResource}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הקצאת משאבים</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTask && (
              <>
                <div className="font-medium">
                  {tasks.find(t => t.id === selectedTask)?.name}
                </div>
                <div className="space-y-2">
                  {resources.map(resource => {
                    const isAssigned = tasks
                      .find(t => t.id === selectedTask)
                      ?.assignedResources
                      ?.some(r => r.id === resource.id);

                    const isAvailable = isResourceAvailable(
                      resource,
                      tasks.find(t => t.id === selectedTask)!
                    );

                    return (
                      <div
                        key={resource.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div>
                          <div className="font-medium">{resource.name}</div>
                          <div className="text-sm text-gray-500">{resource.role}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isAvailable && (
                            <Badge variant="destructive">לא זמין</Badge>
                          )}
                          <Button
                            variant={isAssigned ? 'destructive' : 'default'}
                            disabled={!isAvailable}
                            onClick={() => {
                              if (isAssigned) {
                                onResourceUnassign(selectedTask, resource.id);
                              } else {
                                onResourceAssign(selectedTask, resource.id);
                              }
                            }}
                          >
                            {isAssigned ? 'הסר' : 'הקצה'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 