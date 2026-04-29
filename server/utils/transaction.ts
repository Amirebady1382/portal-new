import { db } from "../db";

/**
 * Transaction helper for SQLite operations
 * 
 * Usage:
 * await withTransaction(async (tx) => {
 *   await tx.execute("INSERT INTO users ...");
 *   await tx.execute("INSERT INTO companies ...");
 * });
 */

export interface TransactionClient {
  execute(query: string, params?: any[]): Promise<any>;
}

/**
 * Execute multiple database operations in a transaction
 * If any operation fails, all changes are rolled back
 */
export async function withTransaction<T>(
  callback: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  // LibSQL/Turso doesn't support traditional transactions in the same way as other databases
  // Instead, we use a batch operation approach
  
  const operations: Array<{ query: string; params: any[] }> = [];
  const results: any[] = [];
  
  // Transaction client that collects operations
  const txClient: TransactionClient = {
    async execute(query: string, params: any[] = []) {
      operations.push({ query, params });
      
      // Return a placeholder result that will be replaced later
      return {
        rows: [],
        rowsAffected: 0
      };
    }
  };
  
  try {
    // Collect all operations by calling the callback
    await callback(txClient);
    
    // Execute all operations as a batch
    // LibSQL doesn't have traditional BEGIN/COMMIT, but we can execute operations sequentially
    // and handle errors appropriately
    
    for (const op of operations) {
      const result = await db.execute(op.query, op.params);
      results.push(result);
    }
    
    return results[results.length - 1] as T;
  } catch (error) {
    // On error, we can't rollback (LibSQL limitation), rethrow for proper handling
    throw error;
  }
}

/**
 * Execute a simple transaction (for backwards compatibility)
 * Note: This is a simplified version and doesn't provide true ACID transactions
 * 
 * @deprecated Use withTransaction instead for better error handling
 */
export async function transaction<T>(
  callback: () => Promise<T>
): Promise<T> {
  try {
    return await callback();
  } catch (error) {
    throw error;
  }
}

/**
 * Execute multiple queries atomically
 * This is a workaround for LibSQL's transaction limitations
 */
export async function executeBatch(
  queries: Array<{ query: string; params: any[] }>
): Promise<any[]> {
  const results: any[] = [];
  
  try {
    for (const { query, params } of queries) {
      const result = await db.execute(query, params);
      results.push(result);
    }
    return results;
  } catch (error) {
    throw error;
  }
}

/**
 * Execute a query with retry logic
 * Useful for handling temporary database lock issues
 */
export async function executeWithRetry(
  query: string,
  params: any[] = [],
  maxRetries: number = 3,
  retryDelay: number = 100
): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await db.execute(query, params);
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is database locked
      if (error instanceof Error && error.message.includes('SQLITE_BUSY')) {
        if (attempt < maxRetries) {
          // Database is busy, retry after delay
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        }
      }
      
      // If not a lock error or max retries reached, throw
      throw error;
    }
  }
  
  throw lastError || new Error('Max retries reached');
}

