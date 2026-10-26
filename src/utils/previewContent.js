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


export default function createPreviewContent(text, maxLength = 150) {
	text = removeHtmlAndMarkdown(text);
	
    const sentenceEndings = /([.!?])\s*(?=[A-Z]|\s|$)/g;
    let sentences = [];
    let match;
    let lastIndex = 0;
    let currentLength = 0;

    while ((match = sentenceEndings.exec(text)) !== null) {
        const sentence = text.substring(lastIndex, sentenceEndings.lastIndex).trim();
        const newLength = currentLength + sentence.length;

        if (newLength > maxLength) {
            break;
        }

        sentences.push(sentence);
        currentLength = newLength;
        lastIndex = sentenceEndings.lastIndex;
    }

    if (sentences.length === 0 && lastIndex < text.length) {
        sentences.push(text.substring(0, maxLength).trim());
    }

    return sentences.join(' ');
}