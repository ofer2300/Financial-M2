import { ProjectBoard, ProjectCard, ProjectColumn } from './types';

const API_BASE_URL = '/api/projects';

export class ProjectApi {
  static async fetchBoard(projectId: string): Promise<ProjectBoard> {
    const response = await fetch(`${API_BASE_URL}/${projectId}/board`);
    if (!response.ok) {
      throw new Error('שגיאה בטעינת נתוני הלוח');
    }
    return response.json();
  }

  static async updateCardPosition(
    projectId: string,
    cardId: string,
    sourceColumnId: string,
    destinationColumnId: string,
    position: number
  ): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${projectId}/cards/${cardId}/move`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceColumnId,
        destinationColumnId,
        position,
      }),
    });
    
    if (!response.ok) {
      throw new Error('שגיאה בעדכון מיקום הכרטיס');
    }
  }

  static async createColumn(projectId: string, column: Omit<ProjectColumn, 'id'>): Promise<ProjectColumn> {
    const response = await fetch(`${API_BASE_URL}/${projectId}/columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(column),
    });
    
    if (!response.ok) {
      throw new Error('שגיאה ביצירת טור חדש');
    }
    return response.json();
  }

  static async createCard(
    projectId: string,
    columnId: string,
    card: Omit<ProjectCard, 'id' | 'status'>
  ): Promise<ProjectCard> {
    const response = await fetch(`${API_BASE_URL}/${projectId}/columns/${columnId}/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(card),
    });
    
    if (!response.ok) {
      throw new Error('שגיאה ביצירת כרטיס חדש');
    }
    return response.json();
  }

  static async updateCard(
    projectId: string,
    cardId: string,
    updates: Partial<ProjectCard>
  ): Promise<ProjectCard> {
    const response = await fetch(`${API_BASE_URL}/${projectId}/cards/${cardId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error('שגיאה בעדכון הכרטיס');
    }
    return response.json();
  }

  static async deleteCard(projectId: string, cardId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${projectId}/cards/${cardId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('שגיאה במחיקת הכרטיס');
    }
  }

  static async deleteColumn(projectId: string, columnId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${projectId}/columns/${columnId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('שגיאה במחיקת הטור');
    }
  }
} 