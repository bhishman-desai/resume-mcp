const database = require('../database');
const { updateResumeRequestSchema, resumeSchema } = require('../validation/schemas');
const { validateApiKey } = require('../utils/security');
const { handleError, createEmergencyBackup } = require('../utils/errorHandler');

async function updateResume(args) {
  try {
    // Validate request
    const validated = updateResumeRequestSchema.parse(args);

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

    // Validate resume structure
    const validatedResume = resumeSchema.parse(validated.resume);

    // Get current resume for emergency backup
    const currentResume = await database.getResume();

    try {
      // Update resume
      const updatedResume = await database.updateResume(validatedResume);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: 'Resume updated successfully',
                resume: updatedResume,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (updateError) {
      // Create emergency backup if update fails
      await createEmergencyBackup(database, currentResume, updateError);
      throw updateError;
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
          text: JSON.stringify(handleError(error, 'updateResume'), null, 2),
        },
      ],
      isError: true,
    };
  }
}

module.exports = {
  name: 'update_resume',
  description:
    'Replace the entire resume. Requires { resume, apiKey } parameters.',
  handler: updateResume,
  inputSchema: {
    type: 'object',
    properties: {
      resume: {
        type: 'object',
        description: 'The complete resume object',
      },
      apiKey: {
        type: 'string',
        description: 'API key for authentication',
      },
    },
    required: ['resume', 'apiKey'],
  },
};

