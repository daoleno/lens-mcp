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

type ResponseFormat = 'concise' | 'detailed' | 'raw'

const DEFAULT_LIMITS = {
  maxTokens: 25000,
  maxItems: 50,
}

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
            inputSchema: {
              type: 'object',
              properties: {
                for: {
                  type: 'string',
                  description:
                    'What you want to find (natural language): "crypto accounts", "DeFi posts", "lens usernames", "popular apps"',
                },
                query: {
                  type: 'string',
                  description: 'Search terms or keywords',
                },
                type: {
                  type: 'string',
                  enum: ['accounts', 'posts', 'usernames', 'apps', 'groups'],
                  description: 'Type of content to search for',
                },
                show: {
                  type: 'string',
                  enum: ['concise', 'detailed', 'raw'],
                  default: 'concise',
                  description: 'How much detail to include',
                },
                limit: {
                  type: 'number',
                  default: 10,
                  maximum: 50,
                  description: 'Maximum results to return',
                },
                filters: {
                  type: 'object',
                  properties: {
                    namespace: {
                      type: 'string',
                      description: 'Username namespace to filter by',
                    },
                  },
                },
              },
              required: ['query', 'type'],
            },
          },
          {
            name: 'lens_profile',
            description:
              'When you want to learn everything about a Lens Protocol account - their identity, social connections, influence, and activity. Perfect for understanding who someone is, their network, and their impact on the platform.',
            inputSchema: {
              type: 'object',
              properties: {
                who: {
                  type: 'string',
                  description: 'Ethereum address or username of the account to analyze',
                },
                include: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['basic', 'social', 'influence', 'activity', 'network'],
                  },
                  default: ['basic'],
                  description:
                    'What information to include: basic info, social connections, influence metrics, recent activity, or network analysis',
                },
                analyze: {
                  type: 'string',
                  enum: ['overview', 'influence', 'engagement', 'network'],
                  description: 'Type of analysis to perform on the profile',
                },
                show: {
                  type: 'string',
                  enum: ['concise', 'detailed', 'raw'],
                  default: 'concise',
                  description: 'Level of detail in response',
                },
                depth: {
                  type: 'number',
                  default: 25,
                  maximum: 100,
                  description: 'How many social connections or posts to analyze',
                },
              },
              required: ['who'],
            },
          },
          {
            name: 'lens_content',
            description:
              'When you want to understand how content performs and what people think about it. Perfect for analyzing post engagement, reading reactions and comments, or measuring content success and social sentiment.',
            inputSchema: {
              type: 'object',
              properties: {
                what: {
                  type: 'string',
                  description:
                    'What you want to analyze (natural language): "reactions to this post", "comments on post", "popular posts by user", "trending content"',
                },
                about: {
                  type: 'string',
                  enum: ['posts', 'reactions', 'comments', 'engagement', 'highlights'],
                  description: 'Type of content analysis to perform',
                },
                target: {
                  type: 'string',
                  description: 'Post ID (like "post_123") for post analysis, or user address for user content',
                },
                show: {
                  type: 'string',
                  enum: ['concise', 'detailed', 'raw'],
                  default: 'concise',
                  description: 'How detailed the analysis should be',
                },
                include: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['likes', 'dislikes', 'comments', 'quotes', 'reposts', 'metrics'],
                  },
                  description: 'What types of engagement to include',
                },
                limit: {
                  type: 'number',
                  default: 10,
                  maximum: 50,
                  description: 'Maximum items to analyze',
                },
                filters: {
                  type: 'object',
                  properties: {
                    author: {
                      type: 'string',
                      description: 'Filter content by specific author',
                    },
                    timeframe: {
                      type: 'string',
                      enum: ['1d', '7d', '30d', 'all'],
                      description: 'Time period for analysis',
                    },
                  },
                },
              },
              required: ['about', 'target'],
            },
          },
          {
            name: 'lens_ecosystem',
            description:
              "When you want to explore the broader Lens Protocol ecosystem - trending content, popular applications, platform statistics, and community insights. Perfect for understanding what's happening across the platform and discovering ecosystem opportunities.",
            inputSchema: {
              type: 'object',
              properties: {
                explore: {
                  type: 'string',
                  description:
                    'What aspect of the ecosystem to explore (natural language): "trending apps", "platform statistics", "popular groups", "ecosystem health"',
                },
                view: {
                  type: 'string',
                  enum: ['trending', 'apps', 'groups', 'statistics', 'insights'],
                  description: 'Type of ecosystem view to show',
                },
                focus: {
                  type: 'string',
                  description: 'Specific app, group, or area to focus on (address or name)',
                },
                show: {
                  type: 'string',
                  enum: ['concise', 'detailed', 'raw'],
                  default: 'concise',
                  description: 'Level of detail to provide',
                },
                timeframe: {
                  type: 'string',
                  enum: ['1d', '7d', '30d', 'all'],
                  default: '7d',
                  description: 'Time period for trending analysis',
                },
                limit: {
                  type: 'number',
                  default: 20,
                  maximum: 50,
                  description: 'Maximum items to return',
                },
              },
              required: ['view'],
            },
          },
        ],
      }
    })

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        switch (name) {
          case 'lens_search':
            return await this.lensSearch(args)
          case 'lens_profile':
            return await this.lensProfile(args)
          case 'lens_content':
            return await this.lensContent(args)
          case 'lens_ecosystem':
            return await this.lensEcosystem(args)
          default:
            return this.createErrorResponse(name, `Unknown tool: ${name}`, {
              suggestion: 'Available tools: lens_search, lens_profile, lens_content, lens_ecosystem',
            })
        }
      } catch (error) {
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
    let errorText = `❌ Error in ${toolName}: ${message}`

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

  private truncateForTokenLimit(text: string, maxTokens: number = DEFAULT_LIMITS.maxTokens): string {
    const maxChars = maxTokens * 4
    if (text.length <= maxChars) return text

    return text.substring(0, maxChars - 100) + '\\n\\n... [Response truncated to stay within token limit]'
  }

  private formatResponse(data: any, format: ResponseFormat, summary?: string): CallToolResult {
    let content: string

    switch (format) {
      case 'concise':
        content = summary || this.generateSummary(data)
        break
      case 'detailed':
        content = (summary || this.generateSummary(data)) + '\\n\\n' + JSON.stringify(data, null, 2)
        break
      case 'raw':
        content = JSON.stringify(data, null, 2)
        break
    }

    return {
      content: [
        {
          type: 'text',
          text: this.truncateForTokenLimit(content),
        },
      ],
    }
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

  private async lensSearch(args: any): Promise<CallToolResult> {
    try {
      // Apply parameter mapping
      const mapped = this.mapParameters('lens_search', args)
      const { query, type, show = 'concise', limit = 10, filters = {} } = mapped

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

      switch (type) {
        case 'accounts': {
          result = await fetchAccounts(this.lensClient, {
            filter: { searchBy: { localNameQuery: query } },
            pageSize,
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
            pageSize,
          })

          if (result.isErr()) {
            throw new Error(`Post search failed: ${result.error.message}`)
          }

          summary =
            `📝 Found ${result.value.items.length} posts matching "${query}":` +
            result.value.items
              .slice(0, 3)
              .map(
                (post: any) =>
                  `\\n• "${post.metadata?.content?.substring(0, 100) || 'No content'}..." by ${post.author.username?.localName || post.author.address}`
              )
              .join('')
          break
        }

        case 'apps': {
          result = await fetchApps(this.lensClient, { pageSize })

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

      return this.formatResponse(result.value, show as ResponseFormat, summary)
    } catch (error) {
      return this.createErrorResponse('lens_search', error instanceof Error ? error.message : String(error))
    }
  }

  private async lensProfile(args: any): Promise<CallToolResult> {
    try {
      // Apply parameter mapping
      const mapped = this.mapParameters('lens_profile', args)
      const { who: address, include = ['basic'], show = 'concise', depth = 25 } = mapped

      if (!address) {
        return this.createErrorResponse('lens_profile', 'I need to know which account to analyze.', {
          suggestion: `Examples:
• Basic profile: lens_profile(who="0x1234...")
• Full analysis: lens_profile(who="0x1234...", include=["basic", "social", "influence"])
• Network analysis: lens_profile(who="0x1234...", analyze="network")`,
        })
      }

      const pageSize = Math.min(depth, DEFAULT_LIMITS.maxItems) <= 10 ? PageSize.Ten : PageSize.Fifty

      // Comprehensive profile analysis - supports multiple includes
      const profileData: any = {}
      const summaryParts: string[] = []

      // Always fetch basic account info first
      const accountResult = await fetchAccount(this.lensClient, {
        address: evmAddress(address),
      })

      if (accountResult.isErr()) {
        throw new Error(`Failed to fetch account: ${accountResult.error.message}`)
      }

      const account = accountResult.value

      if (!account) {
        throw new Error('Account not found')
      }

      profileData.account = account

      // Process each include type
      for (const includeType of include) {
        switch (includeType) {
          case 'basic': {
            summaryParts.push(
              `👤 **Profile**: ${account.username?.localName || 'No username'} (${address.substring(0, 10)}...)`
            )

            // Fetch account stats separately as Account doesn't have stats property
            const statsResult = await fetchAccountStats(this.lensClient, { account: evmAddress(address) })
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
              fetchFollowers(this.lensClient, { account: evmAddress(address), pageSize: PageSize.Ten }),
              fetchFollowing(this.lensClient, { account: evmAddress(address), pageSize: PageSize.Ten }),
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
              filter: { authors: [evmAddress(address)] },
              pageSize: PageSize.Ten,
            })

            if (!postsResult.isErr()) {
              profileData.recentPosts = postsResult.value
              const avgReactions =
                postsResult.value.items.reduce((sum: number, post: any) => sum + (post.stats?.reactions || 0), 0) /
                Math.max(postsResult.value.items.length, 1)

              // Fetch stats for influence calculation
              const influenceStatsResult = await fetchAccountStats(this.lensClient, { account: evmAddress(address) })
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
                account: evmAddress(address),
                pageSize,
                filter: { feeds: [{ globalFeed: true }] },
              }),
              fetchPosts(this.lensClient, {
                filter: { authors: [evmAddress(address)] },
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
                  .map(
                    (post: any, i: number) =>
                      `  ${i + 1}. "${post.metadata?.content?.substring(0, 60) || 'No content'}..." (${post.stats?.reactions || 0} ❤️)`
                  )
                  .join('\n')
                summaryParts.push(`**Top Posts**:\n${topPosts}`)
              }
            }
            break
          }

          case 'network': {
            const [followersResult, followingResult] = await Promise.all([
              fetchFollowers(this.lensClient, { account: evmAddress(address), pageSize }),
              fetchFollowing(this.lensClient, { account: evmAddress(address), pageSize }),
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

  private async lensContent(args: any): Promise<CallToolResult> {
    try {
      // Apply parameter mapping
      const mapped = this.mapParameters('lens_content', args)
      const { content_type, about, target, show = 'concise', limit = 10, filters = {} } = mapped
      const finalContentType = content_type || about

      if (!finalContentType || !target) {
        return this.createErrorResponse('lens_content', 'Missing required parameters: about and target', {
          suggestion:
            'Examples:\\n• For post reactions: lens_content(about="reactions", target="post_123")\\n• For user posts: lens_content(about="posts", target="0x1234...")',
        })
      }

      const pageSize = Math.min(limit, DEFAULT_LIMITS.maxItems) <= 10 ? PageSize.Ten : PageSize.Fifty
      let result: any
      let summary: string

      switch (finalContentType) {
        case 'posts': {
          if (filters.author) {
            result = await fetchPosts(this.lensClient, {
              filter: { authors: [evmAddress(filters.author)] },
              pageSize,
            })
          } else {
            result = await fetchPosts(this.lensClient, {
              filter: { authors: [evmAddress(target)] },
              pageSize,
            })
          }

          if (result.isErr()) {
            throw new Error(`Failed to fetch posts: ${result.error.message}`)
          }

          summary =
            `📝 ${result.value.items.length} posts from ${target.substring(0, 10)}...:` +
            result.value.items
              .slice(0, 5)
              .map(
                (post: any) =>
                  `\\n• "${post.metadata?.content?.substring(0, 100) || 'No content'}..." (${post.stats?.reactions || 0} reactions)`
              )
              .join('')
          break
        }

        case 'reactions': {
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
            post: postId(target),
            pageSize,
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
              .map(
                (ref: any) =>
                  `\\n• ${ref.referenceType} by ${ref.author.username?.localName || ref.author.address.substring(0, 10)}: "${ref.metadata?.content?.substring(0, 80) || 'No content'}..."`
              )
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
              .map(
                (post: any) =>
                  `\\n• "${post.metadata?.content?.substring(0, 80) || 'No content'}..." (${post.stats?.reactions || 0} reactions)`
              )
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

  private async lensEcosystem(args: any): Promise<CallToolResult> {
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
              .map(
                (post: any) =>
                  `\\n• "${post.metadata?.content?.substring(0, 80) || 'No content'}..." by ${post.author.username?.localName || post.author.address.substring(0, 8)} (${post.stats?.reactions || 0} reactions)`
              )
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
                inputSchema: {
                  type: 'object',
                  properties: {
                    query: {
                      type: 'string',
                      description: 'Search terms or keywords',
                    },
                    type: {
                      type: 'string',
                      enum: ['accounts', 'posts', 'usernames', 'apps', 'groups'],
                      description: 'Type of content to search for',
                    },
                    show: {
                      type: 'string',
                      enum: ['concise', 'detailed', 'raw'],
                      default: 'concise',
                      description: 'How much detail to include',
                    },
                    limit: {
                      type: 'number',
                      default: 10,
                      maximum: 50,
                      description: 'Maximum results to return',
                    },
                  },
                  required: ['query', 'type'],
                },
              },
              {
                name: 'lens_profile',
                description:
                  'When you want to learn everything about a Lens Protocol account - their identity, social connections, influence, and activity. Perfect for understanding who someone is, their network, and their impact on the platform.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    who: {
                      type: 'string',
                      description: 'Ethereum address or username of the account to analyze',
                    },
                    include: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: ['basic', 'social', 'influence', 'activity', 'network'],
                      },
                      default: ['basic'],
                      description:
                        'What information to include: basic info, social connections, influence metrics, recent activity, or network analysis',
                    },
                    show: {
                      type: 'string',
                      enum: ['concise', 'detailed', 'raw'],
                      default: 'concise',
                      description: 'Level of detail in response',
                    },
                  },
                  required: ['who'],
                },
              },
              {
                name: 'lens_content',
                description:
                  'When you want to understand how content performs and what people think about it. Perfect for analyzing post engagement, reading reactions and comments, or measuring content success and social sentiment.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    about: {
                      type: 'string',
                      enum: ['posts', 'reactions', 'comments', 'engagement', 'highlights'],
                      description: 'Type of content analysis to perform',
                    },
                    target: {
                      type: 'string',
                      description: 'Post ID or user address for analysis',
                    },
                    show: {
                      type: 'string',
                      enum: ['concise', 'detailed', 'raw'],
                      default: 'concise',
                      description: 'How detailed the analysis should be',
                    },
                  },
                  required: ['about', 'target'],
                },
              },
              {
                name: 'lens_ecosystem',
                description:
                  "When you want to explore the broader Lens Protocol ecosystem - trending content, popular applications, platform statistics, and community insights. Perfect for understanding what's happening across the platform and discovering ecosystem opportunities.",
                inputSchema: {
                  type: 'object',
                  properties: {
                    view: {
                      type: 'string',
                      enum: ['trending', 'apps', 'groups', 'statistics', 'insights'],
                      description: 'Type of ecosystem view to show',
                    },
                    show: {
                      type: 'string',
                      enum: ['concise', 'detailed', 'raw'],
                      default: 'concise',
                      description: 'Level of detail to provide',
                    },
                  },
                  required: ['view'],
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
          case 'lens_search':
            result = await this.lensSearch(args)
            break
          case 'lens_profile':
            result = await this.lensProfile(args)
            break
          case 'lens_content':
            result = await this.lensContent(args)
            break
          case 'lens_ecosystem':
            result = await this.lensEcosystem(args)
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

if (import.meta.main) {
  const server = new LensMCPServer()
  server.run().catch((error) => {
    console.error('Server error:', error)
    process.exit(1)
  })
}
