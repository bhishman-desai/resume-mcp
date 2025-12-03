const database = require('../database');
const { handleError } = require('../utils/errorHandler');

async function listVersions() {
  try {
    const versions = await database.listVersions();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              versions: versions.map((v) => v.filename),
              details: versions,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(handleError(error, 'listVersions'), null, 2),
        },
      ],
      isError: true,
    };
  }
}

module.exports = {
  name: 'list_versions',
  description: 'List all snapshot filenames',
  handler: listVersions,
};

