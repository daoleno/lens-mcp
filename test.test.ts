import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { mainnet, PageSize, PostReactionType, PostReferenceType, testnet } from '@lens-protocol/client'

// Mock the lens client and actions
const mockLensClient = {
  environment: mainnet,
}

const mockPublicClientCreate = mock(() => mockLensClient)
const mockEvmAddress = mock((addr: string) => addr)
const mockPostId = mock((id: string) => id)

// Mock successful responses
const mockSuccessResponse = {
  isErr: () => false,
  value: {
    items: [
      {
        address: '0x1234567890123456789012345678901234567890',
        username: { localName: 'test' },
        metadata: { content: 'Test content', bio: 'Test bio' },
        stats: { reactions: 10, followers: 100, following: 50 },
      },
    ],
    pageInfo: { hasNext: false },
  },
}

const mockAccountResponse = {
  isErr: () => false,
  value: {
    address: '0x1234567890123456789012345678901234567890',
    username: { localName: 'test' },
    metadata: { bio: 'Test bio', attributes: [] },
    stats: { followers: 100, following: 50 },
  },
}

const mockFetchAccount = mock(() => mockAccountResponse)
const mockFetchAccounts = mock(() => mockSuccessResponse)
const mockFetchPosts = mock(() => mockSuccessResponse)
const mockFetchPostsToExplore = mock(() => mockSuccessResponse)
const mockFetchFollowers = mock(() => mockSuccessResponse)
const mockFetchFollowing = mock(() => mockSuccessResponse)
const mockFetchApps = mock(() => mockSuccessResponse)
const mockFetchGroups = mock(() => mockSuccessResponse)
const mockFetchUsernames = mock(() => mockSuccessResponse)
const mockFetchUsername = mock(() => ({
  isErr: () => false,
  value: { localName: 'test', namespace: null, isAvailable: false },
}))
const mockFetchPost = mock(() => mockAccountResponse)
const mockFetchApp = mock(() => mockAccountResponse)
const mockFetchGroup = mock(() => mockAccountResponse)
const mockFetchAccountsBulk = mock(() => ({
  isErr: () => false,
  value: [mockAccountResponse.value],
}))
const mockFetchPostReactions = mock(() => mockSuccessResponse)
const mockFetchPostReferences = mock(() => mockSuccessResponse)
const mockFetchTimelineHighlights = mock(() => mockSuccessResponse)
const mockFetchAccountStats = mock(() => ({
  isErr: () => false,
  value: {
    __typename: 'AccountStats',
    feedStats: {
      __typename: 'AccountFeedsStats',
      posts: 10,
      comments: 5,
      reposts: 3,
      quotes: 2,
      reacted: 15,
      reactions: 20,
      collects: 8,
      tips: 2,
    },
    graphFollowStats: {
      __typename: 'GraphFollowStats',
      followers: 100,
      following: 50,
    },
  },
}))

// Mock modules
mock.module('@lens-protocol/client', () => ({
  PublicClient: {
    create: mockPublicClientCreate,
  },
  evmAddress: mockEvmAddress,
  postId: mockPostId,
  mainnet,
  testnet,
  PageSize,
  PostReactionType,
  PostReferenceType,
}))

mock.module('@lens-protocol/client/actions', () => ({
  fetchAccount: mockFetchAccount,
  fetchAccounts: mockFetchAccounts,
  fetchAccountStats: mockFetchAccountStats,
  fetchPosts: mockFetchPosts,
  fetchPostsToExplore: mockFetchPostsToExplore,
  fetchFollowers: mockFetchFollowers,
  fetchFollowing: mockFetchFollowing,
  fetchApps: mockFetchApps,
  fetchGroups: mockFetchGroups,
  fetchUsernames: mockFetchUsernames,
  fetchUsername: mockFetchUsername,
  fetchPost: mockFetchPost,
  fetchApp: mockFetchApp,
  fetchGroup: mockFetchGroup,
  fetchAccountsBulk: mockFetchAccountsBulk,
  fetchPostReactions: mockFetchPostReactions,
  fetchPostReferences: mockFetchPostReferences,
  fetchTimelineHighlights: mockFetchTimelineHighlights,
}))

// Import after mocking
import { LensMCPServer } from './index.ts'

