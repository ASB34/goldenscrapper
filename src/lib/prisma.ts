// PostgreSQL compatibility wrapper for existing Prisma calls

import { Pool } from 'pg';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Compatibility wrapper to ease migration from Prisma to PostgreSQL
export const prisma = {
  // Products operations
  product: {
    findUnique: async ({ where }: { where: { id: string } }) => {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT * FROM products WHERE id = $1',
          [where.id]
        );
        return result.rows[0] || null;
      } finally {
        client.release();
      }
    },
    
    findMany: async (params?: any) => {
      const client = await pool.connect();
      try {
        let query = 'SELECT * FROM products WHERE 1=1';
        const values: any[] = [];
        let paramCount = 1;

        if (params?.where?.userId) {
          query += ` AND user_id = $${paramCount}`;
          values.push(params.where.userId);
          paramCount++;
        }
        if (params?.where?.user_id) {
          query += ` AND user_id = $${paramCount}`;
          values.push(params.where.user_id);
          paramCount++;
        }
        if (params?.where?.etsyId) {
          query += ` AND etsy_listing_id = $${paramCount}`;
          values.push(params.where.etsyId);
          paramCount++;
        }
        if (params?.where?.etsy_id) {
          query += ` AND etsy_listing_id = $${paramCount}`;
          values.push(params.where.etsy_id);
          paramCount++;
        }
        if (params?.where?.url) {
          query += ` AND source_url = $${paramCount}`;
          values.push(params.where.url);
          paramCount++;
        }

        if (params?.orderBy?.createdAt === 'desc') {
          query += ' ORDER BY created_at DESC';
        } else if (params?.orderBy?.createdAt) {
          query += ' ORDER BY created_at ASC';
        }

        const result = await client.query(query, values);
        return result.rows || [];
      } finally {
        client.release();
      }
    },

    create: async ({ data }: { data: any }) => {
      const client = await pool.connect();
      try {
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `INSERT INTO products (${columns.join(',')}) VALUES (${placeholders}) RETURNING *`;
        const result = await client.query(query, values);
        return result.rows[0];
      } finally {
        client.release();
      }
    },
    
    update: async ({ where, data }: { where: { id: string }, data: any }) => {
      const client = await pool.connect();
      try {
        const updates = Object.keys(data).map((key, i) => `${key} = $${i + 1}`).join(', ');
        const values = [...Object.values(data), where.id];
        
        const query = `UPDATE products SET ${updates}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`;
        const result = await client.query(query, values);
        return result.rows[0];
      } finally {
        client.release();
      }
    },
    
    delete: async ({ where }: { where: { id: string } }) => {
      const client = await pool.connect();
      try {
        await client.query('DELETE FROM products WHERE id = $1', [where.id]);
        return { id: where.id };
      } finally {
        client.release();
      }
    }
  },

  // User settings operations
  apiKeys: {
    findFirst: async (params?: any) => {
      const client = await pool.connect();
      try {
        let query = 'SELECT * FROM user_settings WHERE 1=1';
        const values: any[] = [];

        if (params?.where?.userId) {
          query += ` AND user_id = $1`;
          values.push(params.where.userId);
        }

        query += ' LIMIT 1';
        const result = await client.query(query, values);
        return result.rows[0] || null;
      } finally {
        client.release();
      }
    },
    
    create: async ({ data }: { data: any }) => {
      const client = await pool.connect();
      try {
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `INSERT INTO user_settings (${columns.join(',')}) VALUES (${placeholders}) RETURNING *`;
        const result = await client.query(query, values);
        return result.rows[0];
      } finally {
        client.release();
      }
    },
    
    update: async ({ where, data }: { where: { id: string }, data: any }) => {
      const client = await pool.connect();
      try {
        const updates = Object.keys(data).map((key, i) => `${key} = $${i + 1}`).join(', ');
        const values = [...Object.values(data), where.id];
        
        const query = `UPDATE user_settings SET ${updates}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`;
        const result = await client.query(query, values);
        return result.rows[0];
      } finally {
        client.release();
      }
    },
    
    upsert: async ({ where, create, update }: any) => {
      const client = await pool.connect();
      try {
        const result = await client.query(
          `INSERT INTO user_settings (${Object.keys(create).join(',')}) 
           VALUES (${Object.values(create).map((_, i) => `$${i + 1}`).join(', ')})
           ON CONFLICT (user_id) DO UPDATE SET ${Object.keys(update).map((key, i) => `${key} = $${i + 1}`).join(', ')}
           RETURNING *`,
          [...Object.values(create), ...Object.values(update)]
        );
        return result.rows[0];
      } finally {
        client.release();
      }
    }
  },

  // XAU rates operations
  xauRates: {
    findMany: async (params?: any) => {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT * FROM xau_rates ORDER BY fetched_at DESC'
        );
        return result.rows || [];
      } finally {
        client.release();
      }
    },
    
    create: async ({ data }: { data: any }) => {
      const client = await pool.connect();
      try {
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `INSERT INTO xau_rates (${columns.join(',')}) VALUES (${placeholders}) RETURNING *`;
        const result = await client.query(query, values);
        return result.rows[0];
      } finally {
        client.release();
      }
    }
  },

  // Disconnect method
  $disconnect: async () => {
    await pool.end();
  }
}
