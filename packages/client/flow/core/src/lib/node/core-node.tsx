// CoreNode.tsx
import React, { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { enqueueSnackbar } from 'notistack'
import { usePubSub } from '@magickml/providers'
import {
  selectActiveInput,
  setActiveInput,
  useSelectAgentsSpell,
} from 'client/state'
import { BaseNode } from './base-node'

type BaseNodeProps = React.ComponentProps<typeof BaseNode>
type CoreNodeProps = Omit<
  BaseNodeProps,
  'activeInput' | 'setActiveInput' | 'onResetNodeState' | 'spellEvent'
>

export const CoreNode: React.FC<CoreNodeProps> = props => {
  const { id, spell } = props
  const { events, subscribe } = usePubSub()
  const dispatch = useDispatch()
  const { lastItem: spellEvent } = useSelectAgentsSpell()
  const activeInput = useSelector(selectActiveInput)

  useEffect(() => {
    const unsubscribe = subscribe(events.RESET_NODE_STATE, () => {
      onResetNodeState()
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const onResetNodeState = () => {
    // Reset node state logic
    dispatch(setActiveInput(null))
    // Add any other reset logic here
  }

  const setActiveInputWrapper = useCallback(
    (input: { nodeId: string; name: string } | null) => {
      dispatch(setActiveInput(input))
    },
    [dispatch]
  )

  useEffect(() => {
    if (!spellEvent) return
    if (spellEvent.event === `${spell.id}-${id}-error`) {
      const truncatedMessage =
        spellEvent.message.length > 100
          ? spellEvent.message.substring(
              0,
              spellEvent.message.lastIndexOf(' ', 10)
            ) + '...'
          : spellEvent.message

      enqueueSnackbar(truncatedMessage, {
        variant: 'error',
      })
    }
  }, [spellEvent])

  return (
    <BaseNode
      {...props}
      activeInput={activeInput}
      setActiveInput={setActiveInputWrapper}
      onResetNodeState={onResetNodeState}
      spellEvent={spellEvent}
    />
  )
}