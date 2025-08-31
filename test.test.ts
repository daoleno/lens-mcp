import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { mainnet, PageSize, testnet } from '@lens-protocol/client'

// Mock the lens client and actions
const mockLensClient = {
  environment: mainnet,
}

const mockPublicClientCreate = mock(() => mockLensClient)
const mockEvmAddress = mock((addr: string) => addr)
const mockPostId = mock((id: string) => id)

const mockFetchAccount = mock()
const mockFetchPosts = mock()
const mockFetchPostsToExplore = mock()
const mockFetchFollowers = mock()
const mockFetchFollowing = mock()
const mockFetchApps = mock()
const mockFetchGroups = mock()
const mockFetchUsername = mock()
const mockFetchPost = mock()
const mockFetchApp = mock()
const mockFetchGroup = mock()

// Mock modules
mock.module('@lens-protocol/client', () => ({
  PublicClient: {
    create: mockPublicClientCreate,
  },
  mainnet,
  testnet,
  evmAddress: mockEvmAddress,
  postId: mockPostId,
}))

mock.module('@lens-protocol/client/actions', () => ({
  fetchAccount: mockFetchAccount,
  fetchPosts: mockFetchPosts,
  fetchPostsToExplore: mockFetchPostsToExplore,
  fetchFollowers: mockFetchFollowers,
  fetchFollowing: mockFetchFollowing,
  fetchApps: mockFetchApps,
  fetchGroups: mockFetchGroups,
  fetchUsername: mockFetchUsername,
  fetchPost: mockFetchPost,
  fetchApp: mockFetchApp,
  fetchGroup: mockFetchGroup,
}))

// Import after mocking
import { LensMCPServer } from './index.ts'

