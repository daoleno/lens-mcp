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
    // Root route with welcome message
    this.app.get('/', (c) => {
      const welcomeMessage = `Lens Protocol MCP Server

Connect to: https://lens-mcp.wooo.guru/mcp

Access Lens Protocol data and functionality through the Model Context Protocol.
Powered by Lens Protocol.

Setup Instructions:

For most MCP clients:
{
  "mcpServers": {
    "lens-protocol": {
      "serverUrl": "https://lens-mcp.wooo.guru/mcp"
    }
  }
}

For Claude Code:
claude mcp add -s user -t http lens-protocol https://lens-mcp.wooo.guru/mcp

Available Tools:
- lens_search: Find and discover anything on Lens Protocol (accounts, posts, usernames, apps, groups)
- lens_profile: Comprehensive account analysis (identity, social connections, influence, activity with posts)
- lens_content: Content performance analysis (posts, reactions, comments, engagement)
- lens_ecosystem: Explore the broader ecosystem (trending content, apps, statistics)

Health Check: /health
`

      return c.text(welcomeMessage, 200, {
        'Content-Type': 'text/plain; charset=utf-8',
      })
    })

    this.app.post('/mcp', async (c) => {
      const startTime = Date.now()
      const requestId = crypto.randomUUID().substring(0, 8)

      try {
        const body = await c.req.json()

        // Log tool calls
        if (body.method === 'tools/call' && body.params) {
          console.log(`🔧 [${requestId}] ${body.params.name}: ${JSON.stringify(body.params.arguments)}`)
        }

        const response = await this.mcpServer.handleHttpRequest(body)

        const duration = Date.now() - startTime

        if (body.method === 'initialize') {
          const sessionId = this.generateSessionId()
          c.header('Mcp-Session-Id', sessionId)
          this.sessionStore.set(sessionId, { initialized: true })
        } else if (body.method === 'tools/call') {
          const isError = response.error || response.result?.content?.[0]?.isError
          if (isError) {
            console.error(`❌ [${requestId}] ${body.params?.name} failed`)
          }
        }

        return c.json(response)
      } catch (error) {
        const duration = Date.now() - startTime
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`💥 [${requestId}] HTTP ERROR (${duration}ms): ${errorMessage}`)

        return c.json(
          {
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal error',
              data: errorMessage,
            },
          },
          500
        )
      }
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
