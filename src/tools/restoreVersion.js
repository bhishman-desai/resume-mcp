const database = require('../database');
const {
  restoreVersionRequestSchema,
  resumeSchema,
} = require('../validation/schemas');
const { validateApiKey, sanitizeFilename } = require('../utils/security');
const { handleError, createEmergencyBackup } = require('../utils/errorHandler');

async function restoreVersion(args) {
  try {
    // Validate request
    const validated = restoreVersionRequestSchema.parse(args);

    // Validate API key
    if (!validateApiKey(validated.apiKey)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { error: true, message: 'Invalid API key' },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(validated.filename);

    // Get version data
    const versionData = await database.getVersion(sanitizedFilename);

    if (!versionData) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: true,
                message: `Version ${sanitizedFilename} not found`,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    // Validate version data before restoring
    try {
      resumeSchema.parse(versionData);
    } catch (validationError) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: true,
                message: 'Version data is invalid and cannot be restored',
                details: validationError.errors,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    // Get current resume for emergency backup
    const currentResume = await database.getResume();

    try {
      // Restore version
      const restoredResume = await database.restoreVersion(sanitizedFilename);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: `Resume restored from ${sanitizedFilename}`,
                resume: restoredResume,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (restoreError) {
      // Create emergency backup if restore fails
      await createEmergencyBackup(database, currentResume, restoreError);
      throw restoreError;
    }
  } catch (error) {
    if (error.name === 'ZodError') {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: true,
                message: 'Validation error',
                details: error.errors,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(handleError(error, 'restoreVersion'), null, 2),
        },
      ],
      isError: true,
    };
  }
}

module.exports = {
  name: 'restore_version',
  description:
    'Restore resume from a snapshot. Requires { filename, apiKey } parameters.',
  handler: restoreVersion,
  inputSchema: {
    type: 'object',
    properties: {
      filename: {
        type: 'string',
        description: 'The snapshot filename to restore from',
      },
      apiKey: {
        type: 'string',
        description: 'API key for authentication',
      },
    },
    required: ['filename', 'apiKey'],
  },
};

