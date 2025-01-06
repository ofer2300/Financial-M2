import { Pool } from 'pg';

// הגדרת חיבור למסד הנתונים
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// הגדרות RLS בסיסיות
export const setupRLS = async () => {
  const client = await pool.connect();
  try {
    // הפעלת RLS
    await client.query('ALTER TABLE users ENABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE messages ENABLE ROW LEVEL SECURITY;');

    // מדיניות לטבלת משתמשים
    await client.query(`
      CREATE POLICY users_isolation_policy ON users
      FOR ALL
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM user_organizations
          WHERE user_organizations.user_id = users.id
          AND user_organizations.organization_id IN (
            SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
          )
        )
      );
    `);

    // מדיניות לטבלת פגישות
    await client.query(`
      CREATE POLICY meetings_access_policy ON meetings
      FOR ALL
      USING (
        creator_id = auth.uid()
        OR id IN (
          SELECT meeting_id FROM meeting_participants
          WHERE user_id = auth.uid()
        )
      );
    `);

    // מדיניות להודעות
    await client.query(`
      CREATE POLICY messages_access_policy ON messages
      FOR ALL
      USING (
        sender_id = auth.uid()
        OR receiver_id = auth.uid()
        OR meeting_id IN (
          SELECT id FROM meetings
          WHERE creator_id = auth.uid()
          OR id IN (
            SELECT meeting_id FROM meeting_participants
            WHERE user_id = auth.uid()
          )
        )
      );
    `);

  } finally {
    client.release();
  }
};

// פונקציות עזר לבדיקת הרשאות
export const checkUserAccess = async (userId: string, targetUserId: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM users
        WHERE id = $1
        AND (
          id = $2
          OR EXISTS (
            SELECT 1 FROM user_organizations
            WHERE user_organizations.user_id = $1
            AND user_organizations.organization_id IN (
              SELECT organization_id FROM user_organizations WHERE user_id = $2
            )
          )
        )
      );
    `, [targetUserId, userId]);
    return result.rows[0].exists;
  } finally {
    client.release();
  }
};

export const checkMeetingAccess = async (userId: string, meetingId: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM meetings
        WHERE id = $1
        AND (
          creator_id = $2
          OR id IN (
            SELECT meeting_id FROM meeting_participants
            WHERE user_id = $2
          )
        )
      );
    `, [meetingId, userId]);
    return result.rows[0].exists;
  } finally {
    client.release();
  }
}; 