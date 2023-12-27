import {
  Assert,
  NodeCategory,
  makeEventNodeDefinition,
} from '@magickml/behave-graph'
import { SlackEmitterType } from '../../dependencies/slackEmitter'
import { ON_SLACK_MESSAGE } from '../../events'
import { EventPayload } from 'packages/server/plugin/src'

type State = {
  onStartEvent?: ((event: EventPayload) => void) | undefined
}

const makeInitialState = (): State => ({
  onStartEvent: undefined,
})

export const slackMessageEvent = makeEventNodeDefinition({
  typeName: 'slack/onMessage',
  label: 'On Slack Message',
  category: NodeCategory.Event,
  configuration: {
    numInputs: {
      valueType: 'number',
      defaultValue: 3,
    },
  },
  in: {},
  out: {
    flow: 'flow',
    content: 'string',
    event: 'object',
  },
  initialState: makeInitialState(),
  init: args => {
    const {
      write,
      commit,
      node,
      engine,
      graph: { getDependency },
    } = args
    const onStartEvent = (event: EventPayload) => {
      write('event', event)
      write('content', event.content)

      commit('flow')

      if (!node || !engine) return

      engine.onNodeExecutionEnd.emit(node)
    }

    const slackEventEmitter = getDependency<SlackEmitterType>('Slack')

    slackEventEmitter?.on(ON_SLACK_MESSAGE, onStartEvent)

    return {
      onStartEvent,
    }
  },
  dispose: ({ state: { onStartEvent }, graph: { getDependency } }) => {
    Assert.mustBeTrue(onStartEvent !== undefined)

    const slackEventEmitter = getDependency<SlackEmitterType>('Slack')

    if (onStartEvent)
      slackEventEmitter?.removeListener(ON_SLACK_MESSAGE, onStartEvent)

    return {}
  },
})