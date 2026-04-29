import { db } from "../db";

export async function addBaleChatTables() {
  try {
    console.log("🔄 شروع ایجاد جداول سیستم چت بله...");

    // Create departments table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        is_active INTEGER DEFAULT 1 NOT NULL,
        created_at TEXT DEFAULT (datetime('now')) NOT NULL
      )
    `);

    // Create authorized_phones table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS authorized_phones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL,
        employee_name TEXT,
        department_id INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1 NOT NULL,
        created_at TEXT DEFAULT (datetime('now')) NOT NULL,
        FOREIGN KEY (department_id) REFERENCES departments(id),
        UNIQUE(phone_number, department_id)
      )
    `);

    // Create bale_users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bale_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bale_user_id TEXT UNIQUE NOT NULL,
        bale_chat_id TEXT UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        username TEXT,
        phone_number TEXT,
        department_id INTEGER,
        is_authenticated INTEGER DEFAULT 0 NOT NULL,
        last_active_at TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now')) NOT NULL,
        FOREIGN KEY (department_id) REFERENCES departments(id)
      )
    `);

    // Create bale_conversations table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bale_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        department_id INTEGER NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL,
        last_message_at TEXT,
        created_at TEXT DEFAULT (datetime('now')) NOT NULL,
        updated_at TEXT DEFAULT (datetime('now')) NOT NULL,
        FOREIGN KEY (department_id) REFERENCES departments(id)
      )
    `);

    // Create bale_messages table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bale_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        message_type TEXT DEFAULT 'text' NOT NULL,
        platform TEXT DEFAULT 'web' NOT NULL,
        sender_type TEXT DEFAULT 'customer' NOT NULL,
        bale_user_id INTEGER,
        is_delivered INTEGER DEFAULT 0 NOT NULL,
        sent_at TEXT DEFAULT (datetime('now')) NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES bale_conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (bale_user_id) REFERENCES bale_users(id)
      )
    `);

    console.log("✅ جداول سیستم چت بله با موفقیت ایجاد شد");
  } catch (error) {
    console.error("❌ خطا در ایجاد جداول چت بله:", error);
    throw error;
  }
} 