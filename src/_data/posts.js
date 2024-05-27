const toMarkdown = require('@sanity/block-content-to-markdown');
const client = require('../_sanity/client');
const urlFor = require('../_sanity/imageUrl');

// Function to fetch posts from Sanity
module.exports = async function () {
  const query = `*[_type == "post"]`;
  const posts = await client.fetch(query);

  // Process each post
  const result = posts.map(post => {
    const url = `/posts/${post.slug.current}`;
    const content = toMarkdown(post.body);

    return {
      url: url,
      page: {
        fileSlug: post.slug.current,
        filePathStem: url,
        templateSyntax: 'liquid,md',
        lang: 'fr-Fr'
      },
      data: {
        previewImage: urlFor(post.mainImage),
        title: post.title,
        date: post.publishedAt
      },
      content: content
    };
  }).sort((a, b) => (a.date > b.date ? -1 : 1));

  return result;
};
