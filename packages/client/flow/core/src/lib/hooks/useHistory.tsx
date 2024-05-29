import { useCallback, useState } from 'react'

export const useHistory = ({
  maxHistorySize = 100,
  enableShortcuts = true,
  setEdges,
  setNodes,
  nodes,
  edges,
}) => {
  const [history, setHistory] = useState<any>([])
  const [redoStack, setRedoStack] = useState<any>([])

  const takeSnapshot = useCallback(() => {
    console.log('TAKING SNAPSHOT', { nodes, edges })
    setHistory(currentHistory => [
      ...currentHistory.slice(
        currentHistory.length - maxHistorySize + 1,
        currentHistory.length
      ),
      { nodes, edges },
    ])
    setRedoStack([])
  }, [nodes, edges, maxHistorySize])

  const undo = useCallback(() => {
    const lastEntry = history[history.length - 1]
    if (lastEntry) {
      setHistory(previousHistory =>
        previousHistory.slice(0, previousHistory.length - 1)
      )
      console.log('Nodes:', nodes)
      setRedoStack(previousRedoStack => [
        ...previousRedoStack,
        { nodes: nodes, edges: edges },
      ])
      setNodes(lastEntry.nodes)
      setEdges(lastEntry.edges)
    }
  }, [setNodes, setEdges, history])

  const redo = useCallback(() => {
    const lastRedoEntry = redoStack[redoStack.length - 1]
    if (lastRedoEntry) {
      setRedoStack(previousRedoStack =>
        previousRedoStack.slice(0, previousRedoStack.length - 1)
      )
      setHistory(previousHistory => [
        ...previousHistory,
        { nodes: nodes, edges: edges },
      ])
      console.log('Redoing:', lastRedoEntry)
      setNodes(lastRedoEntry.nodes)
      setEdges(lastRedoEntry.edges)
    }
  }, [setNodes, setEdges, redoStack])

  return {
    undo,
    redo,
    takeSnapshot,
    canUndo: history.length > 0,
    canRedo: redoStack.length > 0,
  }
}
