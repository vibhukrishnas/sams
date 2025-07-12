/**
 * E2E Artifacts Path Builder
 * Custom path builder for organizing test artifacts
 */

const path = require('path');

module.exports = {
  buildPathForTestArtifact: (artifactName, testSummary) => {
    const testName = testSummary.title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const platform = process.env.DETOX_CONFIGURATION || 'unknown';
    
    // Create organized directory structure
    const artifactDir = path.join(
      'e2e',
      'artifacts',
      platform,
      testSummary.fullName.replace(/\s+/g, '_'),
      timestamp
    );
    
    return path.join(artifactDir, `${testName}_${artifactName}`);
  },
};
