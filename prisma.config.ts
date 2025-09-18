import { defineConfig } from 'prisma/scripts/defaults'

export default defineConfig({
  schema: './prisma/schema.prisma',
  seed: {
    command: 'tsx prisma/seed.ts',
  },
})
