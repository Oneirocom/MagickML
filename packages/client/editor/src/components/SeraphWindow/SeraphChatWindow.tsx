import React, { useEffect, useState } from 'react'
import { Window } from 'client/core'
import { useSnackbar } from 'notistack'
import { v4 as uuidv4 } from 'uuid'
import {
  RootState,
  useCreateAgentSeraphEventMutation,
  useGetAgentSeraphEventsQuery,
  useGetSpellByNameQuery,
  useSelectAgentsSeraphEvent,
} from 'client/state'
import posthog from 'posthog-js'

import { useSelector } from 'react-redux'
import { SeraphChatInput } from './SeraphChatInput'
import { SeraphChatHistory } from './SeraphChatHistory'
import { Message, useMessageHistory } from '../../hooks/useMessageHistory'
import { useMessageQueue } from '../../hooks/useMessageQueue'
import {
  ISeraphEvent,
  SeraphEvents,
  SeraphFunction,
  SeraphRequest,
} from 'servicesShared'

const SeraphChatWindow = props => {
  const [value, setValue] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [functionEventData, setFunctionEventData] = useState<SeraphFunction>()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [middlewareEventData, setMiddlewareEventData] =
    useState<SeraphFunction>()

  const { enqueueSnackbar } = useSnackbar()
  const { tab } = props
  const spellName = tab.params.spellName

  const { lastItem: lastEvent } = useSelectAgentsSeraphEvent()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [createSeraphRequest, { error: requestRecordError }] =
    useCreateAgentSeraphEventMutation()

  const { spell } = useGetSpellByNameQuery(
    { spellName },
    {
      skip: !spellName,
      selectFromResult: ({ data }) => ({ spell: data?.data[0] }),
    }
  )

  const globalConfig = useSelector((state: RootState) => state.globalConfig)
  const { currentAgentId } = globalConfig

  const { data: seraphChatHistory } = useGetAgentSeraphEventsQuery({
    agentId: currentAgentId,
  })

  const {
    history,
    scrollbars,
    printToConsole,
    setHistory,
    // setAutoscroll,
    // autoscroll,
  } = useMessageHistory({ seraph: true })

  const { streamToConsole } = useMessageQueue({ setHistory, seraph: true })

  const makeSeraphRequest = async (request: SeraphRequest) => {
    if (!currentAgentId || !spell) return
    const newRequest: ISeraphEvent = {
      id: uuidv4(),
      agentId: currentAgentId,
      projectId: spell.projectId,
      type: SeraphEvents.request,
      spellId: tab.params.spellId,
      data: { request },
      createdAt: new Date().toISOString(),
    }
    const data = await createSeraphRequest(newRequest)
    if (!data) {
      enqueueSnackbar('Error sending message', { variant: 'error' })
    }
  }

  useEffect(() => {
    if (seraphChatHistory?.length) {
      const formattedHistory = seraphChatHistory.map((event: ISeraphEvent) => {
        const isMessage = event.type === SeraphEvents.message
        return {
          sender: isMessage ? 'assistant' : 'user',
          content: isMessage ? event.data.message : event.data.request?.message,
        } as Message
      })
      setHistory(formattedHistory)
    }
  }, [seraphChatHistory, setHistory])

  // React to new events
  useEffect(() => {
    const lastEventData = lastEvent?.data.data
    if (!lastEventData) return
    const seraphEvent = lastEvent.data as ISeraphEvent
    if (!seraphEvent) return

    // Handling common actions in a function to reduce code repetition
    const handleEvent = (
      message: string | undefined,
      variant: 'info' | 'error' = 'info'
    ) => {
      if (variant === 'error') {
        enqueueSnackbar(message, { variant })
      }
      printToConsole(message || '')
    }

    // Using an object to map event types to their specific actions
    const eventActions = {
      [SeraphEvents.message]: () => {},
      [SeraphEvents.error]: () => handleEvent(seraphEvent.data.error, 'error'),
      [SeraphEvents.functionResult]: () =>
        setFunctionEventData(seraphEvent.data.functionResult),
      [SeraphEvents.functionExecution]: () =>
        setFunctionEventData(seraphEvent.data.functionExecution),
      [SeraphEvents.info]: () => handleEvent(seraphEvent.data.info),
      [SeraphEvents.middlewareExecution]: () =>
        setMiddlewareEventData(seraphEvent.data.middlewareExecution),
      [SeraphEvents.middlewareResult]: () =>
        setMiddlewareEventData(seraphEvent.data.middlewareResult),
      [SeraphEvents.token]: () => streamToConsole(seraphEvent.data.token || ''),
    }

    // Execute the action if the event type matches
    eventActions[seraphEvent.type]?.()

    // type will be request at this point
    if (lastEventData.request) {
      printToConsole(lastEventData.request.message)
    }
  }, [lastEvent])

  // Handle message sending
  const onSend = async () => {
    if (!value || !currentAgentId || !spell) return
    try {
      const newMessage: Message = {
        sender: 'user',
        content: value,
      }

      const eventPayload: SeraphRequest = {
        message: value,
      }

      const success = makeSeraphRequest(eventPayload)
      if (!success) return

      const newHistory = [...history, newMessage]
      setHistory(newHistory)
      setValue('')

      posthog.capture('seraph_request_sent', {
        spellId: spell.id,
        projectId: spell.projectId,
        agentId: currentAgentId,
      })
    } catch (error) {
      console.error('Error sending message', error)
    }
  }

  const onChange = e => {
    setValue(e.target.value)
  }

  return (
    <div className="flex-grow border-0 justify-between rounded bg:[--deep-background-color]">
      <Window>
        <div className="flex flex-col h-full bg-[--ds-black] w-[96%] m-auto">
          <SeraphChatHistory history={history} scrollbars={scrollbars} />
          <SeraphChatInput onChange={onChange} value={value} onSend={onSend} />
        </div>
      </Window>
    </div>
  )
}

export default SeraphChatWindow
