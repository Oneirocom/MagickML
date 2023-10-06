import CssBaseline from '@mui/material/CssBaseline'
import {
  Tree,
  NodeModel,
  MultiBackend,
  getBackendOptions,
} from '@minoru/react-dnd-treeview'
import { DndProvider } from 'react-dnd'
import { useTreeData, useTabLayout } from '@magickml/providers'

import styles from './menu.module.css'
import { CustomNode } from './CustomNode'

type CustomData = {
  fileType: string
  fileSize: string
}

export const FileTree = () => {
  const { treeData, setTreeData } = useTreeData()
  const { openTab } = useTabLayout()

  const handleDrop = (newTree: NodeModel[]) => {
    setTreeData(newTree)
  }

  return (<div className={styles.files}>
    <CssBaseline />
    <DndProvider backend={MultiBackend} options={getBackendOptions()}>
      <div>
        <Tree
          tree={treeData}
          rootId={0}
          // @ts-ignore
          render={(
            node: NodeModel<CustomData>,
            { depth, isOpen, onToggle }
          ) => (
            <CustomNode
              openTab={openTab}
              node={node}
              depth={depth}
              isOpen={isOpen}
              onToggle={onToggle}
            />
          )}
          onDrop={handleDrop}
          classes={{
            root: styles.treeRoot,
            draggingSource: styles.draggingSource,
            dropTarget: styles.dropTarget,
          }}
        />
      </div>
    </DndProvider>
  </div>)
}