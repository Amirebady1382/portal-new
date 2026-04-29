import { db } from '../db';

export async function addAIChatSessionsTables() {
  try {
    console.log('🤖 ایجاد جداول AI Chat Sessions...');

    // Create AI chat sessions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ai_chat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        company_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
      )
    `);

    // Create AI chat messages table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ai_chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        message_type TEXT NOT NULL CHECK (message_type IN ('user', 'ai')),
        content TEXT NOT NULL,
        attachments TEXT, -- JSON array of file names/paths
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES ai_chat_sessions (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await db.execute('CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON ai_chat_sessions (user_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_company_id ON ai_chat_sessions (company_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON ai_chat_messages (session_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created_at ON ai_chat_messages (created_at)');

    console.log('✅ AI Chat Sessions جداول با موفقیت ایجاد شدند');

  } catch (error) {
    console.error('❌ خطا در ایجاد جداول AI Chat Sessions:', error);
    throw error;
  }
}
