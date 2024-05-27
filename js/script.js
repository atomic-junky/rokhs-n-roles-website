document.addEventListener(
	'DOMContentLoaded',
	function () {
		var linkContainer = document.getElementById('navbar')
		var links = linkContainer.getElementsByTagName('a')

		for (const link of links) {
			var windowHref = getAccurateUrl(window.location.href)
			var linkHref = getAccurateUrl(link.href)

			if (linkHref == windowHref) {
				link.classList.add('active')
			}
		}
	},
	false
)

function getAccurateUrl(url) {
	if (url.endsWith('/')) {
		return url.slice(0, -1)
	}

	return url
}
