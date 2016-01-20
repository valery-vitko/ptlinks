function onLinksAdded(links) {
	var listLinks = links[0].added;
	listLinks.forEach(buildLink);
	
	var detailsLinks = links[1].added;
	detailsLinks.forEach(buildTitleListener);
};

function buildLink(element) {
	var jiraIssueKey = element.innerText.match(/\b[A-Z]{2,6}-\d{3,5}\b/);
	if (jiraIssueKey) {
		element.innerHTML = element.innerHTML.replace(
			/\b([A-Z]{2,6}-\d{3,5})\b/,
			'<a target="_blank" onclick="event.stopPropagation()" href="https://socialwellth.atlassian.net/browse/$1">$1</a>'
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

function buildTitleListener(titleElement) {
	new MutationSummary({
		rootNode: titleElement,
		callback: function(changes) {
			buildLink(titleElement);
		},
		queries: [
			{ characterData: true }
		]
	});
}

var observer = new MutationSummary({
	callback: onLinksAdded,
	queries: [
		{ element: 'span[ng-bind="s.title"]' },
		{ element: 'p[ng-bind="details.title"]' }
	]
});