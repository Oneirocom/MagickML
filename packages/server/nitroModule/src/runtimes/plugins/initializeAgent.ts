// @ts-ignore
import magickSpells from '#magick/spells'
import { initApp } from '@magickml/agent-server'
import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime'
import { Agent } from '@magickml/agents'
import { AgentInterface } from '@magickml/agent-server-schemas'
import { NitroRuntimeConfig } from 'nitropack'
import { PrismaClient } from '@magickml/server-db'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'

// Create a single PrismaClient instance to be reused
const prisma = new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

type Config = NitroRuntimeConfig & AgentInterface

export default defineNitroPlugin(async nitroApp => {
  try {
    const app = (await initApp()) as any
    const runtimeConfig = useRuntimeConfig<Config>()
    const config = { ...runtimeConfig }

    nitroApp.agentServer = app

    let agentId: string | undefined

    try {
      const configFile = fs.readFileSync('agent-config.json', 'utf8')
      const configData = JSON.parse(configFile)
      agentId = configData.AGENT_ID
    } catch (error) {
      console.error('Error reading agent-config.json:', error)
    }

    agentId = agentId || runtimeConfig.agentId || uuidv4()

    // Use a single transaction for database operations
    const agent = await prisma.$transaction(async tx => {
      const existingAgent = await tx.agents.findUnique({
        where: { id: agentId },
      })

      if (!existingAgent) {
        const newAgent = await tx.agents.create({
          data: {
            id: agentId as string,
            name: agentId as string,
            enabled: true,
            version: '2.0',
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isDraft: false,
            projectId: runtimeConfig.projectId || 'default',
            worldId: runtimeConfig.worldId || 'default',
          },
        })

        const configData = { AGENT_ID: newAgent.id }
        fs.writeFileSync(
          'agent-config.json',
          JSON.stringify(configData, null, 2)
        )

        config.agentId = newAgent.id
        config.id = newAgent.id

        return newAgent
      }

      config.agentId = existingAgent.id
      config.projectId = existingAgent.projectId || 'default'
      config.id = existingAgent.id

      return existingAgent
    })

    console.log('Agent configured:', agent.id)

    // Create agent instance
    const agentInstance = new Agent(config, app.get('pubsub'), app)
    await agentInstance.waitForInitialization()
    await agentInstance.spellbook.loadSpells(magickSpells)

    nitroApp.agent = agentInstance

    // Add cleanup on process termination
    const cleanup = async () => {
      await prisma.$disconnect()
      // Add any other cleanup needed
    }

    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)
  } catch (error) {
    console.error('Error initializing agent:', error)
    await prisma.$disconnect()
    throw error
  }
})
