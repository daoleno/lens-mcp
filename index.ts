#!/usr/bin/env node

import {
  evmAddress,
  mainnet,
  PageSize,
  PostReactionType,
  PostReferenceType,
  PublicClient,
  postId,
  testnet,
} from '@lens-protocol/client'
import {
  fetchAccount,
  fetchAccountStats,
  fetchAccounts,
  fetchApp,
  fetchApps,
  fetchFollowers,
  fetchFollowing,
  fetchGroup,
  fetchGroups,
  fetchPost,
  fetchPostReactions,
  fetchPostReferences,
  fetchPosts,
  fetchPostsToExplore,
  fetchTimelineHighlights,
  fetchUsernames,
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
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

type ResponseFormat = 'concise' | 'detailed' | 'raw'

const DEFAULT_LIMITS = {
  maxTokens: 25000,
  maxItems: 50,
}

// Zod schemas for tool inputs
const LensSearchSchema = z.object({
  for: z.string().optional().describe('What you want to find (natural language): "crypto accounts", "DeFi posts", "lens usernames", "popular apps"'),
  query: z.string().describe('Search terms or keywords'),
  type: z.enum(['accounts', 'posts', 'usernames', 'apps', 'groups']).describe('Type of content to search for'),
  show: z.enum(['concise', 'detailed', 'raw']).default('concise').describe('How much detail to include'),
  limit: z.number().max(50).default(10).describe('Maximum results to return per page'),
  cursor: z.string().optional().describe('Pagination cursor to fetch next page of results (returned in previous response)'),
  filters: z.object({
    namespace: z.string().optional().describe('Username namespace to filter by'),
  }).optional(),
})

const LensProfileSchema = z.object({
  who: z.string().describe('Ethereum address or username of the account to analyze'),
  include: z.array(z.enum(['basic', 'social', 'influence', 'activity', 'network'])).default(['basic']).describe('What information to include: basic info, social connections, influence metrics, recent activity, or network analysis'),
  analyze: z.enum(['overview', 'influence', 'engagement', 'network']).optional().describe('Type of analysis to perform on the profile'),
  show: z.enum(['concise', 'detailed', 'raw']).default('concise').describe('Level of detail in response'),
  depth: z.number().max(100).default(25).describe('How many social connections or posts to analyze'),
})

const LensContentSchema = z.object({
  what: z.string().optional().describe('What you want to analyze (natural language): "reactions to this post", "comments on post", "popular posts by user", "trending content"'),
  about: z.enum(['posts', 'reactions', 'references', 'highlights']).describe('Type of content analysis to perform'),
  target: z.string().describe('Post ID (like "post_123") for post analysis, or user address for user content'),
  show: z.enum(['concise', 'detailed', 'raw']).default('concise').describe('How detailed the analysis should be'),
  include: z.array(z.enum(['likes', 'dislikes', 'comments', 'quotes', 'reposts', 'metrics'])).optional().describe('What types of engagement to include'),
  limit: z.number().max(50).default(10).describe('Maximum items to analyze per page'),
  cursor: z.string().optional().describe('Pagination cursor to fetch next page of results'),
  filters: z.object({
    author: z.string().optional().describe('Filter content by specific author'),
    timeframe: z.enum(['1d', '7d', '30d', 'all']).optional().describe('Time period for analysis'),
  }).optional(),
})

const LensEcosystemSchema = z.object({
  explore: z.string().optional().describe('What aspect of the ecosystem to explore (natural language): "trending apps", "platform statistics", "popular groups", "ecosystem health"'),
  view: z.enum(['trending', 'apps', 'groups', 'statistics', 'insights']).describe('Type of ecosystem view to show'),
  focus: z.string().optional().describe('Specific app, group, or area to focus on (address or name)'),
  show: z.enum(['concise', 'detailed', 'raw']).default('concise').describe('Level of detail to provide'),
  timeframe: z.enum(['1d', '7d', '30d', 'all']).default('7d').describe('Time period for trending analysis'),
  limit: z.number().max(50).default(20).describe('Maximum items to return'),
})

// Export types for TypeScript
export type LensSearchInput = z.infer<typeof LensSearchSchema>
export type LensProfileInput = z.infer<typeof LensProfileSchema>
export type LensContentInput = z.infer<typeof LensContentSchema>
export type LensEcosystemInput = z.infer<typeof LensEcosystemSchema>


/**
 * Lens Protocol MCP Server
 *
 * Provides consolidated, agent-optimized tools for accessing Lens Protocol data
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

    this.lensClient = PublicClient.create({
      environment: process.env.LENS_ENVIRONMENT === 'testnet' ? testnet : mainnet,
    })

    this.setupToolHandlers()
    this.setupResourceHandlers()
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'lens_search',
            description:
              'When you need to find or discover anything on Lens Protocol - accounts, posts, usernames, apps, or groups. Perfect for exploring and discovering content based on queries, names, or topics.',
            inputSchema: zodToJsonSchema(LensSearchSchema),
          },
          {
            name: 'lens_profile',
            description:
              'When you want to learn everything about a Lens Protocol account - their identity, social connections, influence, and activity. Perfect for understanding who someone is, their network, and their impact on the platform.',
            inputSchema: zodToJsonSchema(LensProfileSchema),
          },
          {
            name: 'lens_content',
            description:
              'When you want to understand how content performs and what people think about it. Perfect for analyzing post engagement, reading reactions and comments, or measuring content success and social sentiment.',
            inputSchema: zodToJsonSchema(LensContentSchema),
          },
          {
            name: 'lens_ecosystem',
            description:
              "When you want to explore the broader Lens Protocol ecosystem - trending content, popular applications, platform statistics, and community insights. Perfect for understanding what's happening across the platform and discovering ecosystem opportunities.",
            inputSchema: zodToJsonSchema(LensEcosystemSchema),
          },
        ],
      }
    })

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        // Validate input using Zod schemas
        let validatedArgs: any
        switch (name) {
          case 'lens_search':
            validatedArgs = LensSearchSchema.parse(args)
            return await this.lensSearch(validatedArgs)
          case 'lens_profile':
            validatedArgs = LensProfileSchema.parse(args)
            return await this.lensProfile(validatedArgs)
          case 'lens_content':
            validatedArgs = LensContentSchema.parse(args)
            return await this.lensContent(validatedArgs)
          case 'lens_ecosystem':
            validatedArgs = LensEcosystemSchema.parse(args)
            return await this.lensEcosystem(validatedArgs)
          default:
            return this.createErrorResponse(name, `Unknown tool: ${name}`, {
              suggestion: 'Available tools: lens_search, lens_profile, lens_content, lens_ecosystem',
            })
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
          return this.createErrorResponse(name, `Invalid input: ${errorMessages}`, {
            suggestion: 'Check the tool parameters and ensure all required fields are provided with correct types.',
          })
        }
        return this.createErrorResponse(name, error instanceof Error ? error.message : String(error))
      }
    })
  }

  private setupResourceHandlers() {
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

  private createErrorResponse(toolName: string, message: string, context?: { suggestion?: string }): CallToolResult {
    // Sanitize error message to avoid exposing sensitive information
    const sanitizedMessage = message.includes('ENOTFOUND') ? 'Network connection failed' : message
    
    let errorText = `❌ Error in ${toolName}: ${sanitizedMessage}`

    if (context?.suggestion) {
      errorText += `\\n\\n💡 Suggestion: ${context.suggestion}`
    }

    return {
      content: [
        {
          type: 'text',
          text: errorText,
        },
      ],
      isError: true,
    }
  }

  private isValidEvmAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false
    // EVM address is 42 characters long (0x + 40 hex chars)
    if (address.length !== 42) return false
    // Must start with 0x
    if (!address.startsWith('0x')) return false
    // Must be valid hex (only 0-9, a-f, A-F after 0x)
    return /^0x[0-9a-fA-F]{40}$/.test(address)
  }

  private getPostType(post: any): string {
    // Based on Lens SDK structure analysis
    if (post.commentOn && post.commentOn.id) {
      return 'comment'
    }
    if (post.quoteOf && post.quoteOf.id) {
      return 'quote'
    }
    // Check if it's a mirror/repost (has root but is not the same as root)
    if (post.root && post.root.id && post.root.id !== post.id) {
      return 'mirror'
    }
    // Default to original post
    return 'post'
  }

  private getPostTypeEmoji(postType: string): string {
    switch (postType) {
      case 'comment':
        return '💬'
      case 'quote':
        return '🔄'
      case 'mirror':
        return '🪞'
      case 'post':
        return '📝'
      default:
        return '📄'
    }
  }

  private checkTokenLimit(
    text: string,
    maxTokens: number = DEFAULT_LIMITS.maxTokens
  ): { isValid: boolean; tokens: number; suggestion?: string } {
    if (!text || typeof text !== 'string') {
      return { isValid: true, tokens: 0 }
    }
    
    const tokens = Math.ceil(text.length / 4)

    if (tokens <= maxTokens) {
      return { isValid: true, tokens }
    }

    return {
      isValid: false,
      tokens,
      suggestion: `Response size (${tokens} tokens) exceeds limit (${maxTokens}). Consider using:\n• show="concise" for summary only\n• Pagination with cursor parameter\n• Narrower include parameters`,
    }
  }

  private formatResponse(data: any, format: ResponseFormat, summary?: string): CallToolResult {
    let content: string

    switch (format) {
      case 'concise':
        content = summary || this.generateSummary(data)
        break
      case 'detailed': {
        // For detailed mode, use smarter data reduction to stay under token limit
        const summaryText = summary || this.generateSummary(data)
        const optimizedData = this.optimizeDataForTokens(data)
        content = `${summaryText}\\n\\n${JSON.stringify(optimizedData, null, 2)}`
        break
      }
      case 'raw':
        content = JSON.stringify(data, null, 2)
        break
    }

    // Check token limit without truncating
    const tokenCheck = this.checkTokenLimit(content)

    if (!tokenCheck.isValid) {
      // Return error with helpful suggestions instead of truncating
      return this.createErrorResponse('token_limit_exceeded', `Response too large (${tokenCheck.tokens} tokens)`, {
        suggestion: tokenCheck.suggestion,
      })
    }

    return {
      content: [
        {
          type: 'text',
          text: content, // No truncation!
        },
      ],
    }
  }

  private optimizeDataForTokens(data: any, targetTokens: number = 15000): any {
    if (!data) return data

    // Quick size check without full JSON.stringify for better performance
    const roughSize = typeof data === 'string' ? data.length : JSON.stringify(data).length

    // If already small enough, return as-is
    if (roughSize < targetTokens * 4) {
      return data
    }

    // NEVER truncate arrays - instead compress data structure
    return this.deepOptimizeStructure(data, targetTokens)
  }

  private deepOptimizeStructure(data: any, targetTokens: number): any {
    if (!data || typeof data !== 'object') return data

    const optimized: any = Array.isArray(data) ? [] : {}

    // Dramatically expanded list of fields to remove - keep only truly essential semantic data
    const redundantFields = new Set([
      // All internal/system fields
      'createdAt',
      'updatedAt',
      '__v',
      '_id',
      'cursor',
      'id_str',
      'nodeId',
      'version',
      'hash',
      'blockHash',
      'blockTimestamp',
      'logIndex',
      'removed',

      // All binary/encoded/URL data
      'snapshotUrl',
      'contentUri',
      'rawUri',
      'optimized',
      'transformedContent',
      'animatedUrl',
      'uri',
      'url',
      'urls',
      'link',
      'links',
      'href',
      'src',
      'thumbnail',
      'preview',
      'fullUrl',
      'originalUrl',
      'smallUrl',
      'mediumUrl',
      'largeUrl',

      // All blockchain technical fields
      'txHash',
      'blockNumber',
      'logIndex',
      'transactionIndex',
      'chainId',
      'contractAddress',
      'gasUsed',
      'gasPrice',
      'effectiveGasPrice',
      'cumulativeGasUsed',

      // All UI/display fields
      'cached',
      'processed',
      'normalized',
      'formatted',
      'rendered',
      'displayUrls',
      'theme',
      'style',
      'css',
      'class',
      'className',
      'color',
      'background',

      // All metadata containers (keep only specific useful fields)
      'rawMetadata',
      'encryptedMetadata',
      'signature',
      'proof',
      'nonce',
      'collectibleMetadata',
      'lensMetadata',
      'internalMetadata',
      'appMetadata',
      'publicationMetadata',
      'profileMetadata',

      // All technical implementation details
      'operations',
      'momoka',
      'dataAvailabilityProofs',
      'dataAvailability',
      'protocol',
      'version',
      'implementation',
      'factory',
      'proxy',

      // All media/file objects
      'media',
      'attachments',
      'asset',
      'assets',
      'cover',
      'image',
      'images',
      'video',
      'videos',
      'audio',
      'files',
      'documents',
      'gallery',

      // All network/infrastructure fields
      'gateway',
      'gateways',
      'ipfsHash',
      'arweaveId',
      'ipfs',
      'arweave',
      'node',
      'nodes',
      'endpoint',
      'endpoints',
      'rpc',
      'ws',

      // All Lens-specific internal fields
      'indexedAt',
      'publishedOn',
      'syncedAt',
      'lastActivityAt',
      'mirrorId',
      'collectNftAddress',
      'collectModule',
      'referenceModule',

      // Additional large nested objects with limited value
      'pageInfo',
      'edges',
      'node',
      'connection',
      'connectionType',
      'permissions',
      'roles',
      'capabilities',
      'features',
      'flags',

      // Remove deeply nested pagination and cursor data
      'hasNext',
      'hasPrev',
      'next',
      'prev',
      'first',
      'last',
      'count',
      'total',

      // Remove technical identifiers that don't add semantic value
      'type',
      'kind',
      '__typename',
      'entityType',
      'objectType',
      'dataType',

      // Remove empty or null containers
      'null',
      'undefined',
      'empty',
      'void',

      // Remove redundant timestamp fields (keep only one if needed)
      'timestamp',
      'createdAt',
      'updatedAt',
      'publishedAt',
      'modifiedAt',
      'editedAt',

      // Remove large stats objects (summarize instead)
      'counters',
      'metrics',
      'analytics',
      'tracking',
      'telemetry',
    ])

    for (const [key, value] of Object.entries(data)) {
      // Skip redundant fields entirely
      if (redundantFields.has(key)) {
        continue
      }

      // Skip null, undefined, or empty values
      if (value === null || value === undefined || value === '') {
        continue
      }

      if (Array.isArray(value)) {
        // Keep ALL array items, but optimize each item's structure aggressively
        const optimizedArray = value.map((item) => this.optimizeItemStructure(item))
        if (optimizedArray.length > 0) {
          optimized[key] = optimizedArray
        }
      } else if (value && typeof value === 'object') {
        // Recursively optimize nested objects
        const optimizedNested = this.deepOptimizeStructure(value, targetTokens)
        // Only include if the optimized object has meaningful content
        if (Object.keys(optimizedNested).length > 0) {
          optimized[key] = optimizedNested
        }
      } else if (typeof value === 'string') {
        // For strings, keep them but remove if they're just IDs or technical identifiers
        if (!key.toLowerCase().includes('id') || key === 'id' || value.length > 10) {
          optimized[key] = value
        }
      } else {
        // Keep primitive values (numbers, booleans) as they're usually meaningful
        optimized[key] = value
      }
    }

    return optimized
  }

  private optimizeItemStructure(item: any): any {
    if (!item || typeof item !== 'object') return item

    // Optimize based on item type
    if (item.__typename === 'Post') {
      return this.optimizePostStructure(item)
    } else if (item.__typename === 'Account') {
      return this.optimizeAccountStructure(item)
    } else {
      // For other types, apply general optimization
      return this.deepOptimizeStructure(item, 0)
    }
  }

  private optimizePostStructure(post: any): any {
    if (!post) return post

    // Ultra-minimal post structure - only absolutely essential semantic data
    const optimized: any = {
      id: post.id,
    }

    // Add author info (minimal)
    if (post.author) {
      optimized.author = {
        address: post.author.address,
        username: post.author.username?.localName,
      }
    }

    // Add content (the most important part)
    if (post.metadata?.content) {
      optimized.content = post.metadata.content
    }

    // Add essential stats (summarized)
    if (post.stats) {
      optimized.stats = {
        reactions: post.stats.reactions,
        mirrors: post.stats.mirrors,
        comments: post.stats.comments,
        quotes: post.stats.quotes,
      }
    }

    // Add post type indicators
    if (post.commentOn?.id) optimized.commentOn = post.commentOn.id
    if (post.quoteOf?.id) optimized.quoteOf = post.quoteOf.id
    if (post.root?.id && post.root.id !== post.id) optimized.root = post.root.id

    // Add post type
    optimized.type = this.getPostType(post)

    return optimized
  }

  private optimizeAccountStructure(account: any): any {
    if (!account) return account

    // Ultra-minimal account structure - only essential identity and stats
    const optimized: any = {
      address: account.address,
    }

    // Add username info
    if (account.username) {
      optimized.username = account.username.localName || account.username
    }

    // Add basic metadata (just name and bio)
    if (account.metadata) {
      const metadata: any = {}
      if (account.metadata.name) metadata.name = account.metadata.name
      if (account.metadata.bio) metadata.bio = account.metadata.bio
      if (Object.keys(metadata).length > 0) optimized.metadata = metadata
    }

    // Add essential stats only
    if (account.stats) {
      optimized.stats = {
        followers: account.stats.followers,
        following: account.stats.following,
        posts: account.stats.posts || account.stats.publications,
      }
    }

    return optimized
  }

  private generateSummary(data: any): string {
    if (data.items && Array.isArray(data.items)) {
      const count = data.items.length
      const hasMore = data.pageInfo?.hasNext || false
      return `📊 Found ${count} items${hasMore ? ' (more available)' : ''}. Use format="detailed" for complete data.`
    }

    if (data.account || data.username || data.address) {
      return `👤 Profile data retrieved. Use format="detailed" for complete information.`
    }

    return `✅ Data retrieved successfully. Use format="detailed" for complete information.`
  }

  // Natural language parameter mapping
  private mapParameters(_toolName: string, args: any): any {
    const mapped = { ...args }

    // Map natural language parameters to technical ones
    if (args.show) mapped.format = args.show
    if (args.who) mapped.address = args.who

    // Handle about parameter for lens_content
    if (args.about) {
      mapped.content_type = args.about
      mapped.about = args.about

      // Map invalid/deprecated types to valid ones
      if (args.about === 'engagement') {
        mapped.content_type = 'reactions'
        mapped.about = 'reactions'
      }
      if (args.about === 'comments') {
        mapped.content_type = 'references'
        mapped.about = 'references'
      }
    }

    // Handle what parameter (natural language descriptions)
    if (args.what && args.what.includes('reactions')) {
      mapped.content_type = 'reactions'
      mapped.about = 'reactions'
    }
    if (args.what && args.what.includes('comments')) {
      mapped.content_type = 'references'
      mapped.about = 'references'
    }
    if (args.what && args.what.includes('posts')) {
      mapped.content_type = 'posts'
      mapped.about = 'posts'
    }

    // Handle include parameter for lens_content (e.g., include: ['comments'])
    if (args.include && args.include.includes('comments')) {
      mapped.content_type = 'references'
      mapped.about = 'references'
    }

    // Handle for parameter for lens_search
    if (args.for && args.for.includes('accounts')) mapped.type = 'accounts'
    if (args.for && args.for.includes('posts')) mapped.type = 'posts'
    if (args.for && args.for.includes('apps')) mapped.type = 'apps'
    if (args.for && args.for.includes('usernames')) mapped.type = 'usernames'

    return mapped
  }

  private async lensSearch(args: LensSearchInput): Promise<CallToolResult> {
    try {
      // Apply parameter mapping
      const mapped = this.mapParameters('lens_search', args)
      const { query, type, show = 'concise', limit = 10, cursor, filters = {} } = mapped

      if (!query || !type) {
        return this.createErrorResponse(
          'lens_search',
          'I need to know what you want to find and what type of content to search for.',
          {
            suggestion: `Try this:
• For accounts: lens_search(query="vitalik", type="accounts")
• For posts: lens_search(query="DeFi trends", type="posts") 
• For apps: lens_search(query="social", type="apps")`,
          }
        )
      }

      const pageSize = Math.min(limit, DEFAULT_LIMITS.maxItems) <= 10 ? PageSize.Ten : PageSize.Fifty
      let result: any
      let summary: string

      // Build pagination options
      const paginationOptions: any = { pageSize }
      if (cursor) {
        paginationOptions.cursor = cursor
      }

      switch (type) {
        case 'accounts': {
          result = await fetchAccounts(this.lensClient, {
            filter: { searchBy: { localNameQuery: query } },
            ...paginationOptions,
          })

          if (result.isErr()) {
            throw new Error(`Account search failed: ${result.error.message}`)
          }

          summary =
            `🔍 Found ${result.value.items.length} accounts matching "${query}":` +
            result.value.items
              .slice(0, 5)
              .map((account: any) => `\\n• ${account.username?.localName || 'Unknown'} (${account.address})`)
              .join('') +
            (result.value.items.length > 5 ? `\\n... and ${result.value.items.length - 5} more` : '')
          break
        }

        case 'posts': {
          result = await fetchPosts(this.lensClient, {
            filter: { searchQuery: query },
            ...paginationOptions,
          })

          if (result.isErr()) {
            throw new Error(`Post search failed: ${result.error.message}`)
          }

          summary =
            `📝 Found ${result.value.items.length} posts matching "${query}":` +
            result.value.items
              .slice(0, 3)
              .map((post: any) => {
                const content =
                  post.metadata?.content ||
                  post.root?.metadata?.content ||
                  post.commentOn?.metadata?.content ||
                  'No content'
                const stats = post.stats || {}
                const timestamp = post.timestamp ? new Date(post.timestamp).toLocaleDateString() : ''
                const postType = this.getPostType(post)
                const emoji = this.getPostTypeEmoji(postType)
                const interactions = []
                if (stats.upvotes > 0) interactions.push(`${stats.upvotes} ❤️`)
                if (stats.comments > 0) interactions.push(`${stats.comments} 💬`)
                if (stats.reposts > 0) interactions.push(`${stats.reposts} 🔄`)
                const statsStr = interactions.length > 0 ? ` (${interactions.join(', ')})` : ''
                const timeStr = timestamp ? ` - ${timestamp}` : ''
                return `\\n• ${emoji} "${content.substring(0, 100)}..." by ${post.author.username?.localName || post.author.address}${statsStr}${timeStr}`
              })
              .join('')
          break
        }

        case 'apps': {
          result = await fetchApps(this.lensClient, paginationOptions)

          if (result.isErr()) {
            throw new Error(`Apps search failed: ${result.error.message}`)
          }

          const filteredApps = result.value.items.filter(
            (app: any) =>
              app.metadata?.name?.toLowerCase().includes(query.toLowerCase()) ||
              app.metadata?.description?.toLowerCase().includes(query.toLowerCase())
          )

          result.value.items = filteredApps
          summary =
            `🚀 Found ${filteredApps.length} apps matching "${query}":` +
            filteredApps
              .slice(0, 5)
              .map(
                (app: any) =>
                  `\\n• ${app.metadata?.name || 'Unknown'} - ${app.metadata?.description?.substring(0, 50) || 'No description'}...`
              )
              .join('')
          break
        }

        case 'groups': {
          result = await fetchGroups(this.lensClient, { pageSize })

          if (result.isErr()) {
            throw new Error(`Groups search failed: ${result.error.message}`)
          }

          const filteredGroups = result.value.items.filter(
            (group: any) =>
              group.metadata?.name?.toLowerCase().includes(query.toLowerCase()) ||
              group.metadata?.description?.toLowerCase().includes(query.toLowerCase())
          )

          result.value.items = filteredGroups
          summary =
            `👥 Found ${filteredGroups.length} groups matching "${query}":` +
            filteredGroups
              .slice(0, 5)
              .map(
                (group: any) =>
                  `\\n• ${group.metadata?.name || 'Unknown'} - ${group.metadata?.description?.substring(0, 50) || 'No description'}...`
              )
              .join('')
          break
        }

        case 'usernames': {
          // Integrate username search functionality from old lens_usernames
          const searchFilter: any = { localNameQuery: query }
          if (filters.namespace) searchFilter.namespace = evmAddress(filters.namespace)

          result = await fetchUsernames(this.lensClient, {
            filter: searchFilter,
            pageSize,
          })

          if (result.isErr()) {
            throw new Error(`Failed to search usernames: ${result.error.message}`)
          }

          summary =
            `🔍 Found ${result.value.items.length} usernames matching "${query}":` +
            result.value.items
              .slice(0, 5)
              .map(
                (username: any) =>
                  `\\n• ${username.localName}${username.namespace ? `@${username.namespace}` : ''} ${username.isAvailable ? '(available)' : '(taken)'}`
              )
              .join('')
          break
        }

        default:
          return this.createErrorResponse(
            'lens_search',
            `I don't know how to search for "${type}". I can search for accounts, posts, usernames, apps, or groups.`,
            {
              suggestion: 'Try: accounts, posts, usernames, apps, or groups',
            }
          )
      }

      // Prepare response data with pagination info
      const responseData = {
        ...result.value,
        pagination: {
          hasNext: result.value.pageInfo?.hasNext || false,
          nextCursor: result.value.pageInfo?.next || null,
          currentPage: result.value.items.length,
          totalShown: result.value.items.length,
        },
      }

      // Add pagination info to summary if there's more data
      if (result.value.pageInfo?.hasNext) {
        summary += `\\n\\n🔄 **More results available** - Use cursor "${result.value.pageInfo.next}" to get next page`
      }

      return this.formatResponse(responseData, show as ResponseFormat, summary)
    } catch (error) {
      return this.createErrorResponse('lens_search', error instanceof Error ? error.message : String(error))
    }
  }

  private async lensProfile(args: LensProfileInput): Promise<CallToolResult> {
    try {
      // Apply parameter mapping
      const mapped = this.mapParameters('lens_profile', args)
      const { who: identifier, include = ['basic'], show = 'concise', depth = 25 } = mapped

      if (!identifier) {
        return this.createErrorResponse('lens_profile', 'I need to know which account to analyze.', {
          suggestion: `Examples:
• Basic profile: lens_profile(who="daoleno")
• Full analysis: lens_profile(who="0x1234...", include=["basic", "social", "influence"])
• Network analysis: lens_profile(who="0x1234...", analyze="network")`,
        })
      }

      const pageSize = Math.min(depth, DEFAULT_LIMITS.maxItems) <= 10 ? PageSize.Ten : PageSize.Fifty

      // Comprehensive profile analysis - supports multiple includes
      const profileData: any = {}
      const summaryParts: string[] = []

      let account: any = null
      let actualAddress: string = identifier

      // If identifier is not a valid EVM address, search for it as username
      if (!this.isValidEvmAddress(identifier)) {
        const searchResult = await fetchAccounts(this.lensClient, {
          filter: { searchBy: { localNameQuery: identifier } },
          pageSize: PageSize.Ten,
        })

        if (searchResult.isErr()) {
          throw new Error(`Failed to search for user: ${searchResult.error.message}`)
        }

        const accounts = searchResult.value.items
        if (accounts.length === 0) {
          throw new Error(`No user found with username "${identifier}"`)
        }

        account = accounts[0] // Take the first match
        actualAddress = account.address
        profileData.account = account
      } else {
        // It's an address, fetch directly
        const accountResult = await fetchAccount(this.lensClient, {
          address: evmAddress(identifier),
        })

        if (accountResult.isErr()) {
          throw new Error(`Failed to fetch account: ${accountResult.error.message}`)
        }

        account = accountResult.value
        if (!account) {
          throw new Error('Account not found')
        }
        profileData.account = account
      }

      // Process each include type
      for (const includeType of include) {
        switch (includeType) {
          case 'basic': {
            summaryParts.push(
              `👤 **Profile**: ${account.username?.localName || 'No username'} (${actualAddress.substring(0, 10)}...)`
            )

            // Fetch account stats separately as Account doesn't have stats property
            const statsResult = await fetchAccountStats(this.lensClient, { account: evmAddress(actualAddress) })
            const stats = statsResult.isErr() ? null : statsResult.value

            summaryParts.push(
              `📊 **Stats**: ${stats?.graphFollowStats?.followers || 0} followers, ${stats?.graphFollowStats?.following || 0} following`
            )
            summaryParts.push(
              `📝 **Bio**: ${account.metadata?.bio?.substring(0, 100) || 'No bio'}${(account.metadata?.bio?.length || 0) > 100 ? '...' : ''}`
            )
            break
          }

          case 'social': {
            const [followersResult, followingResult] = await Promise.all([
              fetchFollowers(this.lensClient, { account: evmAddress(actualAddress), pageSize: PageSize.Ten }),
              fetchFollowing(this.lensClient, { account: evmAddress(actualAddress), pageSize: PageSize.Ten }),
            ])

            if (!followersResult.isErr()) {
              profileData.followers = followersResult.value
              summaryParts.push(
                `👥 **Top Followers**: ${followersResult.value.items
                  .slice(0, 3)
                  .map((f: any) => f.username?.localName || f.address?.substring(0, 8) || 'Unknown')
                  .join(', ')}`
              )
            }

            if (!followingResult.isErr()) {
              profileData.following = followingResult.value
              summaryParts.push(
                `🔗 **Following**: ${followingResult.value.items
                  .slice(0, 3)
                  .map((f: any) => f.username?.localName || f.address?.substring(0, 8) || 'Unknown')
                  .join(', ')}`
              )
            }
            break
          }

          case 'influence': {
            const postsResult = await fetchPosts(this.lensClient, {
              filter: { authors: [evmAddress(actualAddress)] },
              pageSize: PageSize.Ten,
            })

            if (!postsResult.isErr()) {
              profileData.recentPosts = postsResult.value
              const avgReactions =
                postsResult.value.items.reduce((sum: number, post: any) => sum + (post.stats?.reactions || 0), 0) /
                Math.max(postsResult.value.items.length, 1)

              // Fetch stats for influence calculation
              const influenceStatsResult = await fetchAccountStats(this.lensClient, {
                account: evmAddress(actualAddress),
              })
              const followerCount = influenceStatsResult.isErr()
                ? 0
                : influenceStatsResult.value?.graphFollowStats?.followers || 0
              const engagementRate = followerCount > 0 ? (avgReactions / followerCount) * 100 : 0

              summaryParts.push(
                `⭐ **Influence**: ${avgReactions.toFixed(1)} avg reactions, ${engagementRate.toFixed(2)}% engagement rate`
              )
            }
            break
          }

          case 'activity': {
            // Fetch both timeline highlights and user's recent posts
            const [timelineResult, postsResult] = await Promise.all([
              fetchTimelineHighlights(this.lensClient, {
                account: evmAddress(actualAddress),
                pageSize,
                filter: { feeds: [{ globalFeed: true }] },
              }),
              fetchPosts(this.lensClient, {
                filter: { authors: [evmAddress(actualAddress)] },
                pageSize,
              }),
            ])

            if (!timelineResult.isErr()) {
              profileData.timeline = timelineResult.value
              summaryParts.push(`📰 **Timeline Highlights**: ${timelineResult.value.items.length} activities`)
            }

            if (!postsResult.isErr()) {
              profileData.recentPosts = postsResult.value
              const posts = postsResult.value.items
              const avgReactions =
                posts.length > 0
                  ? posts.reduce((sum: number, p: any) => sum + (p.stats?.reactions || 0), 0) / posts.length
                  : 0

              summaryParts.push(`📝 **Recent Posts**: ${posts.length} posts, avg ${avgReactions.toFixed(1)} reactions`)

              // Add preview of top posts
              if (posts.length > 0) {
                const topPosts = posts
                  .slice(0, 2)
                  .map((post: any, i: number) => {
                    const content = post.metadata?.content || post.root?.metadata?.content || 'No content'
                    const timestamp = post.timestamp ? ` - ${new Date(post.timestamp).toLocaleDateString()}` : ''
                    const emoji = this.getPostTypeEmoji(this.getPostType(post))
                    return `  ${i + 1}. ${emoji} "${content.substring(0, 60)}..." (${post.stats?.upvotes || 0} ❤️, ${post.stats?.comments || 0} 💬)${timestamp}`
                  })
                  .join('\n')
                summaryParts.push(`**Top Posts**:\n${topPosts}`)
              }
            }
            break
          }

          case 'network': {
            const [followersResult, followingResult] = await Promise.all([
              fetchFollowers(this.lensClient, { account: evmAddress(actualAddress), pageSize }),
              fetchFollowing(this.lensClient, { account: evmAddress(actualAddress), pageSize }),
            ])

            if (!followersResult.isErr() && !followingResult.isErr()) {
              const followerCount = followersResult.value.items.length
              const followingCount = followingResult.value.items.length
              const networkRatio = followingCount > 0 ? followerCount / followingCount : followerCount

              profileData.networkMetrics = {
                followers: followerCount,
                following: followingCount,
                ratio: networkRatio,
              }

              summaryParts.push(
                `🌐 **Network**: ${networkRatio.toFixed(2)} ratio (${networkRatio > 2 ? 'High influence' : networkRatio > 0.5 ? 'Balanced' : 'Building network'})`
              )
            }
            break
          }
        }
      }

      const summary = summaryParts.join('\\n')

      return this.formatResponse(profileData, show as ResponseFormat, summary)
    } catch (error) {
      return this.createErrorResponse('lens_profile', error instanceof Error ? error.message : String(error))
    }
  }

  private async lensContent(args: LensContentInput): Promise<CallToolResult> {
    try {
      // Apply parameter mapping
      const mapped = this.mapParameters('lens_content', args)
      const { content_type, about, target, show = 'concise', limit = 10, cursor, filters = {} } = mapped
      const finalContentType = content_type || about

      if (!finalContentType || !target) {
        return this.createErrorResponse('lens_content', 'Missing required parameters: about and target', {
          suggestion:
            'Examples:\\n• For post reactions: lens_content(about="reactions", target="post_123")\\n• For user posts: lens_content(about="posts", target="0x1234...")\\n• For user posts by username: lens_content(about="posts", target="daoleno")',
        })
      }

      // Determine target type and resolve if needed
      let actualTarget = target
      let isPostTarget = false

      // Check if target looks like a post ID (typically long numeric string)
      if (/^\d{60,}$/.test(target) || target.startsWith('post_')) {
        isPostTarget = true
        actualTarget = target
      } else {
        // For user-related queries, resolve username to address if needed
        if (['posts', 'highlights'].includes(finalContentType) && !this.isValidEvmAddress(target)) {
          const searchResult = await fetchAccounts(this.lensClient, {
            filter: { searchBy: { localNameQuery: target } },
            pageSize: PageSize.Ten,
          })

          if (searchResult.isOk() && searchResult.value.items.length > 0) {
            actualTarget = searchResult.value.items[0].address
          } else {
            throw new Error(`Username "${target}" not found`)
          }
        }
      }

      const pageSize = Math.min(limit, DEFAULT_LIMITS.maxItems) <= 10 ? PageSize.Ten : PageSize.Fifty
      let result: any
      let summary: string

      // Build pagination options
      const paginationOptions: any = { pageSize }
      if (cursor) {
        paginationOptions.cursor = cursor
      }

      switch (finalContentType) {
        case 'posts': {
          if (filters.author) {
            result = await fetchPosts(this.lensClient, {
              filter: { authors: [evmAddress(filters.author)] },
              ...paginationOptions,
            })
          } else {
            result = await fetchPosts(this.lensClient, {
              filter: { authors: [evmAddress(actualTarget)] },
              ...paginationOptions,
            })
          }

          if (result.isErr()) {
            throw new Error(`Failed to fetch posts: ${result.error.message}`)
          }

          const displayName = this.isValidEvmAddress(target) ? `${target.substring(0, 10)}...` : target

          summary =
            `📝 ${result.value.items.length} posts from ${displayName}:` +
            result.value.items
              .slice(0, 5)
              .map((post: any) => {
                const content = post.metadata?.content || post.root?.metadata?.content || 'No content'
                const timestamp = post.timestamp ? ` - ${new Date(post.timestamp).toLocaleDateString()}` : ''
                return `\\n• "${content.substring(0, 100)}..." (${post.stats?.upvotes || 0} ❤️, ${post.stats?.comments || 0} 💬, ${post.stats?.reposts || 0} 🔄)${timestamp}`
              })
              .join('')
          break
        }

        case 'reactions': {
          // Reactions require a post ID, not a user address
          if (!isPostTarget) {
            return this.createErrorResponse('lens_content', 'Reactions analysis requires a post ID as target', {
              suggestion: `For reactions analysis, provide a post ID like "post_123456" or a numeric post ID.\\nFor user-related analysis, try:\\n• lens_content(about="posts", target="${target}")\\n• lens_content(about="highlights", target="${target}")`,
            })
          }

          const reactionFilters: any = {}
          if (filters.reaction_types) {
            reactionFilters.anyOf = filters.reaction_types.map((type: string) => {
              switch (type.toUpperCase()) {
                case 'UPVOTE':
                  return PostReactionType.Upvote
                case 'DOWNVOTE':
                  return PostReactionType.Downvote
                default:
                  throw new Error(`Invalid reaction type: ${type}`)
              }
            })
          }

          result = await fetchPostReactions(this.lensClient, {
            post: postId(actualTarget),
            ...paginationOptions,
            ...(Object.keys(reactionFilters).length > 0 && { filter: reactionFilters }),
          })

          if (result.isErr()) {
            throw new Error(`Failed to fetch reactions: ${result.error.message}`)
          }

          summary =
            `👍 ${result.value.items.length} reactions to post ${target.substring(0, 15)}...:` +
            result.value.items
              .slice(0, 10)
              .map(
                (reaction: any) =>
                  `\\n• ${reaction.reactionType} by ${reaction.account.username?.localName || reaction.account.address.substring(0, 10)}`
              )
              .join('')
          break
        }

        case 'references': {
          const referenceTypes = (filters.reference_types || ['COMMENT_ON']).map((type: string) => {
            switch (type.toUpperCase()) {
              case 'COMMENT_ON':
                return PostReferenceType.CommentOn
              case 'QUOTE_OF':
                return PostReferenceType.QuoteOf
              case 'REPOST_OF':
                return PostReferenceType.RepostOf
              default:
                throw new Error(`Invalid reference type: ${type}`)
            }
          })

          result = await fetchPostReferences(this.lensClient, {
            referencedPost: postId(target),
            referenceTypes,
            pageSize,
          })

          if (result.isErr()) {
            throw new Error(`Failed to fetch references: ${result.error.message}`)
          }

          summary =
            `💬 ${result.value.items.length} references to post ${target.substring(0, 15)}...:` +
            result.value.items
              .slice(0, 5)
              .map((ref: any) => {
                const content = ref.metadata?.content || ref.root?.metadata?.content || 'No content'
                const refType =
                  ref.__typename === 'Post'
                    ? ref.commentOn
                      ? 'Comment'
                      : ref.quoteOf
                        ? 'Quote'
                        : 'Post'
                    : ref.referenceType
                return `\\n• ${refType} by ${ref.author.username?.localName || ref.author.address.substring(0, 10)}: "${content.substring(0, 80)}..."`
              })
              .join('')
          break
        }

        case 'highlights': {
          result = await fetchTimelineHighlights(this.lensClient, {
            account: evmAddress(target),
            pageSize,
            filter: { feeds: [{ globalFeed: true }] },
          })

          if (result.isErr()) {
            throw new Error(`Failed to fetch highlights: ${result.error.message}`)
          }

          summary =
            `⭐ ${result.value.items.length} timeline highlights for ${target.substring(0, 10)}...:` +
            result.value.items
              .slice(0, 5)
              .map((post: any) => {
                const content = post.metadata?.content || post.root?.metadata?.content || 'No content'
                return `\\n• "${content.substring(0, 80)}..." (${post.stats?.upvotes || 0} ❤️, ${post.stats?.comments || 0} 💬)`
              })
              .join('')
          break
        }

        default:
          return this.createErrorResponse('lens_content', `Invalid content_type: ${finalContentType}`, {
            suggestion: 'Use one of: posts, reactions, references, highlights',
          })
      }

      return this.formatResponse(result.value, show as ResponseFormat, summary)
    } catch (error) {
      return this.createErrorResponse('lens_content', error instanceof Error ? error.message : String(error))
    }
  }

  private async lensEcosystem(args: LensEcosystemInput): Promise<CallToolResult> {
    try {
      // Apply parameter mapping
      const mapped = this.mapParameters('lens_ecosystem', args)
      const { view, show = 'concise', limit = 20 } = mapped

      if (!view) {
        return this.createErrorResponse(
          'lens_ecosystem',
          'I need to know what aspect of the ecosystem you want to explore.',
          {
            suggestion: `Examples:
• Popular apps: lens_ecosystem(view="apps")
• Trending content: lens_ecosystem(view="trending")
• Platform statistics: lens_ecosystem(view="statistics")
• Community groups: lens_ecosystem(view="groups")`,
          }
        )
      }

      const pageSize = Math.min(limit, DEFAULT_LIMITS.maxItems) <= 10 ? PageSize.Ten : PageSize.Fifty
      let result: any
      let summary: string

      switch (view) {
        case 'apps': {
          result = await fetchApps(this.lensClient, { pageSize })

          if (result.isErr()) {
            throw new Error(`Failed to fetch apps: ${result.error.message}`)
          }

          summary =
            `🚀 ${result.value.items.length} applications in the Lens Protocol ecosystem:` +
            result.value.items
              .slice(0, 10)
              .map(
                (app: any) =>
                  `\\n• ${app.metadata?.name || 'Unknown'}: ${app.metadata?.description?.substring(0, 60) || 'No description'}...`
              )
              .join('')
          break
        }

        case 'groups': {
          result = await fetchGroups(this.lensClient, { pageSize })

          if (result.isErr()) {
            throw new Error(`Failed to fetch groups: ${result.error.message}`)
          }

          summary =
            `👥 ${result.value.items.length} community groups on Lens Protocol:` +
            result.value.items
              .slice(0, 10)
              .map(
                (group: any) =>
                  `\\n• ${group.metadata?.name || 'Unknown'}: ${group.metadata?.description?.substring(0, 60) || 'No description'}...`
              )
              .join('')
          break
        }

        case 'trending': {
          // Use fetchPostsToExplore for trending content
          result = await fetchPostsToExplore(this.lensClient, { pageSize })

          if (result.isErr()) {
            throw new Error(`Failed to fetch trending content: ${result.error.message}`)
          }

          summary =
            `📈 ${result.value.items.length} trending posts on Lens Protocol:` +
            result.value.items
              .slice(0, 5)
              .map((post: any) => {
                const content = post.metadata?.content || post.root?.metadata?.content || 'No content'
                return `\\n• "${content.substring(0, 80)}..." by ${post.author.username?.localName || post.author.address.substring(0, 8)} (${post.stats?.upvotes || 0} ❤️, ${post.stats?.comments || 0} 💬, ${post.stats?.reposts || 0} 🔄)`
              })
              .join('')
          break
        }

        case 'statistics': {
          // Combine multiple data sources for ecosystem statistics
          const [appsResult, groupsResult, postsResult] = await Promise.all([
            fetchApps(this.lensClient, { pageSize: PageSize.Ten }),
            fetchGroups(this.lensClient, { pageSize: PageSize.Ten }),
            fetchPostsToExplore(this.lensClient, { pageSize: PageSize.Ten }),
          ])

          result = {
            apps: appsResult.isErr() ? [] : appsResult.value.items,
            groups: groupsResult.isErr() ? [] : groupsResult.value.items,
            posts: postsResult.isErr() ? [] : postsResult.value.items,
          }

          summary =
            `📊 Lens Protocol Ecosystem Statistics:` +
            `\\n🚀 Active Applications: ${result.apps.length}+` +
            `\\n👥 Community Groups: ${result.groups.length}+` +
            `\\n📝 Recent Posts: ${result.posts.length}+ trending` +
            `\\n💡 Platform Health: ${result.apps.length + result.groups.length + result.posts.length > 20 ? 'Very Active' : 'Active'}`
          break
        }

        case 'insights': {
          // Provide ecosystem insights and analysis
          const appsResult = await fetchApps(this.lensClient, { pageSize })

          if (appsResult.isErr()) {
            throw new Error(`Failed to fetch ecosystem data: ${appsResult.error.message}`)
          }

          result = appsResult.value
          const appTypes = result.items.reduce((acc: any, app: any) => {
            const category = app.metadata?.category || 'Other'
            acc[category] = (acc[category] || 0) + 1
            return acc
          }, {})

          summary =
            `🔍 Lens Protocol Ecosystem Insights:` +
            `\\n📊 Total Applications: ${result.items.length}` +
            `\\n🏷️ Categories: ${Object.keys(appTypes).join(', ')}` +
            `\\n⭐ Most Active Category: ${Object.entries(appTypes).sort(([, a]: any, [, b]: any) => b - a)[0]?.[0] || 'Social'}` +
            `\\n🎯 Growth Areas: Community tools, DeFi integration, Content creation`
          break
        }

        default:
          return this.createErrorResponse(
            'lens_ecosystem',
            `I don't understand "${view}". I can show you apps, groups, trending content, statistics, or insights.`,
            {
              suggestion: 'Try: apps, groups, trending, statistics, or insights',
            }
          )
      }

      return this.formatResponse(result, show as ResponseFormat, summary)
    } catch (error) {
      return this.createErrorResponse('lens_ecosystem', error instanceof Error ? error.message : String(error))
    }
  }

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
                name: 'lens_search',
                description:
                  'When you need to find or discover anything on Lens Protocol - accounts, posts, usernames, apps, or groups. Perfect for exploring and discovering content based on queries, names, or topics.',
                inputSchema: zodToJsonSchema(LensSearchSchema),
              },
              {
                name: 'lens_profile',
                description:
                  'When you want to learn everything about a Lens Protocol account - their identity, social connections, influence, and activity. Perfect for understanding who someone is, their network, and their impact on the platform.',
                inputSchema: zodToJsonSchema(LensProfileSchema),
              },
              {
                name: 'lens_content',
                description:
                  'When you want to understand how content performs and what people think about it. Perfect for analyzing post engagement, reading reactions and comments, or measuring content success and social sentiment.',
                inputSchema: zodToJsonSchema(LensContentSchema),
              },
              {
                name: 'lens_ecosystem',
                description:
                  "When you want to explore the broader Lens Protocol ecosystem - trending content, popular applications, platform statistics, and community insights. Perfect for understanding what's happening across the platform and discovering ecosystem opportunities.",
                inputSchema: zodToJsonSchema(LensEcosystemSchema),
              },
            ],
          },
        }
      }

      if (request.method === 'tools/call') {
        const toolName = request.params.name
        const args = request.params.arguments || {}

        try {
          // Validate input using Zod schemas
          let validatedArgs: any
          let result: any
          switch (toolName) {
            case 'lens_search':
              validatedArgs = LensSearchSchema.parse(args)
              result = await this.lensSearch(validatedArgs)
              break
            case 'lens_profile':
              validatedArgs = LensProfileSchema.parse(args)
              result = await this.lensProfile(validatedArgs)
              break
            case 'lens_content':
              validatedArgs = LensContentSchema.parse(args)
              result = await this.lensContent(validatedArgs)
              break
            case 'lens_ecosystem':
              validatedArgs = LensEcosystemSchema.parse(args)
              result = await this.lensEcosystem(validatedArgs)
              break
            default:
              throw new Error(`Unknown tool: ${toolName}`)
          }

          return {
            jsonrpc: '2.0',
            id: request.id,
            result,
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            const errorMessages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
            const errorResult = this.createErrorResponse(toolName, `Invalid input: ${errorMessages}`, {
              suggestion: 'Check the tool parameters and ensure all required fields are provided with correct types.',
            })
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: errorResult,
            }
          }
          throw error
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

if (import.meta.main) {
  const server = new LensMCPServer()
  server.run().catch((error) => {
    console.error('Server error:', error)
    process.exit(1)
  })
}
