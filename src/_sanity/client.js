import dotenv from 'dotenv'
dotenv.config()

import { createClient } from '@sanity/client'

const projectId = process.env.SANITY_PROJECT_ID || ''
const token = process.env.SANITY_API_TOKEN || ''
const dataset = process.env.SANITY_DATASET || 'production'
const useCdn = process.env.SANITY_USE_CDN || false
const apiVersion = process.env.SANITY_API_VERSION || '2022-07-27'

const client = createClient({
	projectId,
	dataset,
	token,
	useCdn,
	apiVersion
})

export default client
