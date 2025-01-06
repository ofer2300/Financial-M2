export type FileType = 'image' | 'document' | 'media';

export interface FileTypeConfig {
  extensions: string[];
  maxSize: number;
  mimeTypes: string[];
}

export interface FileConfig {
  [key: string]: FileTypeConfig;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
}

export interface FileUploadOptions {
  maxSize: number;
  allowedTypes: FileType[];
  destination: string;
  maxFiles?: number;
}

export interface FileUploadResult {
  success: boolean;
  files?: UploadedFile[];
  error?: string;
} 