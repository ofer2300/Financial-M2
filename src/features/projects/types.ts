export enum ProjectStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE'
}

export interface ProjectCard {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  assignees: string[];
  dueDate: Date | null;
  labels: string[];
}

export interface ProjectColumn {
  id: string;
  title: string;
  status: ProjectStatus;
  cards: ProjectCard[];
}

export interface ProjectBoard {
  id: string;
  title: string;
  columns: ProjectColumn[];
} 