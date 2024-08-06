import { defineTool } from '@magickml/tools'
import { z } from 'zod'

export default {
  name: 'weather',
  definition: defineTool({
    description: 'Get the weather in a location',
    parameters: z.object({
      location: z.string().describe('The location to get the weather for'),
    }),
    execute: async ({ location }) => ({
      location,
      temperature: 72 + Math.floor(Math.random() * 21) - 10,
    }),
  }),
}
