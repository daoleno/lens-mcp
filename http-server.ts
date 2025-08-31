#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { LensMCPServer } from './index.js'

class LensHTTPServer {
  private app = new Hono()
  private mcpServer: LensMCPServer
  private sessionStore = new Map<string, any>()

  constructor() {
    this.mcpServer = new LensMCPServer()
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware() {
    this.app.use(
      cors({
        origin: '*',
        credentials: true,
      })
    )
  }

  private setupRoutes() {
    this.app.post('/mcp', async (c) => {
      try {
        const body = await c.req.json()
        const response = await this.mcpServer.handleHttpRequest(body)

        if (body.method === 'initialize') {
          const sessionId = this.generateSessionId()
          c.header('Mcp-Session-Id', sessionId)
          this.sessionStore.set(sessionId, { initialized: true })
        }

        return c.json(response)
      } catch (error) {
        console.error('HTTP MCP Error:', error)
        return c.json(
          {
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal error',
              data: error instanceof Error ? error.message : 'Unknown error',
            },
          },
          500
        )
      }
    })

    this.app.get('/mcp', (c) => {
      return c.text('event: message\ndata: {"type": "connection", "status": "connected"}\n\n', 200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })
    })

    this.app.get('/health', (c) => {
      return c.json({ status: 'ok', service: 'lens-mcp-server' })
    })
  }


  private generateSessionId(): string {
    return crypto.randomUUID()
  }

  start(port: number = 3000) {
    serve(
      {
        fetch: this.app.fetch,
        port,
        hostname: '0.0.0.0',
      },
      (info) => {
        console.log(`Lens MCP HTTP Server running on http://0.0.0.0:${info.port}/mcp`)
        console.log(`Health check available at http://0.0.0.0:${info.port}/health`)
      }
    )
  }
}

if (import.meta.main) {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000
  const server = new LensHTTPServer()
  server.start(port)
}
