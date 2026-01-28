// Save options to Chrome storage
function saveOptions() {
  const jiraTenantName = document.getElementById('jiraTenantName').value;
  
  chrome.storage.sync.set({
    jiraTenantName: jiraTenantName
  }, function() {
    // Update status to let user know options were saved
    const status = document.getElementById('status');
    status.style.display = 'block';
    setTimeout(function() {
      status.style.display = 'none';
    }, 1500);
  });
}

// Restore options when page loads
function restoreOptions() {
  chrome.storage.sync.get({
    jiraTenantName: DEFAULT_JIRA_TENANT_NAME // default value
  }, function(items) {
    document.getElementById('jiraTenantName').value = items.jiraTenantName;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
