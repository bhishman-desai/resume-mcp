const database = require('../database');
const { resumeSchema } = require('../validation/schemas');
const { handleError } = require('../utils/errorHandler');

async function getResume() {
  try {
    const resume = await database.getResume();

    // Validate the resume before returning
    try {
      resumeSchema.parse(resume);
    } catch (validationError) {
      console.warn('Resume validation warning:', validationError.message);
      // Still return the resume even if validation fails
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(resume, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(handleError(error, 'getResume'), null, 2),
        },
      ],
      isError: true,
    };
  }
}

module.exports = {
  name: 'get_resume',
  description: 'Returns the current resume JSON',
  handler: getResume,
};

