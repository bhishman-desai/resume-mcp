const { Pool } = require('pg');
const config = require('../config');

class Database {
  constructor() {
    this.pool = null;
  }

  async connect() {
    try {
      const poolConfig = config.database.connectionString
        ? { connectionString: config.database.connectionString }
        : {
            host: config.database.host,
            port: config.database.port,
            database: config.database.database,
            user: config.database.user,
            password: config.database.password,
            ssl: config.database.ssl,
          };

      this.pool = new Pool(poolConfig);

      // Test connection
      await this.pool.query('SELECT NOW()');

      // Initialize database schema
      await this.initializeSchema();

      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }

  async initializeSchema() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS resumes (
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS resume_versions (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_resume_versions_filename ON resume_versions(filename);
    `;

    await this.pool.query(createTableQuery);

    // Ensure we have at least one resume record
    const result = await this.pool.query('SELECT COUNT(*) FROM resumes');
    if (parseInt(result.rows[0].count, 10) === 0) {
      await this.pool.query('INSERT INTO resumes (data) VALUES ($1)', [{}]);
    }
  }

  async getResume() {
    const result = await this.pool.query(
      'SELECT data FROM resumes ORDER BY id DESC LIMIT 1'
    );
    return result.rows[0]?.data || {};
  }

  async updateResume(resumeData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get current resume for backup
      const currentResult = await client.query(
        'SELECT data FROM resumes ORDER BY id DESC LIMIT 1'
      );
      const currentResume = currentResult.rows[0]?.data || {};

      // Update resume
      await client.query(
        'UPDATE resumes SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM resumes ORDER BY id DESC LIMIT 1)',
        [resumeData]
      );

      // Create backup version
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-${timestamp}.json`;
      await this.createVersion(filename, currentResume);

      await client.query('COMMIT');
      return resumeData;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async patchResume(partialResume) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get current resume
      const currentResult = await client.query(
        'SELECT data FROM resumes ORDER BY id DESC LIMIT 1'
      );
      const currentResume = currentResult.rows[0]?.data || {};

      // Merge with partial
      const mergedResume = { ...currentResume, ...partialResume };

      // Update resume
      await client.query(
        'UPDATE resumes SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM resumes ORDER BY id DESC LIMIT 1)',
        [mergedResume]
      );

      // Create backup version
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-${timestamp}.json`;
      await this.createVersion(filename, currentResume);

      await client.query('COMMIT');
      return mergedResume;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listVersions() {
    const result = await this.pool.query(
      'SELECT filename, created_at FROM resume_versions ORDER BY created_at DESC'
    );
    return result.rows.map((row) => ({
      filename: row.filename,
      createdAt: row.created_at,
    }));
  }

  async getVersion(filename) {
    const result = await this.pool.query(
      'SELECT data FROM resume_versions WHERE filename = $1',
      [filename]
    );
    return result.rows[0]?.data || null;
  }

  async createVersion(filename, resumeData) {
    await this.pool.query(
      'INSERT INTO resume_versions (filename, data) VALUES ($1, $2) ON CONFLICT (filename) DO UPDATE SET data = $2, created_at = CURRENT_TIMESTAMP',
      [filename, resumeData]
    );
  }

  async restoreVersion(filename) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get version data
      const versionResult = await client.query(
        'SELECT data FROM resume_versions WHERE filename = $1',
        [filename]
      );

      if (versionResult.rows.length === 0) {
        throw new Error(`Version ${filename} not found`);
      }

      const versionData = versionResult.rows[0].data;

      // Get current resume for backup
      const currentResult = await client.query(
        'SELECT data FROM resumes ORDER BY id DESC LIMIT 1'
      );
      const currentResume = currentResult.rows[0]?.data || {};

      // Restore version
      await client.query(
        'UPDATE resumes SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM resumes ORDER BY id DESC LIMIT 1)',
        [versionData]
      );

      // Create backup of current before restore
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `pre-restore-${timestamp}.json`;
      await this.createVersion(backupFilename, currentResume);

      await client.query('COMMIT');
      return versionData;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('Database connection closed');
    }
  }
}

module.exports = new Database();

