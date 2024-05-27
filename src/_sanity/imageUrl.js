const imageUrlBuilder = require('@sanity/image-url')
const client = require('./client')

const builder = imageUrlBuilder(client)

function urlFor(source) {
    if (!source)
        return null
    return builder.image(source).url()
}

module.exports = urlFor