// Default value that will be updated from storage
let JIRA_TENANT_NAME = DEFAULT_JIRA_TENANT_NAME;

// Function to get tenant name from storage as a Promise
function readSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['jiraTenantName'], function(result) {
      if (result.jiraTenantName) {
        JIRA_TENANT_NAME = result.jiraTenantName;
      }
      resolve();
    });
  });
}

// Configuration for the different types of elements to process, grouped by website
const elementConfig = {
  // PlanitPoker website selectors
  'planitpoker.com': {
    immediate: [
      'span[ng-bind="s.title"]'
    ],
    watched: [
      'p[ng-bind="details.title"]'
    ]
  },
  // GitHub Pull Request selectors
  'github.com': {
    immediate: [
      'span.f1.text-normal.markdown-title',  // For commits tab
      'bdi.js-issue-title.markdown-title'    // For other PR tabs
    ],
    watched: [
      'span.f1.text-normal.markdown-title',  // For commits tab
      'bdi.js-issue-title.markdown-title'    // For other PR tabs
    ]
  }
};

function buildLink(element) {
  const jiraIssueKeyRegex = /\b([A-Z][A-Z0-9]{1,5}-\d{1,5})\b/;
  const jiraIssueKey = element.innerText.match(jiraIssueKeyRegex);
  if (jiraIssueKey) {
    element.innerHTML = element.innerHTML.replace(
      jiraIssueKeyRegex,
      `<a target="_blank" onclick="event.stopPropagation()" href="https://${JIRA_TENANT_NAME}.atlassian.net/browse/$1">$1</a>`
    );
    return;
  }

  var ptStoryNumber = element.innerText.match(/\d{8,9}\b/);
  if (ptStoryNumber) {
    element.innerHTML = element.innerHTML.replace(
      /#?(\d{8,9})\b/,
      '<a target="_blank" onclick="event.stopPropagation()" href="https://www.pivotaltracker.com/story/show/$1">#$1</a>'
    );
    return;
  }
}

// Monitor text changes within a specific element 
function watchTitleChanges(titleElement) {
  // This function creates a MutationObserver to detect when the content of
  // dynamic elements changes, so we need to reapply the link building.
  
  const titleObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'characterData' || mutation.type === 'childList') {
        buildLink(titleElement);
      }
    });
  });

  titleObserver.observe(titleElement, {
    characterData: true,
    childList: true,
    subtree: true
  });
}

// Get the appropriate config for the current website
function getConfigForCurrentSite() {
  const hostname = window.location.hostname;
  
  for (const site in elementConfig) {
    if (hostname.includes(site)) {
      return elementConfig[site];
    }
  }
  
  // Default empty config if no match
  return { immediate: [], watched: [] };
}

// Process elements that should have links built immediately
function processImmediateElements(root = document) {
  const siteConfig = getConfigForCurrentSite();
  
  siteConfig.immediate.forEach(selector => {
    const elements = root.querySelectorAll(selector);
    elements.forEach(buildLink);
  });
}

// Process elements that should be watched for changes
function processWatchedElements(root = document) {
  const siteConfig = getConfigForCurrentSite();
  
  siteConfig.watched.forEach(selector => {
    const elements = root.querySelectorAll(selector);
    elements.forEach(watchTitleChanges);
  });
}

// Process a single element to see if it matches any of our selectors
function processSingleElement(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
  
  // Check if the node itself matches any selectors
  if (node.matches) {
    const siteConfig = getConfigForCurrentSite();
    
    // Check immediate selectors
    siteConfig.immediate.forEach(selector => {
      if (node.matches(selector)) {
        buildLink(node);
      }
    });
    
    // Check watched selectors
    siteConfig.watched.forEach(selector => {
      if (node.matches(selector)) {
        watchTitleChanges(node);
      }
    });
  }
  
  // Also process any matching child elements
  processImmediateElements(node);
  processWatchedElements(node);
}

// Main observer to detect added elements of interest
const mainObserver = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    if (mutation.type === 'childList') {
      // Check for added nodes
      mutation.addedNodes.forEach(processSingleElement);
    }
  });
});

// Initialize observation
async function initializeObservation() {
  // Wait for the Jira tenant name to be loaded from storage
  await readSettings();
  
  // Process existing elements after tenant name is loaded
  processImmediateElements();
  processWatchedElements();
  
  // Start observing for future changes
  if (document.body) {
    mainObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Start observing the document
document.addEventListener('DOMContentLoaded', () => {
  initializeObservation();
});

// In case the document is already loaded
if (document.readyState !== 'loading') {
  initializeObservation();
}