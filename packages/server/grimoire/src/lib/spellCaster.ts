import EventEmitter from 'events'
import pino from 'pino'

import {
  Engine,
  ILifecycleEventEmitter,
  readGraphFromJSON,
  IRegistry,
  GraphJSON,
} from '@magickml/behave-graph' // Assuming BasePlugin is definedsuming SpellInterface is defined Assuming ILifecycleEventEmitter is defined
import { SpellInterface } from 'server/schemas'
import { type EventPayload } from 'server/plugin'
import { getLogger } from 'server/logger'
import { generateNodeHash } from 'shared/utils'

interface IAgent {
  id: string
}

class SpellCaster<Agent extends IAgent> {
  registry!: IRegistry
  engine!: Engine
  busy = false
  spell!: SpellInterface
  private agent
  private logger: pino.Logger
  private isRunning: boolean = false
  private loopDelay: number
  private limitInSeconds: number
  private limitInSteps: number

  constructor({
    loopDelay = 100,
    limitInSeconds = 5,
    limitInSteps = 100,
    agent,
  }: {
    loopDelay?: number
    limitInSeconds?: number
    limitInSteps?: number
    agent: Agent
  }) {
    this.agent = agent
    this.logger = getLogger()
    this.loopDelay = loopDelay
    this.limitInSeconds = limitInSeconds
    this.limitInSteps = limitInSteps
  }

  /**
   * Initialize the spell caster. We are assuming here that the registry coming in is already
   * created by the main spellbook with the appropriate logger and other core dependencies.
   * @param spell - The spell to initialize.
   * @param registry - The registry to use.
   * @returns A promise that resolves when the spell caster is initialized.
   */
  async initialize(spell: SpellInterface, registry: IRegistry): Promise<this> {
    this.logger.debug(
      `SPELLBOOK: Initializing spellcaster for ${spell.id} in agent ${this.agent.id}`
    )
    this.spell = spell
    this.registry = registry
    const graph = readGraphFromJSON({
      graphJson: this.spell.graph as GraphJSON,
      registry: registry,
    })

    this.engine = new Engine(graph.nodes)
    this.initializeHandlers()
    this.startRunLoop()
    return this
  }

  initializeHandlers() {
    // this.engine.onNodeExecutionStart.addListener(node => {
    //   console.log(`>> ${node.description.typeName} >> START`)
    //   this.logger.trace(`<< ${node.description.typeName} >> START`)
    // })
    // this.engine.onNodeExecutionEnd.addListener(node => {
    //   console.log('NODE EXECUTED', generateNodeHash(node))
    // })
  }

  /**
   * Returns the lifecycle event emitter from the registry for easy access.
   * @returns The lifecycle event emitter.
   */
  get lifecycleEventEmitter(): ILifecycleEventEmitter {
    return this.registry.dependencies[
      'ILifecycleEventEmitter'
    ] as ILifecycleEventEmitter
  }

  /**
   * Starts the run loop.  We set running to true, fire off the appropriate lifecycle events.
   * Then we loop through the engine and execute all the nodes.  We then wait for the loop delay
   * and then repeat. We are also ensuring that the engine is labelled busy when it is actively
   * processing nodes.  This will help with ensuring we can allocate work to another spell caster
   * if this one is busy.
   * @returns A promise that resolves when the run loop is started.
   */
  async startRunLoop(): Promise<void> {
    this.logger.debug(
      'SPELLBOOK: Starting run loop for spell %s',
      this.spell.id
    )
    this.isRunning = true
    this.lifecycleEventEmitter.startEvent.emit()

    while (this.isRunning) {
      this.lifecycleEventEmitter.tickEvent.emit()
      this.busy = true
      await this.engine.executeAllAsync(this.limitInSeconds, this.limitInSteps)
      await new Promise(resolve => setTimeout(resolve, this.loopDelay))
      this.busy = false
    }
  }

  /**
   * Stops the run loop.  This is called by the spellbook when the spell is stopped.
   */
  stopRunLoop(): void {
    this.isRunning = false
    this.lifecycleEventEmitter.endEvent.emit()
  }

  /**
   * This is the main entrypoint for the spellCaster.  It is called by the spellbook
   * when a spell receives an event.  We pass the event to the engine and it will
   * trigger the appropriate nodes to fire off a flow to get added to the fiber queue.
   * @param dependency - The name of the dependency. Often the plugin name.
   * @param eventName - The name of the event.
   * @param payload - The payload of the event.
   * @returns A promise that resolves when the event is handled.
   * @example
   */
  handleEvent(
    dependency: string,
    eventName: string,
    payload: EventPayload
  ): void {
    // we grab the dependency from the registry and trigger it
    const eventEmitter = this.registry.dependencies[dependency] as
      | EventEmitter
      | undefined

    if (!eventEmitter) {
      this.logger.error(`No dependency found for ${dependency}`)
      return
    }
    eventEmitter.emit(eventName, payload)
  }

  dispose() {
    this.engine.dispose()
    this.isRunning = false
  }

  isBusy() {
    return this.busy
  }
}

export default SpellCaster
