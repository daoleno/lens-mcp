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

Connect to: https://lens-mcp.lenscan.io/mcp

Access Lens Protocol data and functionality through the Model Context Protocol.
Powered by Lens Protocol.

Setup Instructions:

For most MCP clients:
{
  "mcpServers": {
    "lens-protocol": {
      "serverUrl": "https://lens-mcp.lenscan.io/mcp"
    }
  }
}

For Claude Code:
claude mcp add -s user -t http lens-protocol https://lens-mcp.lenscan.io/mcp

For Server-Sent Events (SSE):
{
  "mcpServers": {
    "lens-protocol": {
      "serverUrl": "https://lens-mcp.lenscan.io/sse"
    }
  }
}

Available Tools:
- fetch_account: Get Lens Protocol account/profile by address
- fetch_posts: Fetch posts with optional filters
- fetch_followers: Get followers of an account
- fetch_following: Get accounts that an account follows
- search_accounts: Search for accounts/profiles
- search_posts: Search for posts/publications
- fetch_apps: Get Lens Protocol applications
- fetch_groups: Fetch groups from Lens Protocol
- fetch_usernames: Fetch usernames by local name

Health Check: /health
`

      return c.text(welcomeMessage, 200, {
        'Content-Type': 'text/plain; charset=utf-8',
      })
    })

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
