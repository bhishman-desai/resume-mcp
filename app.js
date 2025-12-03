const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const express = require('express');
const config = require('./src/config');
const database = require('./src/database');
const tools = require('./src/tools');
const { z } = require('zod');

// Initialize Express app for HTTPS deployment
const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'I am alive and kicking 🌱', timestamp: new Date().toISOString() });
});

// MCP Server initialization
async function initializeMCPServer() {
  const server = new McpServer(
    {
      name: config.mcp.name,
      version: config.mcp.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register all tools with appropriate Zod schemas
  for (const tool of tools) {
    if (tool.name === 'update_resume') {
      server.tool(
        tool.name,
        tool.description,
        z.object({
          resume: z.any().describe('The complete resume object'),
          apiKey: z.string().describe('API key for authentication'),
        }),
        async (args, extra) => {
          return await tool.handler(args);
        }
      );
    } else if (tool.name === 'patch_resume') {
      server.tool(
        tool.name,
        tool.description,
        z.object({
          partialResume: z.any().describe('Partial resume object with fields to update'),
          apiKey: z.string().describe('API key for authentication'),
        }),
        async (args, extra) => {
          return await tool.handler(args);
        }
      );
    } else if (tool.name === 'restore_version') {
      server.tool(
        tool.name,
        tool.description,
        z.object({
          filename: z.string().describe('The snapshot filename to restore from'),
          apiKey: z.string().describe('API key for authentication'),
        }),
        async (args, extra) => {
          return await tool.handler(args);
        }
      );
    } else {
      // Tools with no input schema (get_resume, list_versions)
      server.tool(
        tool.name,
        tool.description,
        {},
        async (args, extra) => {
          return await tool.handler(args);
        }
      );
    }
  }

  return server;
}

// Main function
async function main() {
  try {
    // Connect to database
    await database.connect();

    // Run as HTTP server with SSE transport (for deployment on Render)
    console.log('Starting HTTP server mode with SSE transport...');
    
    // Store transports by session ID
    const transports = {};

    // SSE endpoint for establishing the stream
    app.get('/sse', async (req, res) => {
      try {
        // Create a new SSE transport for the client
        const transport = new SSEServerTransport('/messages', res);
        const sessionId = transport.sessionId;
        transports[sessionId] = transport;

        // Set up onclose handler to clean up transport when closed
        transport.onclose = () => {
          console.log(`SSE transport closed for session ${sessionId}`);
          delete transports[sessionId];
        };

        // Create a new server instance for this connection
        const server = await initializeMCPServer();
        await server.connect(transport);
        console.log(`Established SSE stream with session ID: ${sessionId}`);
      } catch (error) {
        console.error('Error establishing SSE stream:', error);
        if (!res.headersSent) {
          res.status(500).send('Error establishing SSE stream');
        }
      }
    });

    // Messages endpoint for receiving client JSON-RPC requests
    app.post('/messages', express.json(), async (req, res) => {
      // Extract session ID from URL query parameter
      const sessionId = req.query.sessionId;
      if (!sessionId) {
        console.error('No session ID provided in request URL');
        res.status(400).send('Missing sessionId parameter');
        return;
      }

      const transport = transports[sessionId];
      if (!transport) {
        console.error(`No active transport found for session ID: ${sessionId}`);
        res.status(404).send('Session not found');
        return;
      }

      try {
        // Handle the POST message with the transport
        await transport.handlePostMessage(req, res, req.body);
      } catch (error) {
        console.error('Error handling request:', error);
        if (!res.headersSent) {
          res.status(500).send('Error handling request');
        }
      }
    });

    // Graceful shutdown handler
    const shutdown = async () => {
      console.log('Shutting down server...');
      // Close all active transports
      for (const sessionId in transports) {
        try {
          console.log(`Closing transport for session ${sessionId}`);
          await transports[sessionId].close();
          delete transports[sessionId];
        } catch (error) {
          console.error(`Error closing transport for session ${sessionId}:`, error);
        }
      }
      await database.close();
      console.log('Server shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    app.listen(config.server.port, config.server.host, () => {
      console.log(
        `Server running on http://${config.server.host}:${config.server.port}`
      );
      console.log('MCP SSE endpoint available at /sse');
      console.log('MCP message endpoint available at /messages');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

