import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Bell, Copy, History, Save, Tag, Template } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  defaultDueDate?: number; // ימים מיצירת המשימה
  defaultPriority: 'low' | 'medium' | 'high';
  defaultTags: string[];
  defaultAssignee?: string;
  checklist: string[];
}

interface TaskChange {
  id: string;
  taskId: string;
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
  userId: string;
}

interface TaskReminder {
  id: string;
  taskId: string;
  type: 'due-date' | 'milestone' | 'custom';
  date: string;
  message: string;
  notified: boolean;
}

interface AutoTag {
  id: string;
  pattern: string; // regex או מילות מפתח
  tag: string;
  color: string;
}

interface Props {
  onCreateTask: (task: any) => void;
  onUpdateTask: (taskId: string, updates: any) => void;
  onCreateTemplate: (template: TaskTemplate) => void;
  onSetReminder: (reminder: TaskReminder) => void;
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
}

export function TaskManager({
  onCreateTask,
  onUpdateTask,
  onCreateTemplate,
  onSetReminder,
  currentUser
}: Props) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [taskChanges, setTaskChanges] = useState<TaskChange[]>([]);
  const [reminders, setReminders] = useState<TaskReminder[]>([]);
  const [autoTags, setAutoTags] = useState<AutoTag[]>([]);
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<TaskTemplate>>({});
  
  // מעקב אחר שינויים
  const trackChange = (taskId: string, field: string, oldValue: any, newValue: any) => {
    const change: TaskChange = {
      id: `change-${Date.now()}`,
      taskId,
      field,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
    };
    setTaskChanges([change, ...taskChanges]);
  };

  // יצירת משימה מתבנית
  const createTaskFromTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const dueDate = template.defaultDueDate
      ? new Date(Date.now() + template.defaultDueDate * 24 * 60 * 60 * 1000)
      : undefined;

    const task = {
      id: `task-${Date.now()}`,
      title: template.name,
      description: template.description,
      dueDate: dueDate?.toISOString(),
      priority: template.defaultPriority,
      tags: [...template.defaultTags],
      assignee: template.defaultAssignee,
      checklist: template.checklist.map(item => ({
        id: `checklist-${Date.now()}-${Math.random()}`,
        text: item,
        completed: false,
      })),
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
    };

    onCreateTask(task);
    
    // יצירת תזכורות אוטומטיות
    if (dueDate) {
      const reminder: TaskReminder = {
        id: `reminder-${Date.now()}`,
        taskId: task.id,
        type: 'due-date',
        date: new Date(dueDate.getTime() - 24 * 60 * 60 * 1000).toISOString(), // יום לפני
        message: `המשימה "${task.title}" צריכה להסתיים מחר`,
        notified: false,
      };
      onSetReminder(reminder);
    }
  };

  // תיוג אוטומטי
  const autoTagTask = (task: any) => {
    const newTags = new Set(task.tags);
    
    autoTags.forEach(({ pattern, tag }) => {
      const regex = new RegExp(pattern, 'i');
      if (
        regex.test(task.title) ||
        regex.test(task.description)
      ) {
        newTags.add(tag);
      }
    });

    if (newTags.size !== task.tags.length) {
      const updates = { tags: Array.from(newTags) };
      onUpdateTask(task.id, updates);
      trackChange(task.id, 'tags', task.tags, updates.tags);
    }
  };

  // בדיקת תזכורות
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      reminders
        .filter(r => !r.notified && new Date(r.date) <= now)
        .forEach(reminder => {
          // כאן יש להוסיף את הלוגיקה של שליחת ההתראה
          // למשל באמצעות Notification API או שליחה לשרת
          
          setReminders(prev =>
            prev.map(r =>
              r.id === reminder.id ? { ...r, notified: true } : r
            )
          );
        });
    };

    const interval = setInterval(checkReminders, 60000); // בדיקה כל דקה
    return () => clearInterval(interval);
  }, [reminders]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">ניהול משימות</h2>
        
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Template className="ml-2 h-4 w-4" />
                תבניות משימות
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ניהול תבניות משימות</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={selectedTemplate} onValueChange={createTaskFromTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר תבנית" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => setIsCreatingTemplate(true)}
                >
                  <Plus className="ml-2 h-4 w-4" />
                  צור תבנית חדשה
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <History className="ml-2 h-4 w-4" />
                היסטוריית שינויים
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>היסטוריית שינויים</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {taskChanges.map(change => (
                  <div
                    key={change.id}
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        {format(new Date(change.timestamp), 'dd/MM/yyyy HH:mm', { locale: he })}
                      </span>
                      <span className="text-gray-500">
                        {change.userId === currentUser.id ? 'אתה' : 'משתמש אחר'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">שדה: </span>
                      {change.field}
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-red-500">לפני: </span>
                        {JSON.stringify(change.oldValue)}
                      </div>
                      <div>
                        <span className="text-green-500">אחרי: </span>
                        {JSON.stringify(change.newValue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag className="ml-2 h-4 w-4" />
                תיוג אוטומטי
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>הגדרות תיוג אוטומטי</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {autoTags.map(tag => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div>
                      <div className="font-medium">{tag.tag}</div>
                      <div className="text-sm text-gray-500">
                        תבנית: {tag.pattern}
                      </div>
                    </div>
                    <Badge
                      style={{
                        backgroundColor: tag.color,
                        color: getContrastColor(tag.color),
                      }}
                    >
                      {tag.tag}
                    </Badge>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => {/* פתיחת דיאלוג להוספת תג אוטומטי */}}
                >
                  <Plus className="ml-2 h-4 w-4" />
                  הוסף תג אוטומטי
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={isCreatingTemplate} onOpenChange={setIsCreatingTemplate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>יצירת תבנית חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">שם התבנית</label>
              <Input
                value={newTemplate.name || ''}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="הזן שם לתבנית..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">תיאור</label>
              <Textarea
                value={newTemplate.description || ''}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="הזן תיאור..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">תאריך יעד (ימים מיצירת המשימה)</label>
              <Input
                type="number"
                min={0}
                value={newTemplate.defaultDueDate || ''}
                onChange={(e) => setNewTemplate({ ...newTemplate, defaultDueDate: Number(e.target.value) })}
                placeholder="הזן מספר ימים..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">עדיפות ברירת מחדל</label>
              <Select
                value={newTemplate.defaultPriority}
                onValueChange={(value) => setNewTemplate({ ...newTemplate, defaultPriority: value as 'low' | 'medium' | 'high' })}
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

            <div>
              <label className="text-sm font-medium">רשימת משימות</label>
              <div className="space-y-2">
                {(newTemplate.checklist || []).map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => {
                        const newChecklist = [...(newTemplate.checklist || [])];
                        newChecklist[index] = e.target.value;
                        setNewTemplate({ ...newTemplate, checklist: newChecklist });
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newChecklist = [...(newTemplate.checklist || [])];
                        newChecklist.splice(index, 1);
                        setNewTemplate({ ...newTemplate, checklist: newChecklist });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => setNewTemplate({
                    ...newTemplate,
                    checklist: [...(newTemplate.checklist || []), ''],
                  })}
                >
                  <Plus className="ml-2 h-4 w-4" />
                  הוסף פריט
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsCreatingTemplate(false)}>
                ביטול
              </Button>
              <Button
                onClick={() => {
                  if (newTemplate.name && newTemplate.description) {
                    onCreateTemplate({
                      id: `template-${Date.now()}`,
                      ...newTemplate as TaskTemplate,
                    });
                    setIsCreatingTemplate(false);
                    setNewTemplate({});
                  }
                }}
              >
                שמור תבנית
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// פונקציית עזר לחישוב צבע טקסט מנוגד
function getContrastColor(hexcolor: string) {
  const r = parseInt(hexcolor.slice(1, 3), 16);
  const g = parseInt(hexcolor.slice(3, 5), 16);
  const b = parseInt(hexcolor.slice(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? '#000000' : '#FFFFFF';
} 