import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Plus, MoreVertical, X, WifiOff } from 'lucide-react';
import { ProjectColumn, ProjectCard as ProjectCardType, ProjectStatus } from './types';
import { ProjectCard } from './ProjectCard';
import { ProjectApi } from './api';
import { ProjectWebSocket, WebSocketEvent } from './websocket';
import { OfflineManager } from './offline';

interface ProjectBoardProps {
  projectId: string;
}

export const ProjectBoard: React.FC<ProjectBoardProps> = ({ projectId }) => {
  const [columns, setColumns] = useState<ProjectColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasPendingActions, setHasPendingActions] = useState(false);
  const wsRef = useRef<ProjectWebSocket | null>(null);
  const offlineManagerRef = useRef<OfflineManager>(new OfflineManager(projectId));

  // מעקב אחר מצב החיבור
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      offlineManagerRef.current.syncPendingActions().then(() => {
        setHasPendingActions(offlineManagerRef.current.getPendingActions().length > 0);
        fetchBoardData();
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // טעינת נתוני הלוח
  const fetchBoardData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ProjectApi.fetchBoard(projectId);
      setColumns(data.columns);
    } catch (err) {
      setError('שגיאה בטעינת נתוני הלוח');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // טיפול בעדכונים בזמן אמת
  const handleWebSocketEvent = useCallback((event: WebSocketEvent) => {
    setColumns(prevColumns => {
      switch (event.type) {
        case 'CARD_MOVED': {
          const { cardId, sourceColumnId, destinationColumnId, position } = event.payload;
          const newColumns = [...prevColumns];
          
          const sourceColumn = newColumns.find(col => col.id === sourceColumnId);
          const destColumn = newColumns.find(col => col.id === destinationColumnId);
          
          if (!sourceColumn || !destColumn) return prevColumns;
          
          const cardIndex = sourceColumn.cards.findIndex(card => card.id === cardId);
          if (cardIndex === -1) return prevColumns;
          
          const [movedCard] = sourceColumn.cards.splice(cardIndex, 1);
          destColumn.cards.splice(position, 0, { ...movedCard, status: destColumn.status });
          
          return newColumns;
        }
        
        case 'CARD_CREATED': {
          const { columnId, card } = event.payload;
          return prevColumns.map(col =>
            col.id === columnId
              ? { ...col, cards: [...col.cards, card] }
              : col
          );
        }
        
        case 'CARD_UPDATED': {
          const { cardId, updates } = event.payload;
          return prevColumns.map(col => ({
            ...col,
            cards: col.cards.map(card =>
              card.id === cardId ? { ...card, ...updates } : card
            )
          }));
        }
        
        case 'CARD_DELETED': {
          const { columnId, cardId } = event.payload;
          return prevColumns.map(col =>
            col.id === columnId
              ? { ...col, cards: col.cards.filter(card => card.id !== cardId) }
              : col
          );
        }
        
        case 'COLUMN_CREATED': {
          const { column } = event.payload;
          return [...prevColumns, column];
        }
        
        case 'COLUMN_DELETED': {
          const { columnId } = event.payload;
          return prevColumns.filter(col => col.id !== columnId);
        }
        
        default:
          return prevColumns;
      }
    });
  }, []);

  // התחברות ל-WebSocket
  useEffect(() => {
    if (isOnline) {
      wsRef.current = new ProjectWebSocket(projectId);
      const unsubscribe = wsRef.current.subscribe(handleWebSocketEvent);
      
      return () => {
        unsubscribe();
        wsRef.current?.close();
      };
    }
  }, [projectId, handleWebSocketEvent, isOnline]);

  // טעינת נתונים ראשונית
  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  // טיפול בגרירת כרטיס
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const newColumns = [...columns];
    const sourceColumn = newColumns.find(col => col.id === source.droppableId);
    const destColumn = newColumns.find(col => col.id === destination.droppableId);

    if (!sourceColumn || !destColumn) return;

    const [movedCard] = sourceColumn.cards.splice(source.index, 1);
    destColumn.cards.splice(destination.index, 0, {
      ...movedCard,
      status: destColumn.status
    });

    setColumns(newColumns);

    const payload = {
      cardId: movedCard.id,
      sourceColumnId: source.droppableId,
      destinationColumnId: destination.droppableId,
      position: destination.index
    };

    if (isOnline) {
      try {
        await ProjectApi.updateCardPosition(
          projectId,
          movedCard.id,
          source.droppableId,
          destination.droppableId,
          destination.index
        );
      } catch (err) {
        console.error('שגיאה בעדכון מיקום הכרטיס:', err);
        offlineManagerRef.current.addPendingAction('MOVE_CARD', payload);
        setHasPendingActions(true);
      }
    } else {
      offlineManagerRef.current.addPendingAction('MOVE_CARD', payload);
      setHasPendingActions(true);
    }
  };

  // הוספת טור חדש
  const handleAddColumn = async () => {
    const newColumn = {
      title: 'טור חדש',
      status: ProjectStatus.TODO,
      cards: []
    };

    if (isOnline) {
      try {
        const createdColumn = await ProjectApi.createColumn(projectId, newColumn);
        setColumns([...columns, createdColumn]);
      } catch (err) {
        console.error('שגיאה ביצירת טור חדש:', err);
        offlineManagerRef.current.addPendingAction('CREATE_COLUMN', newColumn);
        setHasPendingActions(true);
        setError('שגיאה ביצירת טור חדש');
      }
    } else {
      const tempId = `temp-${Date.now()}`;
      const tempColumn = { ...newColumn, id: tempId };
      setColumns([...columns, tempColumn]);
      offlineManagerRef.current.addPendingAction('CREATE_COLUMN', newColumn);
      setHasPendingActions(true);
    }
  };

  // הוספת כרטיס חדש
  const handleAddCard = async (columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (!column) return;

    const newCard = {
      title: 'כרטיס חדש',
      description: '',
      assignees: [],
      dueDate: null,
      labels: []
    };

    if (isOnline) {
      try {
        const createdCard = await ProjectApi.createCard(projectId, columnId, newCard);
        const newColumns = columns.map(col => {
          if (col.id === columnId) {
            return {
              ...col,
              cards: [...col.cards, createdCard]
            };
          }
          return col;
        });
        setColumns(newColumns);
      } catch (err) {
        console.error('שגיאה ביצירת כרטיס חדש:', err);
        offlineManagerRef.current.addPendingAction('CREATE_CARD', { columnId, card: newCard });
        setHasPendingActions(true);
        setError('שגיאה ביצירת כרטיס חדש');
      }
    } else {
      const tempId = `temp-${Date.now()}`;
      const tempCard = { ...newCard, id: tempId, status: column.status };
      const newColumns = columns.map(col => {
        if (col.id === columnId) {
          return {
            ...col,
            cards: [...col.cards, tempCard]
          };
        }
        return col;
      });
      setColumns(newColumns);
      offlineManagerRef.current.addPendingAction('CREATE_CARD', { columnId, card: newCard });
      setHasPendingActions(true);
    }
  };

  if (loading) return <div>טוען...</div>;
  if (error) return <div>שגיאה: {error}</div>;

  return (
    <div className="h-full min-h-screen bg-gray-100 p-6">
      {!isOnline && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-yellow-100 p-3 text-yellow-800">
          <WifiOff size={20} />
          <span>מצב לא מקוון - השינויים יסונכרנו כשהחיבור יחזור</span>
        </div>
      )}
      {isOnline && hasPendingActions && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-100 p-3 text-blue-800">
          <span>מסנכרן שינויים...</span>
        </div>
      )}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(column => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`w-80 flex-shrink-0 rounded-lg bg-gray-200 p-4 ${
                    snapshot.isDraggingOver ? 'bg-gray-300' : ''
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{column.title}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddCard(column.id)}
                        className="rounded p-1 hover:bg-gray-300"
                      >
                        <Plus size={20} />
                      </button>
                      <button className="rounded p-1 hover:bg-gray-300">
                        <MoreVertical size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {column.cards.map((card, index) => (
                      <Draggable
                        key={card.id}
                        draggableId={card.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <ProjectCard
                              card={card}
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}

          <button
            onClick={handleAddColumn}
            className="flex h-12 w-80 items-center justify-center rounded-lg border-2 border-dashed border-gray-400 text-gray-600 hover:border-gray-600 hover:text-gray-800"
          >
            <Plus size={24} />
            <span className="mr-2">הוסף טור</span>
          </button>
        </div>
      </DragDropContext>
    </div>
  );
};

export default ProjectBoard; 