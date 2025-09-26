import { defineCollection } from 'astro:content';
import { toHTML } from '@portabletext/to-html';
import { loadQuery } from './lib/load-query';
import { getSanityImageURL } from './utils/helpers';
import { rssSchema } from '@astrojs/rss';

const blog = defineCollection({
	loader: async () => {
		const query = `*[_type == "post"] {
			_id,
			"index": count(*[_type == "post" && publishedAt > ^.publishedAt]),
			"slug": slug.current, 
			title, 
			publishedAt, 
			tags, 
			body, 
			mainImage
		}`;
		const { data: posts } = await loadQuery({query: query, params: {}, enabled: false});

		// Map Sanity data to the expected collection entry format
		return posts.map((post: any) => ({
			id: post._id,
			title: post.title,
			link: `/posts/${post.slug}/`,
			description: post.preview || "",
			pubDate: new Date(post.publishedAt),
			heroImage: post.mainImage ? getSanityImageURL(post.mainImage).url() : undefined,
			content: toHTML(posts[0].body),
			categories: post.tags || []
		}));
	},
	schema: rssSchema,
});

export const collections = { blog };
