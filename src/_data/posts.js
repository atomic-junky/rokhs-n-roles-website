import toMarkdown from '@sanity/block-content-to-markdown'
import client from '../_sanity/client.js'
import urlFor from '../_sanity/imageUrl.js'

// Function to fetch posts from Sanity
export default async function () {
	const query = `*[_type == "post"]`
	const posts = await client.fetch(query)

	// Process each post
	const result = posts
		.map((post) => {
			const url = `/posts/${post.slug.current}`
			const content = toMarkdown(post.body)

			return {
				url: url,
				title: post.title,
				page: {
					fileSlug: post.slug.current,
					filePathStem: url,
					templateSyntax: 'liquid,md',
					lang: 'fr-Fr'
				},
				data: {
					previewImage: urlFor(post.mainImage),
					previewContent: createPreviewContent(content),
					title: post.title,
					tags: post.categories || [],
					date: post.publishedAt
				},
				content: content
			}
		})
		.sort((a, b) => (a.data.date > b.data.date ? -1 : 1))

	return result
}


function removeHtmlAndMarkdown(text) {
    text = text
		.replace(/<\/?[^>]+(>|$)/g, "")
		.replace(/(#+\s*)/g, "")
		.replace(/!\[.*?\]\(.*?\)/g, "").replace(/\[.*?\]\(.*?\)/g, "")
		.replace(/(\*{1,2}|_{1,2})(.*?)\1/g, "$2")
		.replace(/(`{1,3})(.*?)\1/g, "$2")
		.replace(/>\s*/g, "")
		.replace(/(^|\n)[*-](\s+)/g, "$1")
		.replace(/-{3,}/g, "");

    return text;
}


function createPreviewContent(text, maxLength=150) {
	text = removeHtmlAndMarkdown(text);
	
    const sentenceEndings = /([.!?])\s*(?=[A-Z]|\s|$)/g;
    let sentences = [];
    let match;
    let lastIndex = 0;
    let currentLength = 0;

    // Iterate over the matches
    while ((match = sentenceEndings.exec(text)) !== null) {
        const sentence = text.substring(lastIndex, sentenceEndings.lastIndex).trim();
        const newLength = currentLength + sentence.length;

        // Check if adding the sentence would exceed the max length
        if (newLength > maxLength) {
            break;
        }

        // Add the sentence to the sentences array
        sentences.push(sentence);
        currentLength = newLength;
        lastIndex = sentenceEndings.lastIndex;
    }

    // If no full sentences were added and some text remains, add the remaining text
    if (sentences.length === 0 && lastIndex < text.length) {
        sentences.push(text.substring(0, maxLength).trim());
    }

    // Join the collected sentences back into a single string
    return sentences.join(' ');
}