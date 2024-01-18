import {
  KnexAdapter,
  KnexAdapterOptions,
  KnexAdapterParams,
} from '@feathersjs/knex'
import type {
  GraphEventsData,
  GraphEventsPatch,
  GraphEventsQuery,
} from './graphEvents.schema'
import { Application, Params } from '@feathersjs/feathers'

export type GraphParams = KnexAdapterParams<GraphEventsQuery>

export class GraphEventService<
  ServiceParams extends Params = GraphParams
> extends KnexAdapter<
  GraphParams,
  GraphEventsData,
  ServiceParams,
  GraphEventsPatch
> {
  app: Application

  constructor(options: KnexAdapterOptions, app: Application) {
    super(options)
    this.app = app
  }

  async get(eventId: string, params: ServiceParams) {
    this._get(eventId, params)
  }

  async find(params?: ServiceParams) {
    const db = this.app.get('dbClient')
    const query = db
      .from('graphEvents')
      .select('*')
      .where({ agentId: params?.query?.agentId })

    const param = params?.query || {}
    if (param.eventType) query.where({ eventType: param.eventType })
    if (param.sender) query.where({ sender: param.sender })

    query.limit(param['$limit'])

    const res = await query

    return { events: res as unknown as { data: Array<any> } }
  }

  async create(data: GraphEventsData): Promise<GraphEventsData> {
    return (await this._create(data)) as GraphEventsData
  }

  async patch(
    eventId: string,
    data: GraphEventsData
  ): Promise<GraphEventsData> {
    return (await this._patch(eventId, data)) as GraphEventsData
  }

  async remove(eventId: string | null, params: ServiceParams) {
    return this._remove(eventId, params)
  }
}

/**
 * Get options for the graph events service
 *  * This function returns the options required by the KnexAdapter.
 * @param {Application} app - The Feathers application object.
 * @returns {KnexAdapterOptions} - The options required by KnexAdapter.
 */

export const getOptions = (app: Application): KnexAdapterOptions => {
  return {
    paginate: {
      default: 1000,
      max: 1000,
    },
    Model: app.get('dbClient'),
    name: 'graphEvents',
  }
}