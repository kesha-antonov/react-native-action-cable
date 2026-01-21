/**
 * Example React component showing proper ActionCable connection management
 *
 * This demonstrates how to prevent multiple connections when components
 * remount during development (Hot Reload) or app restarts.
 */

import React, { useEffect, useRef } from 'react'

interface ActionCableConnection {
  disconnect: () => void
}

// These would be imported from your helpers
declare function initActionCable(): Promise<ActionCableConnection>

interface ConversationListProps {}

const ConversationList: React.FC<ConversationListProps> = () => {
  const actionCableConnection = useRef<ActionCableConnection | null>(null)

  useEffect(() => {
    const initConnection = async (): Promise<void> => {
      // Initialize ActionCable connection
      actionCableConnection.current = await initActionCable()
    }

    initConnection()

    return () => {
      // Clean up the connection when component unmounts
      if (actionCableConnection.current) {
        actionCableConnection.current.disconnect()
        actionCableConnection.current = null
      }

      // Optional: Clean up the global ActionCable consumer
      // This is useful if you want to completely reset the connection
      // cleanupActionCable();
    }
  }, [])

  return (
    // Your component JSX here
    null
  )
}

export default ConversationList