describe('LensMCPServer', () => {
  let server: LensMCPServer

  beforeEach(() => {
    // Reset mocks
    mockPublicClientCreate.mockClear()
    mockEvmAddress.mockClear()
    mockPostId.mockClear()
    mockFetchAccount.mockClear()
    mockFetchPosts.mockClear()
    mockFetchPostsToExplore.mockClear()
    mockFetchFollowers.mockClear()
    mockFetchFollowing.mockClear()
    mockFetchApps.mockClear()
    mockFetchGroups.mockClear()
    mockFetchUsername.mockClear()
    mockFetchPost.mockClear()
    mockFetchApp.mockClear()
    mockFetchGroup.mockClear()

    server = new LensMCPServer()
  })

  describe('Initialization', () => {
    test('should create server with correct name and version', () => {
      expect(server).toBeDefined()
      expect(mockPublicClientCreate).toHaveBeenCalledWith({
        environment: mainnet,
      })
    })

    test('should use testnet when environment variable is set', () => {
      const originalEnv = process.env.LENS_ENVIRONMENT
      process.env.LENS_ENVIRONMENT = 'testnet'

      new LensMCPServer()

      expect(mockPublicClientCreate).toHaveBeenCalledWith({
        environment: testnet,
      })

      process.env.LENS_ENVIRONMENT = originalEnv
    })
  })

  describe('Tool Handlers - Direct Method Testing', () => {
    const mockSuccessResult = {
      isErr: () => false,
      value: { mockData: 'test' },
    }

    const mockErrorResult = {
      isErr: () => true,
      error: { message: 'Test error' },
    }

    test('fetchAccount should return success result', async () => {
      mockFetchAccount.mockResolvedValue(mockSuccessResult)
      mockEvmAddress.mockReturnValue('0x123')

      const result = await (server as any).fetchAccount({ address: '0x123' })

      expect(result.content[0].text).toContain('mockData')
      expect(result.isError).toBeUndefined()
      expect(mockFetchAccount).toHaveBeenCalledWith(mockLensClient, {
        address: '0x123',
      })
    })

    test('fetchAccount should handle errors', async () => {
      mockFetchAccount.mockResolvedValue(mockErrorResult)
      mockEvmAddress.mockReturnValue('0x123')

      const result = await (server as any).fetchAccount({ address: '0x123' })

      expect(result.content[0].text).toContain('Test error')
      expect(result.isError).toBe(true)
    })

    test('fetchAccount should require address parameter', async () => {
      const result = await (server as any).fetchAccount({})

      expect(result.content[0].text).toContain('Address is required')
      expect(result.isError).toBe(true)
    })

    test('fetchPosts should work with author filter', async () => {
      mockFetchPosts.mockResolvedValue({
        isErr: () => false,
        value: { items: [], pageInfo: {} },
      })
      mockEvmAddress.mockReturnValue('0x123')

      const result = await (server as any).fetchPosts({
        author: '0x123',
        pageSize: 5,
      })

      expect(mockFetchPosts).toHaveBeenCalledWith(mockLensClient, {
        filter: { authors: ['0x123'] },
        pageSize: PageSize.Ten,
      })
      expect(result.isError).toBeUndefined()
    })

    test('fetchPosts should use explore when no author', async () => {
      mockFetchPostsToExplore.mockResolvedValue({
        isErr: () => false,
        value: { items: [], pageInfo: {} },
      })

      const result = await (server as any).fetchPosts({ pageSize: 20 })

      expect(mockFetchPostsToExplore).toHaveBeenCalledWith(mockLensClient, {
        pageSize: PageSize.Fifty,
      })
      expect(result.isError).toBeUndefined()
    })

    test('fetchFollowers should require account parameter', async () => {
      const result = await (server as any).fetchFollowers({})

      expect(result.content[0].text).toContain('Account address is required')
      expect(result.isError).toBe(true)
    })

    test('fetchFollowing should require account parameter', async () => {
      const result = await (server as any).fetchFollowing({})

      expect(result.content[0].text).toContain('Account address is required')
      expect(result.isError).toBe(true)
    })

    test('searchAccounts should return unsupported message', async () => {
      const result = await (server as any).searchAccounts({ query: 'test' })

      expect(result.content[0].text).toContain('not supported in public client')
    })

    test('searchPosts should return unsupported message', async () => {
      const result = await (server as any).searchPosts({ query: 'test' })

      expect(result.content[0].text).toContain('returning explore posts instead')
    })

    test('fetchApps should work correctly', async () => {
      mockFetchApps.mockResolvedValue({
        isErr: () => false,
        value: { items: [], pageInfo: {} },
      })

      const result = await (server as any).fetchApps({ pageSize: 10 })

      expect(mockFetchApps).toHaveBeenCalledWith(mockLensClient, {
        pageSize: PageSize.Ten,
      })
      expect(result.isError).toBeUndefined()
    })

    test('fetchGroups should work correctly', async () => {
      mockFetchGroups.mockResolvedValue({
        isErr: () => false,
        value: { items: [], pageInfo: {} },
      })

      const result = await (server as any).fetchGroups({ pageSize: 10 })

      expect(mockFetchGroups).toHaveBeenCalledWith(mockLensClient, {
        pageSize: PageSize.Ten,
      })
      expect(result.isError).toBeUndefined()
    })

    test('fetchUsernames should require localName parameter', async () => {
      const result = await (server as any).fetchUsernames({})

      expect(result.content[0].text).toContain('Local name is required')
      expect(result.isError).toBe(true)
    })

    test('fetchUsernames should work with valid localName', async () => {
      mockFetchUsername.mockResolvedValue({
        isErr: () => false,
        value: { username: 'test.lens' },
      })

      const result = await (server as any).fetchUsernames({
        localName: 'test',
      })

      expect(mockFetchUsername).toHaveBeenCalledWith(mockLensClient, {
        username: { localName: 'test' },
      })
      expect(result.isError).toBeUndefined()
    })
  })

  describe('Resource Methods - Direct Testing', () => {
    test('readAccountResource should work correctly', async () => {
      mockFetchAccount.mockResolvedValue({
        isErr: () => false,
        value: { id: 'test-account' },
      })
      mockEvmAddress.mockReturnValue('0x123')

      const result = await (server as any).readAccountResource('0x123')

      expect(result.contents[0].uri).toBe('lens://account/0x123')
      expect(result.contents[0].mimeType).toBe('application/json')
      expect(result.contents[0].text).toContain('test-account')
    })

    test('readPostResource should work correctly', async () => {
      mockFetchPost.mockResolvedValue({
        isErr: () => false,
        value: { id: 'test-post' },
      })
      mockPostId.mockReturnValue('post-123')

      const result = await (server as any).readPostResource('post-123')

      expect(result.contents[0].uri).toBe('lens://post/post-123')
      expect(result.contents[0].text).toContain('test-post')
    })

    test('readAppResource should work correctly', async () => {
      mockFetchApp.mockResolvedValue({
        isErr: () => false,
        value: { id: 'test-app' },
      })
      mockEvmAddress.mockReturnValue('0x123')

      const result = await (server as any).readAppResource('0x123')

      expect(result.contents[0].uri).toBe('lens://app/0x123')
      expect(result.contents[0].text).toContain('test-app')
    })

    test('readGroupResource should work correctly', async () => {
      mockFetchGroup.mockResolvedValue({
        isErr: () => false,
        value: { id: 'test-group' },
      })
      mockEvmAddress.mockReturnValue('0x123')

      const result = await (server as any).readGroupResource('0x123')

      expect(result.contents[0].uri).toBe('lens://group/0x123')
      expect(result.contents[0].text).toContain('test-group')
    })
  })

  describe('Error Handling', () => {
    test('should handle lens client errors gracefully in fetchAccount', async () => {
      mockFetchAccount.mockRejectedValue(new Error('Network error'))
      mockEvmAddress.mockReturnValue('0x123')

      const result = await (server as any).fetchAccount({ address: '0x123' })

      expect(result.content[0].text).toContain('Network error')
      expect(result.isError).toBe(true)
    })

    test('should handle lens errors in readAccountResource', async () => {
      mockFetchAccount.mockResolvedValue({
        isErr: () => true,
        error: { message: 'Account not found' },
      })
      mockEvmAddress.mockReturnValue('0x123')

      await expect((server as any).readAccountResource('0x123')).rejects.toThrow('Account not found')
    })
  })

  describe('Validation', () => {
    test('should validate required parameters correctly', async () => {
      // Test various required parameter validations
      const accountResult = await (server as any).fetchAccount({})
      expect(accountResult.isError).toBe(true)

      const followersResult = await (server as any).fetchFollowers({})
      expect(followersResult.isError).toBe(true)

      const followingResult = await (server as any).fetchFollowing({})
      expect(followingResult.isError).toBe(true)

      const usernamesResult = await (server as any).fetchUsernames({})
      expect(usernamesResult.isError).toBe(true)

      const searchAccountsResult = await (server as any).searchAccounts({})
      expect(searchAccountsResult.isError).toBe(true)

      const searchPostsResult = await (server as any).searchPosts({})
      expect(searchPostsResult.isError).toBe(true)
    })

    test('should handle optional parameters with defaults', async () => {
      mockFetchPostsToExplore.mockResolvedValue({
        isErr: () => false,
        value: { items: [], pageInfo: {} },
      })

      // Test with no pageSize specified (should default to 10)
      const result = await (server as any).fetchPosts({})

      expect(mockFetchPostsToExplore).toHaveBeenCalledWith(mockLensClient, {
        pageSize: PageSize.Ten,
      })
    })
  })
})
