/**
 * Handles errors and creates safe error responses
 */
function handleError(error, context = '') {
  console.error(`Error in ${context}:`, error);

  // Return user-friendly error message
  if (error instanceof Error) {
    return {
      error: true,
      message: error.message,
      context: context || undefined,
    };
  }

  return {
    error: true,
    message: 'An unexpected error occurred',
    context: context || undefined,
  };
}

/**
 * Creates a safe backup when validation fails
 */
async function createEmergencyBackup(database, resumeData, error) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `emergency-backup-${timestamp}.json`;
    await database.createVersion(filename, resumeData);
    console.log(`Emergency backup created: ${filename}`);
    return filename;
  } catch (backupError) {
    console.error('Failed to create emergency backup:', backupError);
    throw backupError;
  }
}

module.exports = {
  handleError,
  createEmergencyBackup,
};

