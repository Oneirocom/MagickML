// DOCUMENTED
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useConfig } from './ConfigProvider'
import { feathersClient } from 'client/feathers-client'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, setConnected } from 'client/state'

const PING_INTERVAL_MS = 5000
const PONG_TIMEOUT_MS = 2000

interface FeathersContext {
  client: any | null
}

/**
 * Feathers Context definition
 */
const Context = createContext<FeathersContext>(undefined!)

/**
 * Custom hook for Feathers Context
 */
export const useFeathers = (): FeathersContext => useContext(Context)

/**
 * FeathersProvider component
 * @props children, token
 */
export const FeathersProvider = ({
  children,
  token,
}): React.JSX.Element | null => {
  const { currentAgentId } = useSelector<RootState, RootState['globalConfig']>(
    state => state.globalConfig
  )
  const dispatch = useDispatch()
  const config = useConfig()
  const [client, setClient] = useState<FeathersContext['client']>(null)
  const pongReceivedRef = useRef(true)

  const currentAgentIdRef = useRef(currentAgentId)

  useEffect(() => {
    currentAgentIdRef.current = currentAgentId
  }, [currentAgentId])

  useEffect(() => {
    ;(async (): Promise<void> => {
      dispatch(setConnected(false))
      const client = await feathersClient.initialize(token, config)

      if (!client?.io) {
        console.error('Failed to initialize feathers client')
        return
      }

      client.io.on('connect', async (): Promise<void> => {
        console.info('Connected to the server')
        dispatch(setConnected(true))
        setClient(client)
        // we should properly import and use the feathers client generated by the server
        // eventually
        if (currentAgentIdRef.current) {
          // @ts-ignore
          client.service('agents').subscribe(currentAgentIdRef.current)
          // @ts-ignore
          client.service('agents').command({
            agentId: currentAgentIdRef.current,
            command: 'agent:spellbook:syncState',
            data: {},
          })
        }
      })

      client.io.on('reconnect', (): void => {
        console.info('Reconnected to the server')
        setClient(client)
      })

      client.io.on('disconnect', (): void => {
        console.info("We've been disconnected from the server")
        dispatch(setConnected(false))
        setTimeout((): void => {
          console.info('Reconnecting...')
          if (client?.io) {
            client.io.connect()
          }
        }, 1000)
      })

      client.io.on('error', (error): void => {
        dispatch(setConnected(false))
        console.info(`Connection error: ${error} \n trying to reconnect...`)
        setTimeout((): void => {
          console.info('Reconnecting...')
          if (client?.io) {
            client.io.connect()
          }
        }, 1000)
      })

      client.service('agents').on('log', (data): void => {
        console.info('agents log', data)
      })
    })()

    // check just to be sure we are reporting properly
    const intervalId = setInterval((): void => {
      if (!client) return
      if (!client.io.connected) {
        dispatch(setConnected(false))
      }
    }, 1000)

    return (): void => {
      clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (!client) return

    const pingInterval = setInterval(() => {
      if (!currentAgentIdRef.current) return

      client.service('agents').ping(currentAgentIdRef.current)
      pongReceivedRef.current = false

      // Set timeout to check for pong
      setTimeout(() => {
        if (!pongReceivedRef.current) {
          console.error('Pong not received within the expected time')
          dispatch(setConnected(false))
          // Handle timeout situation here (e.g., retry, alert user)
        }
      }, PONG_TIMEOUT_MS)
    }, PING_INTERVAL_MS)

    return () => clearInterval(pingInterval)
  }, [client])

  useEffect(() => {
    if (!client) return

    const handler = (data): void => {
      pongReceivedRef.current = true
      if (data.isLive) dispatch(setConnected(true))

      // if watching ever fails we should reconnect here.
      if (!data.isLive) {
        console.error('Agent is not live')
        client.service('agents').subscribe(currentAgentIdRef.current)
        dispatch(setConnected(false))
      }
    }

    client.service('agents').on('pong', handler)

    return () => client.service('agents').removeListener('pong', handler)
  }, [client])

  const publicInterface: FeathersContext = {
    client,
  }

  if (!client) return null

  return <Context.Provider value={publicInterface}>{children}</Context.Provider>
}
