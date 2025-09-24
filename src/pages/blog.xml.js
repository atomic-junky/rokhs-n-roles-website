import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import sanitizeHtml from 'sanitize-html';


export async function GET(context) {
    const blog = await getCollection('blog');
    console.log(sanitizeHtml(blog[0].data.content, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
    }))
    return rss({
        stylesheet: '/rss/styles.xsl',
        title: 'Blog - Rokhs & Rôles',
        description: 'Le blog de l\'association Rokhs & Rôles',
        site: context.site,
        items: blog.map((post) => ({
            title: post.data.title,
            pubDate: post.data.pubDate,
            description: post.data.description || "Pas de descritption.",
            content: sanitizeHtml(post.data.content, {
                allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
            }),
            link: new URL(post.data.link, context.site).href,
            categories: post.data.categories || [],
        })),
        customData: `<language>fr-FR</language>`,
        
    });
}