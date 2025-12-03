require('dotenv').config();

const config = {
  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'resume_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    connectionString: process.env.DATABASE_URL, // For Render and other cloud providers
  },

  // API Security
  apiKey: process.env.API_KEY || '',

  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
  },

  // MCP Configuration
  mcp: {
    name: process.env.MCP_NAME || 'resume-mcp',
    version: process.env.MCP_VERSION || '1.0.0',
  },
};

// Validate required environment variables
if (!config.database.connectionString && !config.database.host) {
  console.warn('Warning: Database connection not configured. Set DATABASE_URL or DB_HOST.');
}

if (!config.apiKey || config.apiKey.trim().length === 0) {
  console.warn('Warning: API_KEY not set or is empty. Update operations will be rejected.');
}

module.exports = config;

