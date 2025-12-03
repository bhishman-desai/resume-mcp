# Resume MCP Server

A Model Context Protocol (MCP) server that hosts your resume data in PostgreSQL. This server provides tools to manage your resume with version control, validation, and safety features.

## Features

- **Resume Management**: Store and manage your resume in PostgreSQL
- **Version Control**: Automatic snapshots on every update with restore capability
- **Validation**: All updates validated using Zod schemas
- **Safety Features**: Automatic backups, path traversal protection, and error handling
- **SOLID Architecture**: Clean separation of concerns with modular structure
- **HTTPS Ready**: Deployable on Render with HTTPS support via SSE transport

## Tools

### `get_resume`
Returns the current resume JSON. No authentication required.

### `update_resume`
Replace the entire resume. Requires `{ resume, apiKey }`.

### `patch_resume`
Merge partial resume data with existing resume. Requires `{ partialResume, apiKey }`.

### `list_versions`
List all snapshot filenames. No authentication required.

### `restore_version`
Restore resume from a snapshot. Requires `{ filename, apiKey }`.

## Installation

1. Clone the repository:
```bash
git clone https://github.com/bhishman-desai/resume-mcp.git
cd resume-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## Configuration

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (preferred for cloud providers)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: Individual database connection parameters
- `DB_SSL`: Set to `true` for SSL connections
- `API_KEY`: API key for protecting update/restore operations
- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: 0.0.0.0)

## Local Development

### Running as MCP Server (stdio mode)

For local development with Cursor, run:
```bash
npm start
```

The server will automatically detect stdio mode and connect via standard input/output.

### Running as HTTP Server

To test HTTP mode locally:
```bash
NODE_ENV=production npm start
```

The server will start on `http://localhost:3000` with SSE endpoint at `/sse`.

## Deployment on Render

### 1. Database Setup

1. Create a PostgreSQL database on Render
2. Copy the Internal Database URL from Render dashboard

### 2. Web Service Setup

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the service:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: `Node`

### 3. Environment Variables

Add these environment variables in Render dashboard:

```
DATABASE_URL=<your_postgres_internal_url>
API_KEY=<your_secure_api_key>
PORT=10000
```

Render automatically provides HTTPS, so your MCP server will be accessible via HTTPS.

### 4. Connecting to Cursor

The MCP server supports two connection modes:

#### Local Development (stdio)
For local development, Cursor automatically connects via stdio when you run:
```bash
npm start
```

#### Remote Deployment (SSE)
For connecting to your deployed server on Render:

1. Get your Render service URL (e.g., `https://your-service.onrender.com`)
2. Configure Cursor to connect to the remote server. The exact configuration depends on your Cursor version, but typically involves:
   - Adding the server URL in Cursor's MCP settings
   - The server exposes an SSE endpoint at `/sse` for MCP connections

**Note**: The MCP server uses SSE transport which allows Cursor to connect without requiring an API key for the connection itself. However, write operations (update_resume, patch_resume, restore_version) still require the API key as a parameter in the tool call.

## Project Structure

```
resume-mcp/
├── src/
│   ├── config/          # Configuration management
│   ├── database/         # PostgreSQL connection and operations
│   ├── validation/       # Zod schemas for validation
│   ├── tools/            # MCP tool implementations
│   └── utils/            # Utility functions (security, error handling)
├── app.js                # Main server entry point
├── package.json
└── .env.example
```

## Safety Features

### Validation
- All resume updates are validated using Zod schemas
- PATCH operations validate partial inputs and merged results
- Invalid data triggers automatic backups

### Automatic Backups
- Every update creates a timestamped backup
- Emergency backups created on validation failures
- Pre-restore backups created before version restoration

### Security
- API key protection for write operations
- Filename sanitization to prevent path traversal
- Input validation on all operations

### Error Handling
- Graceful error handling with user-friendly messages
- Server continues running even with malformed data
- Automatic recovery mechanisms

## Resume Schema

The resume follows a flexible schema that includes:

- Personal information (name, email, phone, location)
- Summary
- Experience (array of work experiences)
- Education (array of education entries)
- Skills (array of strings)
- Certifications (array of certification objects)
- Projects (array of project objects)
- Languages (array of language objects)

The schema uses `.passthrough()` to allow additional custom fields.

## License

MIT

## Author

Bhishman Desai