describe('LensMCPServer', () => {
  let server: LensMCPServer


  beforeEach(() => {
    // Clear all mocks and reset to original implementations
    mockPublicClientCreate.mockClear()
    mockEvmAddress.mockClear()
    mockPostId.mockClear()
    
    // Reset all fetch mocks to their original implementations
    mockFetchAccount.mockClear().mockImplementation(() => mockAccountResponse)
    mockFetchAccounts.mockClear().mockImplementation(() => mockSuccessResponse)
    mockFetchPosts.mockClear().mockImplementation(() => mockSuccessResponse)
    mockFetchPostsToExplore.mockClear().mockImplementation(() => mockSuccessResponse)
    mockFetchFollowers.mockClear().mockImplementation(() => mockSuccessResponse)
    mockFetchFollowing.mockClear().mockImplementation(() => mockSuccessResponse)
    mockFetchApps.mockClear().mockImplementation(() => mockSuccessResponse)
    mockFetchGroups.mockClear().mockImplementation(() => mockSuccessResponse)
    mockFetchUsernames.mockClear().mockImplementation(() => mockSuccessResponse)
    mockFetchUsername.mockClear().mockImplementation(() => ({
      isErr: () => false,
      value: { localName: 'test', namespace: null, isAvailable: false }
    }))
    mockFetchPost.mockClear().mockImplementation(() => mockAccountResponse)
    mockFetchApp.mockClear().mockImplementation(() => mockAccountResponse)
    mockFetchGroup.mockClear().mockImplementation(() => mockAccountResponse)
    mockFetchAccountsBulk.mockClear().mockImplementation(() => ({
      isErr: () => false,
      value: [mockAccountResponse.value]
    }))
    mockFetchPostReactions.mockClear().mockImplementation(() => mockSuccessResponse)
    mockFetchPostReferences.mockClear().mockImplementation(() => mockSuccessResponse)
    mockFetchTimelineHighlights.mockClear().mockImplementation(() => mockSuccessResponse)
    mockFetchAccountStats.mockClear().mockImplementation(() => ({
      isErr: () => false,
      value: {
        __typename: 'AccountStats',
        feedStats: {
          __typename: 'AccountFeedsStats',
          posts: 10,
          comments: 5,
          reposts: 3,
          quotes: 2,
          reacted: 15,
          reactions: 20,
          collects: 8,
          tips: 2
        },
        graphFollowStats: {
          __typename: 'GraphFollowStats',
          followers: 100,
          following: 50
        }
      }
    }))

    server = new LensMCPServer()
  })

  describe('lens_search - Unified Discovery', () => {
    test('should search accounts with natural language response', async () => {
      const result = await (server as any).lensSearch({
        query: 'test',
        type: 'accounts',
        show: 'concise',
        limit: 5,
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('🔍 Found')
      expect(result.content[0].text).toContain('accounts matching "test"')
      expect(mockFetchAccounts).toHaveBeenCalled()
    })

    test('should search posts with contextual summaries', async () => {
      const mockPostSearchResult = {
        isErr: () => false,
        value: {
          items: [
            {
              metadata: { content: 'This is a test blockchain post', bio: 'Test bio' },
              author: { username: { localName: 'testuser' }, address: '0x123' },
              stats: { reactions: 5, followers: 100, following: 50 },
              address: '0x123',
              username: { localName: 'testuser' },
            },
          ],
          pageInfo: { hasNext: false },
        },
      }
      mockFetchPosts.mockReturnValueOnce(mockPostSearchResult)

      const result = await (server as any).lensSearch({
        query: 'blockchain',
        type: 'posts',
        show: 'concise',
        limit: 3,
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('📝 Found')
      expect(result.content[0].text).toContain('posts matching "blockchain"')
      expect(mockFetchPosts).toHaveBeenCalled()
    })

    test('should search usernames with namespace support', async () => {
      // Add specific mock for username search
      mockFetchUsernames.mockReturnValueOnce({
        isErr: () => false,
        value: {
          items: [
            {
              address: '0x123',
              username: { localName: 'test' },
              metadata: { content: 'Test content', bio: 'Test bio' },
              stats: { reactions: 10, followers: 100, following: 50 },
            },
          ],
          pageInfo: { hasNext: false },
        },
      })

      const result = await (server as any).lensSearch({
        query: 'test',
        type: 'usernames',
        show: 'concise',
        filters: { namespace: '0x123' },
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('🔍 Found')
      expect(result.content[0].text).toContain('usernames matching "test"')
      expect(mockFetchUsernames).toHaveBeenCalled()
    })

    test('should search apps and groups', async () => {
      const result = await (server as any).lensSearch({
        query: 'social',
        type: 'apps',
        show: 'concise',
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('🚀')
      expect(mockFetchApps).toHaveBeenCalled()
    })

    test('should return actionable error for missing parameters', async () => {
      const result = await (server as any).lensSearch({
        query: 'test',
        // Missing required 'type' parameter
      })

      expect(result.isError).toBeTruthy()
      expect(result.content[0].text).toContain('I need to know what you want to find')
      expect(result.content[0].text).toContain('lens_search(query=')
    })
  })

  describe('lens_profile - Comprehensive Profile Analysis', () => {
    test('should fetch basic profile with natural language parameters', async () => {
      const result = await (server as any).lensProfile({
        who: '0x1234567890123456789012345678901234567890',
        include: ['basic'],
        show: 'concise',
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('👤 **Profile**:')
      expect(result.content[0].text).toContain('📊 **Stats**:')
      expect(mockFetchAccount).toHaveBeenCalled()
    })

    test('should handle social analysis integration', async () => {
      const result = await (server as any).lensProfile({
        who: '0x1234567890123456789012345678901234567890',
        include: ['basic', 'social'],
        analyze: 'network',
        show: 'detailed',
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toBeDefined()
      expect(mockFetchAccount).toHaveBeenCalled()
    })

    test('should provide helpful error for missing who parameter', async () => {
      const result = await (server as any).lensProfile({
        include: ['basic'],
      })

      expect(result.isError).toBeTruthy()
      expect(result.content[0].text).toContain('I need to know which account to analyze')
      expect(result.content[0].text).toContain('lens_profile(who=')
    })

    test('should include posts in activity analysis', async () => {
      const result = await (server as any).lensProfile({
        who: '0x1234567890123456789012345678901234567890',
        include: ['basic', 'activity'],
        show: 'concise',
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('📝 **Recent Posts**:')
      expect(result.content[0].text).toContain('📰 **Timeline Highlights**:')
      expect(mockFetchPosts).toHaveBeenCalled()
      expect(mockFetchTimelineHighlights).toHaveBeenCalled()
    })
  })

  describe('lens_content - Content Engagement Analysis', () => {
    test('should analyze post reactions with engagement insights', async () => {
      const mockReactionResult = {
        isErr: () => false,
        value: {
          items: [
            {
              reactionType: 'UPVOTE',
              account: { username: { localName: 'user1' }, address: '0x123' },
              address: '0x123',
              username: { localName: 'user1' },
              metadata: { content: 'Test reaction', bio: 'Test bio' },
              stats: { reactions: 5, followers: 10, following: 5 },
            },
          ],
          pageInfo: { hasNext: false },
        },
      }
      mockFetchPostReactions.mockReturnValueOnce(mockReactionResult)

      const result = await (server as any).lensContent({
        what: 'reactions to this post',
        about: 'reactions',
        target: 'post_123',
        show: 'concise',
        limit: 10,
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('👍')
      expect(result.content[0].text).toContain('reactions to post')
      expect(mockFetchPostReactions).toHaveBeenCalled()
    })

    test('should fetch post references with context', async () => {
      const mockReferenceResult = {
        isErr: () => false,
        value: {
          items: [
            {
              referenceType: 'COMMENT_ON',
              author: { username: { localName: 'commenter' }, address: '0x456' },
              metadata: { content: 'Test comment', bio: 'Test bio' },
              address: '0x456',
              username: { localName: 'commenter' },
              stats: { reactions: 2, followers: 20, following: 10 },
            },
          ],
          pageInfo: { hasNext: false },
        },
      }
      mockFetchPostReferences.mockReturnValueOnce(mockReferenceResult)

      const result = await (server as any).lensContent({
        about: 'comments',
        target: 'post_123',
        show: 'concise',
        include: ['comments'],
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('💬')
      expect(result.content[0].text).toContain('references to post')
      expect(mockFetchPostReferences).toHaveBeenCalled()
    })
  })

  describe('lens_ecosystem - Ecosystem Exploration', () => {
    test('should explore apps with ecosystem insights', async () => {
      const result = await (server as any).lensEcosystem({
        view: 'apps',
        show: 'concise',
        limit: 10,
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('🚀')
      expect(result.content[0].text).toContain('applications in the Lens Protocol ecosystem')
      expect(mockFetchApps).toHaveBeenCalled()
    })

    test('should show trending content', async () => {
      const result = await (server as any).lensEcosystem({
        view: 'trending',
        timeframe: '7d',
        show: 'concise',
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('📈')
      expect(result.content[0].text).toContain('trending posts')
      expect(mockFetchPostsToExplore).toHaveBeenCalled()
    })

    test('should provide ecosystem statistics', async () => {
      const result = await (server as any).lensEcosystem({
        view: 'statistics',
        show: 'detailed',
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('📊 Lens Protocol Ecosystem Statistics')
      expect(result.content[0].text).toContain('Active Applications:')
      expect(mockFetchApps).toHaveBeenCalled()
      expect(mockFetchGroups).toHaveBeenCalled()
    })

    test('should provide ecosystem insights', async () => {
      const result = await (server as any).lensEcosystem({
        view: 'insights',
        show: 'detailed',
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('🔍 Lens Protocol Ecosystem Insights')
      expect(result.content[0].text).toContain('Growth Areas:')
      expect(mockFetchApps).toHaveBeenCalled()
    })
  })

  describe('Natural Language Parameter Mapping', () => {
    test('should map natural language parameters correctly', async () => {
      const result = await (server as any).lensSearch({
        query: 'test',
        type: 'accounts',
        show: 'concise', // Should map to format: 'concise'
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toBeDefined()
    })

    test('should map "who" to address parameter', async () => {
      const result = await (server as any).lensProfile({
        who: '0x1234567890123456789012345678901234567890', // Valid EVM address
        include: ['basic'],
      })

      expect(result.isError).toBeFalsy()
      expect(mockFetchAccount).toHaveBeenCalled()
    })

    test('should treat invalid addresses as usernames', async () => {
      const result = await (server as any).lensProfile({
        who: '0x123', // Invalid address - too short, should be treated as username
        include: ['basic'],
      })

      // Either should succeed (if username search works) or fail with appropriate error
      if (result.isError) {
        // Should be a username search error, not address validation error
        expect(result.content[0].text).not.toContain('EvmAddress: invalid length')
        expect(mockFetchAccounts).toHaveBeenCalled() // Should have tried username search
      } else {
        expect(result.isError).toBeFalsy()
        expect(mockFetchAccounts).toHaveBeenCalled()
      }
    })
  })

  describe('Response Formats', () => {
    test('should return concise format with natural language', async () => {
      const result = await (server as any).lensEcosystem({
        view: 'apps',
        show: 'concise',
      })

      expect(result.content[0].text).toContain('🚀')
      expect(result.content[0].text).not.toContain('{')
    })

    test('should return raw format as JSON', async () => {
      const result = await (server as any).lensEcosystem({
        view: 'apps',
        show: 'raw',
      })

      expect(result.content[0].text).toMatch(/^\s*{/)
    })

    test('should return detailed format with summary + JSON', async () => {
      const result = await (server as any).lensEcosystem({
        view: 'apps',
        show: 'detailed',
      })

      expect(result.content[0].text).toContain('🚀')
      expect(result.content[0].text).toContain('{')
    })
  })

  describe('Enhanced Error Handling', () => {
    test('should provide actionable error messages with examples', async () => {
      const result = await (server as any).lensContent({
        about: 'posts',
        // Missing required 'target' parameter
      })

      expect(result.isError).toBeTruthy()
      expect(result.content[0].text).toContain('❌')
      expect(result.content[0].text).toContain('Examples:')
    })

    test('should handle invalid enum values gracefully', async () => {
      const result = await (server as any).lensSearch({
        query: 'test',
        type: 'invalid_type',
        show: 'concise',
      })

      expect(result.isError).toBeTruthy()
      expect(result.content[0].text).toContain("I don't know how to search for")
    })

    test('should provide context-aware suggestions', async () => {
      const result = await (server as any).lensEcosystem({
        view: 'unknown_view',
      })

      expect(result.isError).toBeTruthy()
      expect(result.content[0].text).toContain("I don't understand")
      expect(result.content[0].text).toContain('Try:')
    })
  })

  describe('Context Efficiency', () => {
    test('should respect token limits', async () => {
      const result = await (server as any).lensEcosystem({
        view: 'apps',
        show: 'raw',
      })

      // Response should be reasonable length (under 25k tokens ≈ 100k chars)
      expect(result.content[0].text.length).toBeLessThan(100000)
    })

    test('should respect item limits', async () => {
      const result = await (server as any).lensSearch({
        query: 'test',
        type: 'accounts',
        limit: 5,
      })

      expect(mockFetchAccounts).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pageSize: PageSize.Ten,
        })
      )
    })
  })
})
