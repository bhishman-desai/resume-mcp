const getResume = require('./getResume');
const updateResume = require('./updateResume');
const patchResume = require('./patchResume');
const listVersions = require('./listVersions');
const restoreVersion = require('./restoreVersion');

module.exports = [
  getResume,
  updateResume,
  patchResume,
  listVersions,
  restoreVersion,
];

