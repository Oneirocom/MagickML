import { CoreLLMService } from './services/coreLLMService/coreLLMService'
import {
  ActionPayload,
  CoreEventsPlugin,
  EventPayload,
  ON_MESSAGE,
} from 'server/plugin'
import { messageEvent } from './nodes/events/messageEvent'
import Redis from 'ioredis'
import { ILogger, IRegistry, registerCoreProfile } from '@magickml/behave-graph'
import CoreEventClient from './services/coreEventClient'
import { RedisPubSub } from 'server/redis-pubsub'
import { CoreActionService } from './services/coreActionService'
import { generateText } from './nodes/actions/generateText'
import { sendMessage } from './nodes/actions/sendMessage'
import { textTemplate } from './nodes/functions/textTemplate'
import { registerStructProfile } from './registerStructProfile'
import { streamMessage } from './nodes/actions/streamMessage'
import { LLMProviders } from './services/coreLLMService/types'
import { variableGet } from './nodes/query/variableGet'
import { VariableService } from './services/variableService'
import { variableSet } from './nodes/query/variableSet'
import { arrayPush } from './values/Array/Push'
import { jsonStringify } from './nodes/actions/jsonStringify'
import { SpellCaster } from 'server/grimoire'
import { forEach } from './values/Array/ForEach'
import { arrayLength } from './values/Array/Length'
import { arrayClear } from './values/Array/Clear'
import { whileLoop } from './nodes/flow/whileLoop'
import { regex } from './nodes/logic/match'
import { split } from './nodes/logic/strings/split'
import { arrayRemoveFirst, arrayRemoveLast } from './values/Array/Remove'
import { arrayMerge } from './values/Array/Merge'
import { UserService } from './services/userService/userService'
import { arrayCreate } from './values/Array/Create'
import { CoreBudgetManagerService } from './services/coreBudgetManagerService/coreBudgetMangerService'
import { CoreMemoryService } from './services/coreMemoryService/coreMemoryService'
import { addKnowledge } from './nodes/actions/addKnowledge'
import { queryKnowledge } from './nodes/actions/queryKnowledge'
import { searchKnowledge } from './nodes/actions/searchKnowledge'
import { searchManyKnowledge } from './nodes/actions/searchManyKnowledge'
import { CorePluginEvents, CorePluginState } from './types'
import {
  CORE_DEP_KEYS,
  corePluginCredentials,
  corePluginName,
  coreRemovedNodes,
} from './constants'

/**
 * CorePlugin handles all generic events and has its own nodes, dependencies, and values.
 */
export class CorePlugin extends CoreEventsPlugin<
  CorePluginEvents,
  EventPayload,
  Record<string, unknown>,
  Record<string, unknown>,
  CorePluginState
