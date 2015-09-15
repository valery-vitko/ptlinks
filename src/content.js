function onLinksAdded(links) {
	var listLinks = links[0].added;
	listLinks.forEach(buildLink);
	
	var detailsLinks = links[1].added;
	detailsLinks.forEach(buildTitleListener);
};

function buildLink(element) {
	var issueNumber = element.innerText.match(/\b\d{8,9}\b/);
	if (issueNumber) {
		element.innerHTML = element.innerHTML.replace(
			/\b(\d{8,9})\b/,
			'<a target="_blank" onclick="event.stopPropagation()" href="https://www.pivotaltracker.com/story/show/$1">$1</a>'
		);
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