const database = require('../database');
const {
  patchResumeRequestSchema,
  resumeSchema,
} = require('../validation/schemas');
const { validateApiKey } = require('../utils/security');
const { handleError, createEmergencyBackup } = require('../utils/errorHandler');

async function patchResume(args) {
  try {
    // Validate request
    const validated = patchResumeRequestSchema.parse(args);

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

    // Get current resume for emergency backup
    const currentResume = await database.getResume();

    // Merge partial resume with current
    const mergedResume = { ...currentResume, ...validated.partialResume };

    // Validate merged result
    const validatedResume = resumeSchema.parse(mergedResume);

    try {
      // Update resume
      const updatedResume = await database.patchResume(validated.partialResume);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: 'Resume patched successfully',
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
          text: JSON.stringify(handleError(error, 'patchResume'), null, 2),
        },
      ],
      isError: true,
    };
  }
}

module.exports = {
  name: 'patch_resume',
  description:
    'Merge partial resume data with existing resume. Requires { partialResume, apiKey } parameters.',
  handler: patchResume,
  inputSchema: {
    type: 'object',
    properties: {
      partialResume: {
        type: 'object',
        description: 'Partial resume object with fields to update',
      },
      apiKey: {
        type: 'string',
        description: 'API key for authentication',
      },
    },
    required: ['partialResume', 'apiKey'],
  },
};

