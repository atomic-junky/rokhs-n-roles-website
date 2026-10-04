import imageUrlBuilder from '@sanity/image-url'
import { sanityClient } from 'sanity:client'

const builder = imageUrlBuilder(sanityClient)

export function getSanityImageURL(source) {
  return builder.image(source).projectId(sanityClient.config().projectId || import.meta.env.SANITY_PROJECT_ID).dataset(sanityClient.config().dataset || import.meta.env.SANITY_DATASET)
}

export function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

export function title(text) {
    return text.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}