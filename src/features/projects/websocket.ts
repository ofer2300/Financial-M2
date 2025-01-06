import { ProjectBoard, ProjectCard, ProjectColumn } from './types';

export type WebSocketEvent = 
  | { type: 'CARD_MOVED'; payload: { cardId: string; sourceColumnId: string; destinationColumnId: string; position: number } }
  | { type: 'CARD_CREATED'; payload: { columnId: string; card: ProjectCard } }
  | { type: 'CARD_UPDATED'; payload: { cardId: string; updates: Partial<ProjectCard> } }
  | { type: 'CARD_DELETED'; payload: { columnId: string; cardId: string } }
  | { type: 'COLUMN_CREATED'; payload: { column: ProjectColumn } }
  | { type: 'COLUMN_DELETED'; payload: { columnId: string } };

export class ProjectWebSocket {
  private ws: WebSocket;
  private eventHandlers: ((event: WebSocketEvent) => void)[] = [];

  constructor(projectId: string) {
    // בפרודקשן צריך להחליף ל-wss עבור HTTPS
    this.ws = new WebSocket(`ws://${window.location.host}/api/projects/${projectId}/ws`);
    
    this.ws.onmessage = (event) => {
      try {
        const wsEvent: WebSocketEvent = JSON.parse(event.data);
        this.eventHandlers.forEach(handler => handler(wsEvent));
      } catch (err) {
        console.error('שגיאה בפענוח הודעת WebSocket:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('חיבור ה-WebSocket נסגר, מנסה להתחבר מחדש...');
      setTimeout(() => {
        new ProjectWebSocket(projectId);
      }, 5000);
    };

    this.ws.onerror = (error) => {
      console.error('שגיאת WebSocket:', error);
    };
  }

  public subscribe(handler: (event: WebSocketEvent) => void): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter(h => h !== handler);
    };
  }

  public close(): void {
    this.ws.close();
  }
} 