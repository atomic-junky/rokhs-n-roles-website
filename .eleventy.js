const { DateTime } = require('luxon')
const markdownIt = require('markdown-it')
// const markdownItAnchor = require('markdown-it-anchor')
const EleventyPluginNavigation = require('@11ty/eleventy-navigation')
const EleventyPluginRss = require('@11ty/eleventy-plugin-rss')
const faviconsPlugin = require('eleventy-plugin-gen-favicons')
const { urlFor } = require('./src/_sanity/imageUrl.js')

require('dotenv').config()

/**
 * Eleventy configuration
 */
module.exports = function (eleventyConfig) {
	// Global data
	eleventyConfig.addGlobalData('baseUrl', process.env.CONFIG_BASE_URL)

	// Plugins
	eleventyConfig.addPlugin(EleventyPluginNavigation)
	eleventyConfig.addPlugin(EleventyPluginRss)

	// Template Formats
	eleventyConfig.setTemplateFormats([
		// Templates:
		'html',
		'njk',
		'md',
		// Static Assets:
		'ico',
		'css',
		'jpeg',
		'jpg',
		'png',
		'svg',
		'woff',
		'woff2',
		'ttf',
		'otf'
	])

	// Favicons Plugin
	eleventyConfig.addPlugin(faviconsPlugin, {
		manifestData: {
			name: 'Rokhs & Rôles',
			short_name: 'Rokhs\'n\'Rôles',
			theme_color: '#ffffff',
			background_color: '#ffffff',
			display: 'standalone'
		}
	})

	// Passthrough Copy
	eleventyConfig.addPassthroughCopy({
		'./public/': '/'
	})

	// BrowserSync Configuration
	eleventyConfig.setBrowserSyncConfig({ ghostMode: false })

	eleventyConfig.setServerOptions({
		module: "@11ty/eleventy-server-browsersync",
		online: false,
	});

	// Filters
	eleventyConfig.addFilter('htmlDateString', (dateObj) => {
		return DateTime.fromISO(dateObj, { zone: 'utc' })
			.setLocale('fr')
			.toLocaleString(DateTime.DATE_FULL)
	})

	eleventyConfig.addFilter('imageUrl', (assetObj) => {
		return urlFor(assetObj)
	})

	eleventyConfig.addFilter('toAbsoluteUrl', (url) => {
		const base = eleventyConfig.globalData.baseUrl

		if (url.startsWith('/')) url = url.slice(1)

		try {
			return new URL(url, base).href
		} catch (err) {
			console.error(err)
			return url
		}
	})

	// Markdown Configuration
	const markdownLibrary = markdownIt({
		html: true,
		breaks: true,
		linkify: true
	});
	eleventyConfig.setLibrary('md', markdownLibrary)

	eleventyConfig.addNunjucksAsyncShortcode('Image', async (src, alt) => {
		if (!alt) {
			throw new Error(`Missing \`alt\` on myImage from: ${src}`);
		}

		let stats = await Image(src, {
			widths: [25, 320, 640, 960, 1200, 1800, 2400],
			formats: ['jpeg', 'webp', 'png'],
			urlPath: '/images/',
			outputDir: './_site/images/',
		});

		let lowestSrc = stats['jpeg'][0];

		const srcset = Object.keys(stats).reduce(
			(acc, format) => ({
				...acc,
				[format]: stats[format].reduce(
				(_acc, curr) => `${_acc} ${curr.srcset} ,`,
				'',
				),
			}),
			{},
		);

		const source = `<source type="image/webp" srcset="${srcset['webp']}" >`;

		const img = `<img
			loading="lazy"
			alt="${alt}"
			src="${lowestSrc.url}"
			sizes='(min-width: 1024px) 1024px, 100vw'
			srcset="${srcset['jpeg']}"
			width="${lowestSrc.width}"
			height="${lowestSrc.height}">`;

		return `<div class="image-wrapper"><picture> ${source} ${img} </picture></div>`;
	});

	// Eleventy Configuration
	return {
		templateFormats: ['md', 'njk', 'html', 'liquid'],
		htmlTemplateEngine: 'njk',
		dir: {
			input: 'src',
			includes: '_includes',
			data: '_data',
			output: '_site'
		}
	}
}
