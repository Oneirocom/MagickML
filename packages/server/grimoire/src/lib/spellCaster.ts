import EventEmitter from 'events'
import pino from 'pino'

import {
  Engine,
  ILifecycleEventEmitter,
  readGraphFromJSON,
  IRegistry,
  GraphJSON,
  INode,
  IGraph,
  makeGraphApi,
} from '@magickml/behave-graph' // Assuming BasePlugin is definedsuming SpellInterface is defined Assuming ILifecycleEventEmitter is defined
import { SpellInterface } from 'server/schemas'
import { type EventPayload } from 'server/plugin'
import { getLogger } from 'server/logger'
import { AGENT_SPELL } from 'shared/core'
import { BaseRegistry } from './baseRegistry'
import { PluginManager } from 'server/pluginManager'
import { IEventStore } from './services/eventStore'
interface IAgent {
  id: string
}

/**
 * @class SpellCaster
 * @description
 * The `SpellCaster` class is a core component of our system, designed to manage the execution of spells
 * (defined workflows or logical sequences) within a graph-based architecture. This class embodies several
 * key software design principles and patterns that are crucial for a robust, scalable, and flexible system.
 * Understanding these principles will be vital for both utilizing and extending the `SpellCaster` effectively.
 *
 * Key Design Principles:
 * 1. Modularity: `SpellCaster` is designed as a self-contained module with a well-defined interface. This
 *    encapsulation allows for easy testing, maintenance, and scalability. It can be used in different contexts
 *    without affecting or being affected by other parts of the system.
 *
 * 2. Event-Driven Architecture: The class heavily relies on events for triggering and handling actions.
 *    This approach allows for decoupling components and promotes a reactive system where changes or specific
 *    conditions lead to corresponding actions.
 *
 * 3. Separation of Concerns: `SpellCaster` focuses solely on executing spells and managing their lifecycle.
 *    It separates the concerns of spell logic from other system functionalities like event handling or data
 *    persistence, ensuring that each module has a single responsibility.
 *
 * Usage Guidelines:
 * - Initialization: Before using `SpellCaster`, ensure that the spell configuration and registry are correctly
 * set up. The registry should include all necessary dependencies and configurations.
 *
 * - Event Handling: Utilize the `initializeHandlers` method to set up custom event listeners for node execution.
 * This method is crucial for monitoring and controlling the execution flow.
 *
 * - Graph Execution: The `executeGraphOnce` method allows for running the graph's nodes. It should be used
 * judiciously to control when and how often the graph is processed.
 *
 * - Extensibility: When extending `SpellCaster`, maintain the core principles and ensure that any additional
 * functionality aligns with the existing architecture.
 *
 * For junior developers:
 * Understanding `SpellCaster` is a great opportunity to learn about practical applications of design patterns
 * and principles. When working with this class, always consider how your changes or extensions will interact
 * with the existing architecture. Aim for clean, readable code that aligns with the principles outlined above.
 * Don't hesitate to ask questions or seek clarification as you navigate through the system.
 *
 * @example
 * // Example of using SpellCaster
 * const spellCaster = new SpellCaster({ loopDelay: 100, agent: agentInstance });
 * spellCaster.initialize(spellConfig, registry)
 *   .then(() => {
 *     // Spell is initialized and ready to execute
 *   })
 *   .catch(error => {
 *     // Handle initialization errors
 *   });
 */
