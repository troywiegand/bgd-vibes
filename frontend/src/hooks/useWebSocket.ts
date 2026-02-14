import { useEffect, useState, useRef, useCallback } from 'react'

interface WebSocketMessage {
  type: string
  data?: any
  [key: string]: any // Allow additional properties for message payloads
}

type MessageHandler = (data: any) => void

export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef<Map<string, MessageHandler[]>>(new Map())

  useEffect(() => {
    const ws = new WebSocket(url)

    ws.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        console.log('WebSocket message:', message)

        // Call all handlers for this message type
        const handlers = handlersRef.current.get(message.type) || []
        handlers.forEach((handler) => handler(message.data))
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        const newWs = new WebSocket(url)
        newWs.onopen = () => setIsConnected(true)
      }, 3000)
    }

    ws.onerror = (err) => {
      console.error('WebSocket error:', err)
    }

    wsRef.current = ws

    return () => {
      ws.close()
    }
  }, [url])

  const subscribe = useCallback((messageType: string, handler: MessageHandler) => {
    console.log(`Subscribing to message type: ${messageType}`)
    if (!handlersRef.current.has(messageType)) {
      handlersRef.current.set(messageType, [])
    }
    handlersRef.current.get(messageType)!.push(handler)
    console.log(`Current subscriptions:`, Array.from(handlersRef.current.keys()))

    // Return unsubscribe function
    return () => {
      console.log(`Unsubscribing from message type: ${messageType}`)
      const handlers = handlersRef.current.get(messageType) || []
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }, [])

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Sending WebSocket message:', message)
      wsRef.current.send(JSON.stringify(message))
      return true
    } else {
      console.warn('WebSocket not connected. readyState:', wsRef.current?.readyState, 'Message not sent:', message)
      return false
    }
  }, [])

  return { isConnected, subscribe, send }
}
