import imageUrlBuilder from '@sanity/image-url'
import client from './client.js'

const builder = imageUrlBuilder(client)

export default function urlFor(source) {
	if (!source) return null
	return builder.image(source).url()
}

