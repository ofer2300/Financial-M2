import { ProjectBoard, ProjectCard, ProjectColumn } from './types';

interface PendingAction {
  id: string;
  type: 'MOVE_CARD' | 'CREATE_CARD' | 'UPDATE_CARD' | 'DELETE_CARD' | 'CREATE_COLUMN' | 'DELETE_COLUMN';
  payload: any;
  timestamp: number;
}

export class OfflineManager {
  private static STORAGE_KEY = 'project_board_offline_';
  private projectId: string;
  private pendingActions: PendingAction[] = [];

  constructor(projectId: string) {
    this.projectId = projectId;
    this.loadPendingActions();
  }

  private get storageKey(): string {
    return `${OfflineManager.STORAGE_KEY}${this.projectId}`;
  }

  private loadPendingActions(): void {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        this.pendingActions = JSON.parse(stored);
      } catch (err) {
        console.error('שגיאה בטעינת פעולות ממתינות:', err);
        this.pendingActions = [];
      }
    }
  }

  private savePendingActions(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.pendingActions));
  }

  public addPendingAction(type: PendingAction['type'], payload: any): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const action: PendingAction = {
      id,
      type,
      payload,
      timestamp: Date.now()
    };
    
    this.pendingActions.push(action);
    this.savePendingActions();
    return id;
  }

  public removePendingAction(id: string): void {
    this.pendingActions = this.pendingActions.filter(action => action.id !== id);
    this.savePendingActions();
  }

  public getPendingActions(): PendingAction[] {
    return [...this.pendingActions].sort((a, b) => a.timestamp - b.timestamp);
  }

  public clearPendingActions(): void {
    this.pendingActions = [];
    this.savePendingActions();
  }

  public async syncPendingActions(): Promise<void> {
    const actions = this.getPendingActions();
    
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'MOVE_CARD':
            await this.syncMoveCard(action.payload);
            break;
          case 'CREATE_CARD':
            await this.syncCreateCard(action.payload);
            break;
          case 'UPDATE_CARD':
            await this.syncUpdateCard(action.payload);
            break;
          case 'DELETE_CARD':
            await this.syncDeleteCard(action.payload);
            break;
          case 'CREATE_COLUMN':
            await this.syncCreateColumn(action.payload);
            break;
          case 'DELETE_COLUMN':
            await this.syncDeleteColumn(action.payload);
            break;
        }
        
        this.removePendingAction(action.id);
      } catch (err) {
        console.error(`שגיאה בסנכרון פעולה ${action.type}:`, err);
        // נמשיך לפעולה הבאה
      }
    }
  }

  private async syncMoveCard(payload: any): Promise<void> {
    const { cardId, sourceColumnId, destinationColumnId, position } = payload;
    await fetch(`/api/projects/${this.projectId}/cards/${cardId}/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceColumnId, destinationColumnId, position })
    });
  }

  private async syncCreateCard(payload: any): Promise<void> {
    const { columnId, card } = payload;
    await fetch(`/api/projects/${this.projectId}/columns/${columnId}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card)
    });
  }

  private async syncUpdateCard(payload: any): Promise<void> {
    const { cardId, updates } = payload;
    await fetch(`/api/projects/${this.projectId}/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  }

  private async syncDeleteCard(payload: any): Promise<void> {
    const { cardId } = payload;
    await fetch(`/api/projects/${this.projectId}/cards/${cardId}`, {
      method: 'DELETE'
    });
  }

  private async syncCreateColumn(payload: any): Promise<void> {
    await fetch(`/api/projects/${this.projectId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  private async syncDeleteColumn(payload: any): Promise<void> {
    const { columnId } = payload;
    await fetch(`/api/projects/${this.projectId}/columns/${columnId}`, {
      method: 'DELETE'
    });
  }
} 