import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Video Conference API',
      version: '1.0.0',
      description: 'API למערכת ועידת וידאו',
      contact: {
        name: 'צוות פיתוח',
        email: 'dev@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'שרת פיתוח'
      },
      {
        url: 'https://api.example.com',
        description: 'שרת ייצור'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);

// דוגמאות לתיעוד נתיבים
/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: רישום משתמש חדש
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: המשתמש נרשם בהצלחה
 *       400:
 *         description: נתונים שגויים
 *       409:
 *         description: המשתמש כבר קיים
 */

/**
 * @swagger
 * /api/meetings/create:
 *   post:
 *     summary: יצירת פגישה חדשה
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - startTime
 *             properties:
 *               title:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: integer
 *                 minimum: 15
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: הפגישה נוצרה בהצלחה
 *       400:
 *         description: נתונים שגויים
 *       401:
 *         description: לא מורשה
 */

/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     summary: העלאת קובץ
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: הקובץ הועלה בהצלחה
 *       400:
 *         description: שגיאה בהעלאת הקובץ
 *       401:
 *         description: לא מורשה
 */ 