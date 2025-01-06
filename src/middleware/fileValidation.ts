import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import crypto from 'crypto';
import { promisify } from 'util';
import { FileValidationError } from '../types/errors';
import { FileConfig, FileValidationResult, FileType } from '../types/files';

// קבועים
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const CHUNK_SIZE = 64 * 1024; // 64KB לקריאת קבצים
const MIME_TYPES = new Map<FileType, string[]>([
  ['image', ['image/jpeg', 'image/png', 'image/gif']],
  ['document', ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']],
  ['media', ['video/mp4', 'audio/mpeg', 'audio/wav']]
]);

const ALLOWED_FILE_TYPES: FileConfig = {
  image: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif'],
    maxSize: 5 * 1024 * 1024, // 5MB
    mimeTypes: MIME_TYPES.get('image') || []
  },
  document: {
    extensions: ['.pdf', '.doc', '.docx', '.txt'],
    maxSize: 10 * 1024 * 1024, // 10MB
    mimeTypes: MIME_TYPES.get('document') || []
  },
  media: {
    extensions: ['.mp4', '.mp3', '.wav'],
    maxSize: 50 * 1024 * 1024, // 50MB
    mimeTypes: MIME_TYPES.get('media') || []
  }
};

// יצירת שם קובץ מאובטח
const generateSecureFilename = (originalname: string): string => {
  const ext = path.extname(originalname);
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(16).toString('hex');
  return `${timestamp}-${randomString}${ext}`;
};

// הגדרות אחסון מתקדמות
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fileType = getFileType(file);
    const uploadDir = path.join(process.env.UPLOAD_DIR || 'uploads', fileType);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, generateSecureFilename(file.originalname));
  }
});

// זיהוי סוג קובץ
const getFileType = (file: Express.Multer.File): FileType => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  for (const [type, config] of Object.entries(ALLOWED_FILE_TYPES)) {
    if (config.extensions.includes(ext) && config.mimeTypes.includes(file.mimetype)) {
      return type as FileType;
    }
  }
  throw new FileValidationError('סוג קובץ לא נתמך');
};

// בדיקת תוכן קובץ
const validateFileContent = async (file: Express.Multer.File): Promise<FileValidationResult> => {
  const fileType = getFileType(file);
  const config = ALLOWED_FILE_TYPES[fileType];
  
  // בדיקת גודל
  if (file.size > config.maxSize) {
    return { isValid: false, error: 'גודל הקובץ חורג מהמותר' };
  }
  
  // בדיקת סיומת
  const ext = path.extname(file.originalname).toLowerCase();
  if (!config.extensions.includes(ext)) {
    return { isValid: false, error: 'סיומת קובץ לא חוקית' };
  }
  
  // בדיקת MIME
  if (!config.mimeTypes.includes(file.mimetype)) {
    return { isValid: false, error: 'סוג MIME לא תקין' };
  }
  
  return { isValid: true };
};

// פילטר קבצים מתקדם
const fileFilter = async (req: Request, file: Express.Multer.File, cb: FileFilterCallback): Promise<void> => {
  try {
    // בדיקת שם קובץ
    if (file.originalname.match(/[<>:"/\\|?*\x00-\x1F]/)) {
      throw new FileValidationError('שם קובץ מכיל תווים לא חוקיים');
    }
    
    // בדיקת קבצים מסוכנים
    if (file.originalname.match(/\.(exe|bat|cmd|sh|php|pl|py|js)$/i)) {
      throw new FileValidationError('סוג קובץ מסוכן');
    }
    
    // בדיקת תוכן
    const validationResult = await validateFileContent(file);
    if (!validationResult.isValid) {
      throw new FileValidationError(validationResult.error || 'שגיאה בולידציית קובץ');
    }
    
    cb(null, true);
  } catch (error) {
    cb(error as Error);
  }
};

// Middleware ראשי
export const fileUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5 // מקסימום קבצים בו-זמנית
  }
});

// Middleware לולידציה נוספת
export const validateFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file && !req.files) {
      throw new FileValidationError('לא נבחר קובץ');
    }

    const files = req.files ? (Array.isArray(req.files) ? req.files : [req.files]) : [req.file];
    
    for (const file of files) {
      if (!file) continue;
      
      const validationResult = await validateFileContent(file);
      if (!validationResult.isValid) {
        throw new FileValidationError(validationResult.error || 'שגיאה בולידציית קובץ');
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware לסריקת וירוסים
export const scanFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const files = req.files ? (Array.isArray(req.files) ? req.files : [req.files]) : [req.file];
    
    for (const file of files) {
      if (!file) continue;
      
      // קריאת הקובץ בחלקים למניעת עומס זיכרון
      const readChunk = promisify(require('read-chunk'));
      let offset = 0;
      
      while (offset < file.size) {
        const chunk = await readChunk(file.path, offset, Math.min(CHUNK_SIZE, file.size - offset));
        
        // בדיקת חתימות זדוניות
        if (chunk.includes(Buffer.from('virus_signature')) || 
            chunk.includes(Buffer.from('malware_pattern'))) {
          throw new FileValidationError('נמצא תוכן חשוד בקובץ');
        }
        
        offset += CHUNK_SIZE;
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
}; 