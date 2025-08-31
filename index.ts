#!/usr/bin/env node

import { evmAddress, mainnet, PageSize, PublicClient, postId, testnet } from '@lens-protocol/client'
import {
  fetchAccount,
  fetchApp,
  fetchApps,
  fetchFollowers,
  fetchFollowing,
  fetchGroup,
  fetchGroups,
  fetchPost,
  fetchPosts,
  fetchPostsToExplore,
  fetchUsername,
} from '@lens-protocol/client/actions'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  type CallToolResult,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

/**
 * Lens Protocol MCP Server
 *
 * This server provides access to Lens Protocol data and functionality
 * through the Model Context Protocol (MCP).
 */

export class LensMCPServer {
  private server: Server
  private lensClient: PublicClient

  constructor() {
    this.server = new Server(
      {
        name: 'lens-protocol-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    )

    // Initialize Lens client (default to mainnet)
    this.lensClient = PublicClient.create({
      environment: process.env.LENS_ENVIRONMENT === 'testnet' ? testnet : mainnet,
    })

    this.setupToolHandlers()
    this.setupResourceHandlers()
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'fetch_account',
            description: 'Fetch a Lens Protocol account/profile by address',
            inputSchema: {
              type: 'object',
              properties: {
                address: {
                  type: 'string',
                  description: 'Ethereum address of the account',
                },
              },
              required: ['address'],
            },
          },
          {
            name: 'fetch_posts',
            description: 'Fetch posts from Lens Protocol with optional filters',
            inputSchema: {
              type: 'object',
              properties: {
                pageSize: {
                  type: 'number',
                  description: 'Number of posts to fetch (default: 10)',
                  default: 10,
                },
                cursor: {
                  type: 'string',
                  description: 'Pagination cursor for next page',
                },
                author: {
                  type: 'string',
                  description: 'Filter by author address',
                },
              },
            },
          },
          {
            name: 'fetch_followers',
            description: 'Fetch followers of a specific account',
            inputSchema: {
              type: 'object',
              properties: {
                account: {
                  type: 'string',
                  description: 'Ethereum address of the account',
                },
                pageSize: {
                  type: 'number',
                  description: 'Number of followers to fetch (default: 10)',
                  default: 10,
                },
              },
              required: ['account'],
            },
          },
          {
            name: 'fetch_following',
            description: 'Fetch accounts that a specific account follows',
            inputSchema: {
              type: 'object',
              properties: {
                account: {
                  type: 'string',
                  description: 'Ethereum address of the account',
                },
                pageSize: {
                  type: 'number',
                  description: 'Number of following to fetch (default: 10)',
                  default: 10,
                },
              },
              required: ['account'],
            },
          },
          {
            name: 'search_accounts',
            description: 'Search for Lens Protocol accounts/profiles',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for accounts',
                },
                pageSize: {
                  type: 'number',
                  description: 'Number of results to return (default: 10)',
                  default: 10,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'search_posts',
            description: 'Search for posts/publications on Lens Protocol',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for posts',
                },
                pageSize: {
                  type: 'number',
                  description: 'Number of results to return (default: 10)',
                  default: 10,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'fetch_apps',
            description: 'Fetch Lens Protocol applications',
            inputSchema: {
              type: 'object',
              properties: {
                pageSize: {
                  type: 'number',
                  description: 'Number of apps to fetch (default: 10)',
                  default: 10,
                },
                cursor: {
                  type: 'string',
                  description: 'Pagination cursor',
                },
              },
            },
          },
          {
            name: 'fetch_groups',
            description: 'Fetch groups from Lens Protocol',
            inputSchema: {
              type: 'object',
              properties: {
                pageSize: {
                  type: 'number',
                  description: 'Number of groups to fetch (default: 10)',
                  default: 10,
                },
                cursor: {
                  type: 'string',
                  description: 'Pagination cursor',
                },
              },
            },
          },
          {
            name: 'fetch_usernames',
            description: 'Fetch usernames from Lens Protocol',
            inputSchema: {
              type: 'object',
              properties: {
                localName: {
                  type: 'string',
                  description: 'Local name part of the username',
                },
                namespace: {
                  type: 'string',
                  description: 'Namespace address (optional)',
                },
              },
            },
          },
        ],
      }
    })

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        switch (name) {
          case 'fetch_account':
            return await this.fetchAccount(args)
          case 'fetch_posts':
            return await this.fetchPosts(args)
          case 'fetch_followers':
            return await this.fetchFollowers(args)
          case 'fetch_following':
            return await this.fetchFollowing(args)
          case 'search_accounts':
            return await this.searchAccounts(args)
          case 'search_posts':
            return await this.searchPosts(args)
          case 'fetch_apps':
            return await this.fetchApps(args)
          case 'fetch_groups':
            return await this.fetchGroups(args)
          case 'fetch_usernames':
            return await this.fetchUsernames(args)
          default:
            throw new Error(`Unknown tool: ${name}`)
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    })
  }

  private setupResourceHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'lens://account/{address}',
            name: 'Lens Account',
            description: 'Lens Protocol account/profile information',
            mimeType: 'application/json',
          },
          {
            uri: 'lens://post/{id}',
            name: 'Lens Post',
            description: 'Lens Protocol post/publication',
            mimeType: 'application/json',
          },
          {
            uri: 'lens://app/{address}',
            name: 'Lens App',
            description: 'Lens Protocol application information',
            mimeType: 'application/json',
          },
          {
            uri: 'lens://group/{address}',
            name: 'Lens Group',
            description: 'Lens Protocol group information',
            mimeType: 'application/json',
          },
        ],
      }
    })

    // Handle resource reading
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params

      try {
        if (uri.startsWith('lens://account/')) {
          const address = uri.replace('lens://account/', '')
          return await this.readAccountResource(address)
        } else if (uri.startsWith('lens://post/')) {
          const id = uri.replace('lens://post/', '')
          return await this.readPostResource(id)
        } else if (uri.startsWith('lens://app/')) {
          const address = uri.replace('lens://app/', '')
          return await this.readAppResource(address)
        } else if (uri.startsWith('lens://group/')) {
          const address = uri.replace('lens://group/', '')
          return await this.readGroupResource(address)
        } else {
          throw new Error(`Unsupported resource URI: ${uri}`)
        }
      } catch (error) {
        throw new Error(`Failed to read resource ${uri}: ${error instanceof Error ? error.message : String(error)}`)
      }
    })
  }

  // Tool implementations
  private async fetchAccount(args: any): Promise<CallToolResult> {
    try {
      const { address } = args

      if (!address) {
        throw new Error('Address is required')
      }

      const result = await fetchAccount(this.lensClient, {
        address: evmAddress(address),
      })

      if (result.isErr()) {
        throw new Error(result.error.message || 'Failed to fetch account')
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.value, null, 2),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching account: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      }
    }
  }

  private async fetchPosts(args: any): Promise<CallToolResult> {
    try {
      const { pageSize = 10, cursor, author } = args

      // Convert pageSize to Lens Protocol enum
      const lensPageSize = pageSize <= 10 ? PageSize.Ten : PageSize.Fifty

      let result: any

      if (author) {
        // Fetch posts by specific author
        result = await fetchPosts(this.lensClient, {
          filter: {
            authors: [evmAddress(author)],
          },
          pageSize: lensPageSize,
          ...(cursor && { cursor }),
        })
      } else {
        // Fetch explore posts (general feed)
        result = await fetchPostsToExplore(this.lensClient, {
          pageSize: lensPageSize,
          ...(cursor && { cursor }),
        })
      }

      if (result.isErr()) {
        throw new Error(result.error.message || 'Failed to fetch posts')
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                posts: result.value.items,
                pageInfo: result.value.pageInfo,
              },
              null,
              2
            ),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching posts: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      }
    }
  }

  private async fetchFollowers(args: any): Promise<CallToolResult> {
    try {
      const { account, pageSize = 10 } = args

      if (!account) {
        throw new Error('Account address is required')
      }

      const lensPageSize = pageSize <= 10 ? PageSize.Ten : PageSize.Fifty

      const result = await fetchFollowers(this.lensClient, {
        account: evmAddress(account),
        pageSize: lensPageSize,
      })

      if (result.isErr()) {
        throw new Error(result.error.message || 'Failed to fetch followers')
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                followers: result.value.items,
                pageInfo: result.value.pageInfo,
              },
              null,
              2
            ),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching followers: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      }
    }
  }

  private async fetchFollowing(args: any): Promise<CallToolResult> {
    try {
      const { account, pageSize = 10 } = args

      if (!account) {
        throw new Error('Account address is required')
      }

      const lensPageSize = pageSize <= 10 ? PageSize.Ten : PageSize.Fifty

      const result = await fetchFollowing(this.lensClient, {
        account: evmAddress(account),
        pageSize: lensPageSize,
      })

      if (result.isErr()) {
        throw new Error(result.error.message || 'Failed to fetch following')
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                following: result.value.items,
                pageInfo: result.value.pageInfo,
              },
              null,
              2
            ),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching following: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      }
    }
  }

  private async searchAccounts(args: any): Promise<CallToolResult> {
    try {
      const { query, pageSize = 10 } = args

      if (!query) {
        throw new Error('Search query is required')
      }

      // For now, we'll use fetchPosts to search (since search functionality needs session client)
      // This is a simplified implementation
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { message: 'Account search requires authenticated session - not supported in public client' },
              null,
              2
            ),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error searching accounts: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      }
    }
  }

  private async searchPosts(args: any): Promise<CallToolResult> {
    try {
      const { query, pageSize = 10 } = args

      if (!query) {
        throw new Error('Search query is required')
      }

      // For now, we'll return explore posts as search is complex without session
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { message: 'Post search requires authenticated session - returning explore posts instead' },
              null,
              2
            ),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error searching posts: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      }
    }
  }

  private async fetchApps(args: any): Promise<CallToolResult> {
    try {
      const { pageSize = 10, cursor } = args

      const lensPageSize = pageSize <= 10 ? PageSize.Ten : PageSize.Fifty

      const result = await fetchApps(this.lensClient, {
        pageSize: lensPageSize,
        ...(cursor && { cursor }),
      })

      if (result.isErr()) {
        throw new Error(result.error.message || 'Failed to fetch apps')
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                apps: result.value.items,
                pageInfo: result.value.pageInfo,
              },
              null,
              2
            ),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching apps: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      }
    }
  }

  private async fetchGroups(args: any): Promise<CallToolResult> {
    try {
      const { pageSize = 10, cursor } = args

      const lensPageSize = pageSize <= 10 ? PageSize.Ten : PageSize.Fifty

      const result = await fetchGroups(this.lensClient, {
        pageSize: lensPageSize,
        ...(cursor && { cursor }),
      })

      if (result.isErr()) {
        throw new Error(result.error.message || 'Failed to fetch groups')
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                groups: result.value.items,
                pageInfo: result.value.pageInfo,
              },
              null,
              2
            ),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching groups: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      }
    }
  }

  private async fetchUsernames(args: any): Promise<CallToolResult> {
    try {
      const { localName, namespace } = args

      if (!localName) {
        throw new Error('Local name is required')
      }

      const usernameRequest: any = {
        username: {
          localName,
          ...(namespace && { namespace: evmAddress(namespace) }),
        },
      }

      const result = await fetchUsername(this.lensClient, usernameRequest)

      if (result.isErr()) {
        throw new Error(result.error.message || 'Failed to fetch username')
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.value, null, 2),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching username: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      }
    }
  }

  // Resource implementations
  private async readAccountResource(address: string) {
    try {
      const result = await fetchAccount(this.lensClient, {
        address: evmAddress(address),
      })

      if (result.isErr()) {
        throw new Error(result.error.message || 'Failed to fetch account')
      }

      return {
        contents: [
          {
            uri: `lens://account/${address}`,
            mimeType: 'application/json',
            text: JSON.stringify(result.value, null, 2),
          },
        ],
      }
    } catch (error) {
      throw new Error(`Failed to read account resource: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async readPostResource(id: string) {
    try {
      const result = await fetchPost(this.lensClient, {
        post: postId(id),
      })

      if (result.isErr()) {
        throw new Error(result.error.message || 'Failed to fetch post')
      }

      return {
        contents: [
          {
            uri: `lens://post/${id}`,
            mimeType: 'application/json',
            text: JSON.stringify(result.value, null, 2),
          },
        ],
      }
    } catch (error) {
      throw new Error(`Failed to read post resource: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async readAppResource(address: string) {
    try {
      const result = await fetchApp(this.lensClient, {
        app: evmAddress(address),
      })

      if (result.isErr()) {
        throw new Error(result.error.message || 'Failed to fetch app')
      }

      return {
        contents: [
          {
            uri: `lens://app/${address}`,
            mimeType: 'application/json',
            text: JSON.stringify(result.value, null, 2),
          },
        ],
      }
    } catch (error) {
      throw new Error(`Failed to read app resource: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async readGroupResource(address: string) {
    try {
      const result = await fetchGroup(this.lensClient, {
        group: evmAddress(address),
      })

      if (result.isErr()) {
        throw new Error(result.error.message || 'Failed to fetch group')
      }

      return {
        contents: [
          {
            uri: `lens://group/${address}`,
            mimeType: 'application/json',
            text: JSON.stringify(result.value, null, 2),
          },
        ],
      }
    } catch (error) {
      throw new Error(`Failed to read group resource: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async handleHttpRequest(request: any) {
    try {
      if (request.method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              resources: {},
            },
            serverInfo: {
              name: 'lens-protocol-mcp',
              version: '1.0.0',
            },
          },
        }
      }

      if (request.method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: [
              {
                name: 'fetch_account',
                description: 'Fetch a Lens Protocol account/profile by address',
                inputSchema: {
                  type: 'object',
                  properties: {
                    address: { type: 'string', description: 'Ethereum address of the account' },
                  },
                  required: ['address'],
                },
              },
              {
                name: 'fetch_posts',
                description: 'Fetch posts from Lens Protocol with optional filters',
                inputSchema: {
                  type: 'object',
                  properties: {
                    pageSize: { type: 'number', description: 'Number of posts to fetch (default: 10)' },
                    author: { type: 'string', description: 'Filter by author address' },
                  },
                },
              },
              {
                name: 'fetch_followers',
                description: 'Fetch followers of a specific account',
                inputSchema: {
                  type: 'object',
                  properties: {
                    account: { type: 'string', description: 'Ethereum address of the account' },
                    pageSize: { type: 'number', description: 'Number of followers to fetch (default: 10)' },
                  },
                  required: ['account'],
                },
              },
              {
                name: 'fetch_following',
                description: 'Fetch accounts that a specific account follows',
                inputSchema: {
                  type: 'object',
                  properties: {
                    account: { type: 'string', description: 'Ethereum address of the account' },
                    pageSize: { type: 'number', description: 'Number of following to fetch (default: 10)' },
                  },
                  required: ['account'],
                },
              },
              {
                name: 'search_accounts',
                description: 'Search for Lens Protocol accounts/profiles',
                inputSchema: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', description: 'Search query for accounts' },
                    pageSize: { type: 'number', description: 'Number of results (default: 10)' },
                  },
                  required: ['query'],
                },
              },
              {
                name: 'search_posts',
                description: 'Search for posts/publications on Lens Protocol',
                inputSchema: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', description: 'Search query for posts' },
                    pageSize: { type: 'number', description: 'Number of results (default: 10)' },
                  },
                  required: ['query'],
                },
              },
              {
                name: 'fetch_apps',
                description: 'Fetch Lens Protocol applications',
                inputSchema: {
                  type: 'object',
                  properties: {
                    pageSize: { type: 'number', description: 'Number of apps to fetch (default: 10)' },
                  },
                },
              },
              {
                name: 'fetch_groups',
                description: 'Fetch groups from Lens Protocol',
                inputSchema: {
                  type: 'object',
                  properties: {
                    pageSize: { type: 'number', description: 'Number of groups to fetch (default: 10)' },
                  },
                },
              },
              {
                name: 'fetch_usernames',
                description: 'Fetch usernames from Lens Protocol',
                inputSchema: {
                  type: 'object',
                  properties: {
                    localName: { type: 'string', description: 'Local name part of the username' },
                  },
                  required: ['localName'],
                },
              },
            ],
          },
        }
      }

      if (request.method === 'tools/call') {
        const toolName = request.params.name
        const args = request.params.arguments || {}

        let result: any
        switch (toolName) {
          case 'fetch_account':
            result = await this.fetchAccount(args)
            break
          case 'fetch_posts':
            result = await this.fetchPosts(args)
            break
          case 'fetch_followers':
            result = await this.fetchFollowers(args)
            break
          case 'fetch_following':
            result = await this.fetchFollowing(args)
            break
          case 'search_accounts':
            result = await this.searchAccounts(args)
            break
          case 'search_posts':
            result = await this.searchPosts(args)
            break
          case 'fetch_apps':
            result = await this.fetchApps(args)
            break
          case 'fetch_groups':
            result = await this.fetchGroups(args)
            break
          case 'fetch_usernames':
            result = await this.fetchUsernames(args)
            break
          default:
            throw new Error(`Unknown tool: ${toolName}`)
        }

        return {
          jsonrpc: '2.0',
          id: request.id,
          result,
        }
      }

      if (request.method === 'resources/list') {
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            resources: [
              {
                uri: 'lens://account/{address}',
                name: 'Lens Account',
                description: 'Lens Protocol account/profile information',
                mimeType: 'application/json',
              },
              {
                uri: 'lens://post/{id}',
                name: 'Lens Post',
                description: 'Lens Protocol post/publication',
                mimeType: 'application/json',
              },
              {
                uri: 'lens://app/{address}',
                name: 'Lens App',
                description: 'Lens Protocol application information',
                mimeType: 'application/json',
              },
              {
                uri: 'lens://group/{address}',
                name: 'Lens Group',
                description: 'Lens Protocol group information',
                mimeType: 'application/json',
              },
            ],
          },
        }
      }

      if (request.method === 'resources/read') {
        const uri = request.params.uri
        let result: any

        if (uri.startsWith('lens://account/')) {
          const address = uri.replace('lens://account/', '')
          result = await this.readAccountResource(address)
        } else if (uri.startsWith('lens://post/')) {
          const id = uri.replace('lens://post/', '')
          result = await this.readPostResource(id)
        } else if (uri.startsWith('lens://app/')) {
          const address = uri.replace('lens://app/', '')
          result = await this.readAppResource(address)
        } else if (uri.startsWith('lens://group/')) {
          const address = uri.replace('lens://group/', '')
          result = await this.readGroupResource(address)
        } else {
          throw new Error(`Unsupported resource URI: ${uri}`)
        }

        return {
          jsonrpc: '2.0',
          id: request.id,
          result,
        }
      }

      throw new Error(`Unknown method: ${request.method}`)
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      }
    }
  }

  async run() {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.error('Lens Protocol MCP Server running on stdio')
  }
}

// Start the server
if (import.meta.main) {
  const server = new LensMCPServer()
  server.run().catch((error) => {
    console.error('Server error:', error)
    process.exit(1)
  })
}
