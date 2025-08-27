import imageUrlBuilder from '@sanity/image-url'
import { sanityClient } from 'sanity:client'

const builder = imageUrlBuilder(sanityClient)

export function getSanityImageURL(source) {
  return builder.image(source)
}