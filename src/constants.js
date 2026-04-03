// Shared constants for the Chrome extension
const DEFAULT_JIRA_TENANT_NAME = 'your-actual-jira-tenant-name-from-extension-options';

// Export for testing (ignored in browser context)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_JIRA_TENANT_NAME };
}