export class SpellCaster<Agent extends IAgent = IAgent> {
  registry!: IRegistry
  engine!: Engine
  graph!: IGraph
  busy = false
  spell!: SpellInterface
  executeGraph = false
  pluginManager: PluginManager
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
    pluginManager,
  }: {
    loopDelay?: number
    limitInSeconds?: number
    limitInSteps?: number
    agent: Agent
    pluginManager: PluginManager
  }) {
    this.agent = agent
    this.pluginManager = pluginManager
    this.logger = getLogger()
    this.loopDelay = loopDelay
    this.limitInSeconds = limitInSeconds
    this.limitInSteps = limitInSteps

    // When we are done loading plugins, we build the registry
    const baseRegistry = new BaseRegistry(this.agent)
    this.registry = this.pluginManager.getRegistry(
      this,
      baseRegistry.getRegistry()
    )
    this.graph = makeGraphApi(this.registry)

    // initialize the base registry once we have the full graph.
    // This sets up the state service properly.
    baseRegistry.init(this.graph)
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
   * Initialize the spell caster. We are assuming here that the registry coming in is already
   * created by the main spellbook with the appropriate logger and other core dependencies.
   * @param spell - The spell to initialize.
   * @param registry - The registry to use.
   * @returns A promise that resolves when the spell caster is initialized.
   */
  async initialize(spell: SpellInterface): Promise<this> {
    this.logger.debug(
      `SPELLBOOK: Initializing spellcaster for ${spell.id} in agent ${this.agent.id}`
    )
    this.spell = spell
    const graph = readGraphFromJSON({
      graphJson: this.spell.graph as GraphJSON,
      registry: this.registry,
    })

    this.engine = new Engine(graph.nodes)
    this.initializeHandlers()
    this.start()
    return this
  }

  /**
   * Initialize the handlers for the spell caster.  We are listening for the node
   * execution end event so that we can emit the node work event.
   * @returns A promise that resolves when the handlers are initialized.
   */
  initializeHandlers() {
    // this.engine.onNodeExecutionStart.addListener(node => {
    //   this.logger.trace(`<< ${node.description.typeName} >> START`)
    // })
    this.engine.onNodeExecutionEnd.addListener(
      this.executionEndHandler.bind(this)
    )
  }

  /**
   * This is the handler for the node execution end event. We emit the
   * node work event here to be sent up to appropriate clients.
   * @param node - The node that just finished executing.
   * @returns A promise that resolves when the node work event is emitted.
   */
  executionEndHandler = async (node: any) => {
    this.emitNodeWork(node)
  }

  /**
   * emit the node work event to the agent when it is executed.
   * @param nodeId - The id of the node.
   * @param node - The node.
   * @returns A promise that resolves when the event is emitted.
   * @example
   * spellCaster.emitNodeWork(nodeId, node)
   */
  emitNodeWork(node: INode) {
    const event = `${this.spell.id}-${node.id}`

    const message = {
      event,
      nodeId: node.id,
      type: node.description.typeName,
      outputs: node.outputs,
      inputs: node.inputs,
    }

    this.emitAgentSpellEvent(message)
  }

  /**
   * Starts the run loop.  We set running to true, fire off the appropriate lifecycle events.
   * Then we loop through the engine and execute all the nodes.  We then wait for the loop delay
   * and then repeat. We are also ensuring that the engine is labelled busy when it is actively
   * processing nodes.  This will help with ensuring we can allocate work to another spell caster
   * if this one is busy.
   * @returns A promise that resolves when the run loop is started.
   */
  async start(): Promise<void> {
    this.logger.debug(
      'SPELLBOOK: Starting run loop for spell %s',
      this.spell.id
    )

    while (true) {
      // Always loop
      if (this.isRunning || this.executeGraph) {
        await this.executeGraphOnce()
      }
      await new Promise(resolve => setTimeout(resolve, this.loopDelay))
    }
  }

  /**
   * Method which will run a single execution  on the graph. We tick the lifecycle event emitter
   * and then execute all the nodes in the graph.  We then set the busy flag to false. Finally
   * we set the executeGraph flag to false so that the spellbook knows that the spell is no longer
   * executing.
   * @returns A promise that resolves when the graph is executed.
   */
  async executeGraphOnce(isEnd = false): Promise<void> {
    if (isEnd) this.lifecycleEventEmitter.endEvent.emit()
    if (!isEnd) this.lifecycleEventEmitter.tickEvent.emit()
    this.busy = true
    await this.engine.executeAllAsync(this.limitInSeconds, this.limitInSteps)
    this.busy = false
    this.executeGraph = false // Reset the flag after execution
  }

  /**
   * Triggers the graph to execfute.  The flag is used in the loop to determine
   * if the graph should be executed.
   * @example
   * spellCaster.triggerGraphExecution()
   */
  triggerGraphExecution(): void {
    this.executeGraph = true
  }

  /**
   * Starts the run loop.  This is called by the spellbook when the spell is started.
   */
  startRunLoop(): void {
    this.lifecycleEventEmitter.startEvent.emit()
    this.isRunning = true
  }

  /**
   * Stops the run loop.  This is called by the spellbook when the spell is stopped.
   */
  stopRunLoop(): void {
    // onnly execute once for the end event if it is running
    if (this.isRunning) this.executeGraphOnce(true)
    this.isRunning = false
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
    this.logger.trace(
      `SpellCaster: Handling event ${eventName} for ${dependency} in spell ${this.spell.name}`
    )
    // we grab the dependency from the registry and trigger it
    const eventEmitter = this.registry.dependencies[dependency] as
      | EventEmitter
      | undefined

    if (!eventEmitter) {
      this.logger.error(`No dependency found for ${dependency}`)
      return
    }

    // make a copy of the payload so we dont mutate the original

    //tag payload with spellcaster information
    payload.runInfo = {
      spellId: this.spell.id,
    }

    this.logger.trace(
      `SpellCaster: Setting run info for ${eventName} to spell ${this.spell.id}`
    )

    // we set the current event in the event store for access in the state
    const eventStore = this.graph.getDependency<IEventStore>('IEventStore')

    if (eventStore) eventStore.setEvent(payload)

    // we emit the event to the dependency which will commit the event to the engine
    eventEmitter.emit(eventName, payload)

    // we trigger the graph to execute if it our main loop isnt running
    this.triggerGraphExecution()
  }

  /**
   * Disposes the spell caster.  We stop the run loop, dispose the engine
   * and set running to false.
   * @example
   * spellCaster.dispose()
   * @returns A promise that resolves when the spell caster is disposed.
   */
  dispose() {
    this.logger.debug(`Disposing spell caster for ${this.spell.id}`)
    this.stopRunLoop()
    this.engine.dispose()
  }

  /**
   * Returns the busy state of the spell caster.
   * @returns The busy state of the spell caster.
   * @example
   * const isBusy = spellCaster.isBusy()
   * if (isBusy) {
   *  // do something
   * }
   */
  isBusy() {
    return this.busy
  }

  /*
   * This is the entrypoint for the spellCaster.  It is called by the spellbook
   * when a spell receives an event.  We pass the event to the engine and it will
   * trigger the appropriate nodes to fire off a flow to get added to the fiber queue.
   * @param dependency - The name of the dependency. Often the plugin name.
   * @param eventName - The name of the event.
   * @param payload - The payload of the event.
   * @returns A promise that resolves when the event is handled.
   * @example
   */
  emitAgentSpellEvent(_message) {
    // same message emitted from server or agent
    const message = {
      ..._message,
      // make sure the message contains the spellId in case it is needed.
      spellId: this.spell.id,
      projectId: this.spell.projectId,
    }

    this.agent.publishEvent(AGENT_SPELL(this.agent.id), message)
  }
}