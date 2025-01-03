import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Plus, X, Save, Filter, Eye } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  assignee?: string;
  tags: string[];
  parentId?: string;
  subtasks: Task[];
  order: number;
}

interface Column {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
}

interface SavedView {
  id: string;
  name: string;
  filters: {
    status?: string[];
    priority?: ('low' | 'medium' | 'high')[];
    assignee?: string[];
    tags?: string[];
    dueDate?: {
      from?: string;
      to?: string;
    };
    hasSubtasks?: boolean;
  };
  columns: Column[];
}

interface Props {
  onTaskCreate: (task: Task) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  onColumnCreate: (column: Column) => void;
  onColumnUpdate: (columnId: string, updates: Partial<Column>) => void;
  onColumnDelete: (columnId: string) => void;
  onViewSave: (view: SavedView) => void;
  onViewLoad: (viewId: string) => void;
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
}

export function KanbanBoard({
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  onColumnCreate,
  onColumnUpdate,
  onColumnDelete,
  onViewSave,
  onViewLoad,
  currentUser,
}: Props) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeFilters, setActiveFilters] = useState<SavedView['filters']>({});
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [isSavingView, setIsSavingView] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({});
  const [newColumn, setNewColumn] = useState<Partial<Column>>({});
  const [newView, setNewView] = useState<Partial<SavedView>>({});
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor)
  );

  // סינון משימות לפי הפילטרים הפעילים
  const filterTasks = (tasks: Task[]): Task[] => {
    return tasks.filter(task => {
      if (activeFilters.status?.length && !activeFilters.status.includes(task.status)) {
        return false;
      }
      if (activeFilters.priority?.length && !activeFilters.priority.includes(task.priority)) {
        return false;
      }
      if (activeFilters.assignee?.length && !activeFilters.assignee.includes(task.assignee || '')) {
        return false;
      }
      if (activeFilters.tags?.length && !task.tags.some(tag => activeFilters.tags?.includes(tag))) {
        return false;
      }
      if (activeFilters.dueDate) {
        const taskDate = task.dueDate ? new Date(task.dueDate) : null;
        if (activeFilters.dueDate.from && taskDate && taskDate < new Date(activeFilters.dueDate.from)) {
          return false;
        }
        if (activeFilters.dueDate.to && taskDate && taskDate > new Date(activeFilters.dueDate.to)) {
          return false;
        }
      }
      if (activeFilters.hasSubtasks !== undefined) {
        if (activeFilters.hasSubtasks && task.subtasks.length === 0) {
          return false;
        }
        if (!activeFilters.hasSubtasks && task.subtasks.length > 0) {
          return false;
        }
      }
      return true;
    });
  };

  // טיפול בהתחלת גרירה
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = columns
      .flatMap(col => col.tasks)
      .find(t => t.id === active.id);
    
    if (task) {
      setActiveTask(task);
    }
  };

  // טיפול בסיום גרירה
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeTask = columns
      .flatMap(col => col.tasks)
      .find(t => t.id === active.id);
    
    const overTask = columns
      .flatMap(col => col.tasks)
      .find(t => t.id === over.id);

    if (!activeTask) return;

    const activeColumn = columns.find(col =>
      col.tasks.some(t => t.id === active.id)
    );
    
    const overColumn = columns.find(col =>
      col.tasks.some(t => t.id === over.id)
    );

    if (!activeColumn || !overColumn) return;

    if (activeColumn.id === overColumn.id) {
      // שינוי סדר בתוך אותה עמודה
      const oldIndex = activeColumn.tasks.findIndex(t => t.id === active.id);
      const newIndex = activeColumn.tasks.findIndex(t => t.id === over.id);

      const newTasks = arrayMove(activeColumn.tasks, oldIndex, newIndex);
      
      setColumns(prev =>
        prev.map(col =>
          col.id === activeColumn.id
            ? { ...col, tasks: newTasks }
            : col
        )
      );

      // עדכון סדר המשימות
      newTasks.forEach((task, index) => {
        onTaskUpdate(task.id, { order: index });
      });
    } else {
      // העברה בין עמודות
      const updatedTask = {
        ...activeTask,
        status: overColumn.id,
      };

      setColumns(prev =>
        prev.map(col => {
          if (col.id === activeColumn.id) {
            return {
              ...col,
              tasks: col.tasks.filter(t => t.id !== active.id),
            };
          }
          if (col.id === overColumn.id) {
            return {
              ...col,
              tasks: [...col.tasks, updatedTask],
            };
          }
          return col;
        })
      );

      onTaskUpdate(activeTask.id, { status: overColumn.id });
    }

    setActiveTask(null);
  };

  // רינדור תת-משימות
  const renderSubtasks = (task: Task, depth = 0) => (
    <div key={task.id} className="space-y-2" style={{ marginRight: `${depth * 20}px` }}>
      <div className="flex items-center justify-between p-2 border rounded">
        <div>
          <div className="font-medium">{task.title}</div>
          <div className="text-sm text-gray-500">{task.description}</div>
          <div className="flex gap-2 mt-1">
            {task.tags.map(tag => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setNewTask({
                title: '',
                description: '',
                status: task.status,
                priority: 'medium',
                tags: [],
                subtasks: [],
                parentId: task.id,
                order: task.subtasks.length,
              });
              setIsCreatingTask(true);
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onTaskDelete(task.id)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {task.subtasks.map(subtask => renderSubtasks(subtask, depth + 1))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">לוח משימות</h2>
        
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Filter className="ml-2 h-4 w-4" />
                סינון
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>סינון משימות</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* כאן יש להוסיף את טופס הסינון */}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Eye className="ml-2 h-4 w-4" />
                תצוגות שמורות
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>תצוגות שמורות</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {savedViews.map(view => (
                  <Button
                    key={view.id}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => onViewLoad(view.id)}
                  >
                    {view.name}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={() => setIsCreatingColumn(true)}
          >
            <Plus className="ml-2 h-4 w-4" />
            עמודה חדשה
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(column => (
            <div
              key={column.id}
              className="flex-shrink-0 w-80 bg-gray-50 rounded-lg p-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h3
                  className="font-medium"
                  style={{ color: column.color }}
                >
                  {column.title}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setNewTask({
                      title: '',
                      description: '',
                      status: column.id,
                      priority: 'medium',
                      tags: [],
                      subtasks: [],
                      order: column.tasks.length,
                    });
                    setIsCreatingTask(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <SortableContext
                items={filterTasks(column.tasks).map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {filterTasks(column.tasks).map(task => renderSubtasks(task))}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="bg-white shadow-lg rounded p-4">
              <div className="font-medium">{activeTask.title}</div>
              <div className="text-sm text-gray-500">{activeTask.description}</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <Dialog open={isCreatingTask} onOpenChange={setIsCreatingTask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>יצירת משימה חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">כותרת</label>
              <Input
                value={newTask.title || ''}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="הזן כותרת..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">תיאור</label>
              <Input
                value={newTask.description || ''}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="הזן תיאור..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">עדיפות</label>
              <Select
                value={newTask.priority}
                onValueChange={(value) => setNewTask({ ...newTask, priority: value as 'low' | 'medium' | 'high' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר עדיפות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">נמוכה</SelectItem>
                  <SelectItem value="medium">בינונית</SelectItem>
                  <SelectItem value="high">גבוהה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsCreatingTask(false)}>
                ביטול
              </Button>
              <Button
                onClick={() => {
                  if (newTask.title) {
                    onTaskCreate({
                      id: `task-${Date.now()}`,
                      ...newTask as Task,
                    });
                    setIsCreatingTask(false);
                    setNewTask({});
                  }
                }}
              >
                צור משימה
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreatingColumn} onOpenChange={setIsCreatingColumn}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>יצירת עמודה חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">כותרת</label>
              <Input
                value={newColumn.title || ''}
                onChange={(e) => setNewColumn({ ...newColumn, title: e.target.value })}
                placeholder="הזן כותרת..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">צבע</label>
              <Input
                type="color"
                value={newColumn.color || '#000000'}
                onChange={(e) => setNewColumn({ ...newColumn, color: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsCreatingColumn(false)}>
                ביטול
              </Button>
              <Button
                onClick={() => {
                  if (newColumn.title) {
                    onColumnCreate({
                      id: `column-${Date.now()}`,
                      tasks: [],
                      ...newColumn as Column,
                    });
                    setIsCreatingColumn(false);
                    setNewColumn({});
                  }
                }}
              >
                צור עמודה
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 