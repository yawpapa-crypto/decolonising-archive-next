import path from 'path'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { Pages } from './src/collections/Pages'
import { Users } from './src/collections/Users'

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || '',
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    push: true,
  }),
  admin: {
    user: 'users',
    importMap: {
      baseDir: path.resolve(process.cwd()),
    },
  },
  routes: {
    admin: '/cms',
  },
  collections: [Users, Pages],
})
