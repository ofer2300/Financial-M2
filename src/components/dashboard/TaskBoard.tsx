import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  assigned_to: string;
}

const STATUSES = {
  todo: 'לביצוע',
  in_progress: 'בתהליך',
  done: 'הושלם'
};

export function TaskBoard() {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery<Task[]>(
    ['tasks'],
    async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('priority', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  );

  const updateTaskMutation = useMutation(
    async ({ id, status }: { id: string; status: Task['status'] }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tasks']);
      }
    }
  );

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as Task['status'];

    updateTaskMutation.mutate({ id: draggableId, status: newStatus });
  };

  if (isLoading) return <div>טוען משימות...</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">לוח משימות</h2>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(STATUSES).map(([status, title]) => (
            <div key={status} className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold mb-4">{title}</h3>
              
              <Droppable droppableId={status}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-4"
                  >
                    {tasks
                      .filter((task) => task.status === status)
                      .map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-white rounded p-4 shadow"
                            >
                              <h4 className="font-bold">{task.title}</h4>
                              <p className="text-sm text-gray-600">
                                {task.description}
                              </p>
                              <div className="mt-2 flex justify-between text-sm">
                                <span>תאריך יעד: {task.due_date}</span>
                                <span>אחראי: {task.assigned_to}</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
} 