> {
  override enabled = true
  client: CoreEventClient
  nodes = [
    messageEvent,
    sendMessage,
    textTemplate,
    generateText,
    streamMessage,
    variableGet,
    variableSet,
    arrayPush,
    jsonStringify,
    forEach,
    arrayLength,
    arrayClear,
    whileLoop,
    regex,
    split,
    arrayRemoveFirst,
    arrayRemoveLast,
    arrayMerge,
    arrayCreate,
    addKnowledge,
    queryKnowledge,
    searchKnowledge,
    searchManyKnowledge,
  ]
  values = []
  coreLLMService = new CoreLLMService()
  coreMemoryService = new CoreMemoryService()
  coreBudgetManagerService = new CoreBudgetManagerService()
  userService = new UserService()

  constructor(connection: Redis, agentId: string, pubSub: RedisPubSub) {
    super(corePluginName, connection, agentId)
    this.client = new CoreEventClient(pubSub, agentId)
    this.setCredentials(corePluginCredentials)
  }

  /**
   * Defines the events that the plugin will listen for.
   */
  defineEvents() {
    // Define events here
    this.registerEvent({
      eventName: ON_MESSAGE,
      displayName: 'Message Received',
    })
  }

  /**
   * Defines the actions that the plugin will handle.
   */
  defineActions() {
    // Define actions here
    this.registerAction({
      actionName: 'sendMessage',
      displayName: 'Send Message',
      handler: this.handleSendMessage.bind(this),
    })
    this.registerAction({
      actionName: 'streamMessage',
      displayName: 'Stream Message',
      handler: this.handleSendMessage.bind(this),
    })
  }

  /**
   * Defines the dependencies that the plugin will use. Creates a new set of dependencies every time.
   */
  async getDependencies(spellCaster: SpellCaster) {
    await this.coreLLMService.initialize()
    await this.coreBudgetManagerService.initialize()
    await this.coreMemoryService.initialize(this.agentId)
    await this.getLLMCredentials()

    return {
      [CORE_DEP_KEYS.ACTION_SERVICE]: new CoreActionService(
        this.centralEventBus,
        this.actionQueueName
      ),
      [CORE_DEP_KEYS.I_VARIABLE_SERVICE]: new VariableService(
        this.connection,
        this.agentId,
        spellCaster
      ),
      [CORE_DEP_KEYS.LLM_SERVICE]: this.coreLLMService,
      [CORE_DEP_KEYS.BUDGET_MANAGER_SERVICE]: this.coreBudgetManagerService,
      [CORE_DEP_KEYS.MEMORY_SERVICE]: this.coreMemoryService,
    }
  }

  async getLLMCredentials() {
    if (this.agentId === '000000000') return
    try {
      // Loop through all providers defined in the Providers enum except for LLMProviders.Unknown
      for (const providerKey of Object.keys(LLMProviders).filter(
        key => LLMProviders[key] !== LLMProviders.Unknown
      )) {
        const provider = LLMProviders[providerKey]

        // Retrieve credentials for each provider
        const credential = await this.getCredential(provider, 'llm')

        // Check if credentials are retrieved and valid
        if (credential) {
          // Add each credential to the CoreLLMService instance
          this.coreLLMService.addCredential({
            ...corePluginCredentials[0],
            name: provider,
            value: credential,
          })
          this.coreMemoryService.addCredential({
            ...corePluginCredentials[0],
            name: provider,
            value: credential,
          })
        }
      }
    } catch (error) {
      this.logger.error(error, 'Error retrieving LLM credentials:')
    }
  }

  /**
   * Provides the core registry from Behave Graph. Wraps our existing nodes and values.
   * @param registry The registry to provide.
   */
  override provideRegistry(registry: IRegistry): IRegistry {
    const _coreRegistry = registerCoreProfile(registry)
    const coreRegistry = {
      ..._coreRegistry,
      // turn nodes map into array to filter
      nodes: Object.entries(_coreRegistry.nodes).reduce((acc, [key, value]) => {
        if (coreRemovedNodes.includes(key)) return acc
        return { ...acc, [key]: value }
      }, {}),
    }
    const logger = (coreRegistry.dependencies.ILogger as ILogger) || undefined

    return registerStructProfile(coreRegistry, logger)
  }

  initializeFunctionalities() {
    this.centralEventBus.on(ON_MESSAGE, this.handleOnMessage.bind(this))
    this.client.onMessage(this.handleOnMessage.bind(this))
  }

  handleOnMessage(payload: EventPayload) {
    const event = this.formatMessageEvent(ON_MESSAGE, payload)
    this.emitEvent(ON_MESSAGE, event)
  }

  handleSendMessage(actionPayload: ActionPayload) {
    const { actionName, event } = actionPayload
    const { plugin } = event
    const eventName = `${plugin}:${actionName}`
    this.logger.trace(`Sending message to ${eventName} on core plugin`)
    // handle sending a message back out.

    if (plugin === 'Core') {
      this.client.sendMessage(actionPayload)
    } else {
      this.centralEventBus.emit(eventName, actionPayload)
    }
  }

  /**
   * We dont need to format the payload for this plugin. This is
   * because the payload is already formatted in the core plugin.
   * @param event
   * @param payload
   */
  formatPayload(_, payload) {
    return payload
  }
}
