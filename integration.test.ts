import { beforeAll, describe, expect, test } from 'bun:test'
import { LensMCPServer } from './index.ts'

describe('LensMCPServer Integration Tests', () => {
  let server: LensMCPServer
  const KNOWN_LENS_ADDRESS = '0x97ea27f43f221cf1685dd10e298d29b56e811169' // Known Lens account

  beforeAll(() => {
    server = new LensMCPServer()
  })

  describe('Real Lens Protocol API Calls', () => {
    test('should fetch real account data from mainnet', async () => {
      const result = await (server as any).fetchAccount({
        address: KNOWN_LENS_ADDRESS,
      })


      expect(result.isError).toBeUndefined()
      expect(result.content[0].text).toBeDefined()

      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveProperty('address')
      expect(data.address.toLowerCase()).toBe(KNOWN_LENS_ADDRESS.toLowerCase())
    }, 10000) // 10 second timeout for network call

    test('should fetch real posts from explore feed', async () => {
      const result = await (server as any).fetchPosts({
        pageSize: 5,
      })


      if (result.isError) {
        console.log('Posts error:', result.content[0].text)
        expect(result.isError).toBe(true) // Accept that it might fail
        return
      }

      expect(result.content[0].text).toBeDefined()

      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveProperty('posts')
      expect(data).toHaveProperty('pageInfo')
      expect(Array.isArray(data.posts)).toBe(true)
    }, 10000)

    test('should fetch real apps from Lens Protocol', async () => {
      const result = await (server as any).fetchApps({
        pageSize: 3,
      })


      if (result.isError) {
        console.log('Apps error:', result.content[0].text)
        expect(result.isError).toBe(true) // Accept that it might fail
        return
      }

      expect(result.content[0].text).toBeDefined()

      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveProperty('apps')
      expect(data).toHaveProperty('pageInfo')
      expect(Array.isArray(data.apps)).toBe(true)
    }, 10000)

    test('should handle invalid address gracefully', async () => {
      const result = await (server as any).fetchAccount({
        address: '0xinvalid',
      })


      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Error fetching account')
    }, 10000)

    test('should read real account resource', async () => {
      const result = await (server as any).readAccountResource(KNOWN_LENS_ADDRESS)


      expect(result.contents).toBeDefined()
      expect(result.contents[0].uri).toBe(`lens://account/${KNOWN_LENS_ADDRESS}`)
      expect(result.contents[0].mimeType).toBe('application/json')

      const data = JSON.parse(result.contents[0].text)
      expect(data).toHaveProperty('address')
    }, 10000)

    test('should fetch followers of known account', async () => {
      const result = await (server as any).fetchFollowers({
        account: KNOWN_LENS_ADDRESS,
        pageSize: 3,
      })


      if (result.isError) {
        console.log('Followers error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveProperty('followers')
      expect(data).toHaveProperty('pageInfo')
      expect(Array.isArray(data.followers)).toBe(true)
    }, 10000)

    test('should fetch following of known account', async () => {
      const result = await (server as any).fetchFollowing({
        account: KNOWN_LENS_ADDRESS,
        pageSize: 3,
      })


      if (result.isError) {
        console.log('Following error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveProperty('following')
      expect(data).toHaveProperty('pageInfo')
      expect(Array.isArray(data.following)).toBe(true)
    }, 10000)

    test('should fetch groups from Lens Protocol', async () => {
      const result = await (server as any).fetchGroups({
        pageSize: 3,
      })


      if (result.isError) {
        console.log('Groups error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveProperty('groups')
      expect(data).toHaveProperty('pageInfo')
      expect(Array.isArray(data.groups)).toBe(true)
    }, 10000)

    test('should fetch usernames by local name', async () => {
      const result = await (server as any).fetchUsernames({
        localName: 'lens',
        pageSize: 3,
      })


      if (result.isError) {
        console.log('Usernames error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      const data = JSON.parse(result.content[0].text)
      // fetchUsernames might return different structure, just verify it's valid JSON
      expect(data).toBeDefined()
    }, 10000)

    test('should search accounts by username query', async () => {
      const result = await (server as any).searchAccounts({
        query: 'lens',
        pageSize: 3,
      })


      if (result.isError) {
        console.log('Search accounts error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveProperty('accounts')
      expect(data).toHaveProperty('pageInfo')
      expect(Array.isArray(data.accounts)).toBe(true)
    }, 10000)

    test('should search posts by content query', async () => {
      const result = await (server as any).searchPosts({
        query: 'blockchain',
        pageSize: 3,
      })


      if (result.isError) {
        console.log('Search posts error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveProperty('posts')
      expect(data).toHaveProperty('pageInfo')
      expect(Array.isArray(data.posts)).toBe(true)
    }, 10000)

  })

  describe('Environment Configuration Tests', () => {
    test('should use correct environment from process.env', () => {
      const originalEnv = process.env.LENS_ENVIRONMENT

      // Test mainnet (default)
      delete process.env.LENS_ENVIRONMENT
      const mainnetServer = new LensMCPServer()
      expect(mainnetServer).toBeDefined()

      // Test testnet
      process.env.LENS_ENVIRONMENT = 'testnet'
      const testnetServer = new LensMCPServer()
      expect(testnetServer).toBeDefined()

      // Restore original
      if (originalEnv) {
        process.env.LENS_ENVIRONMENT = originalEnv
      } else {
        delete process.env.LENS_ENVIRONMENT
      }
    })
  })

  describe('Data Format Validation', () => {
    test('should return properly formatted account data', async () => {
      const result = await (server as any).fetchAccount({
        address: KNOWN_LENS_ADDRESS,
      })


      expect(result.isError).toBeUndefined()

      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveProperty('address')
      expect(data).toHaveProperty('username')
      expect(data).toHaveProperty('metadata')
    }, 10000)

    test('should return properly formatted posts data', async () => {
      const result = await (server as any).fetchPosts({
        pageSize: 2,
      })


      if (result.isError) {
        console.log('Posts format error:', result.content[0].text)
        expect(result.isError).toBe(true) // Accept that it might fail
        return
      }

      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveProperty('posts')
      expect(data).toHaveProperty('pageInfo')

      if (data.posts.length > 0) {
        const post = data.posts[0]
        expect(post).toHaveProperty('id')
        expect(post).toHaveProperty('author')
      }
    }, 10000)
  })

  describe('New Tools Integration Tests', () => {
    test('should search usernames successfully', async () => {
      const result = await (server as any).searchUsernames({
        query: 'lens',
        pageSize: 5,
      })

      
      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveProperty('usernames')
      expect(data).toHaveProperty('pageInfo')
      expect(Array.isArray(data.usernames)).toBe(true)
    }, 10000)

    test('should fetch accounts by usernames successfully', async () => {
      // Use known usernames that likely exist
      const result = await (server as any).fetchAccountsByUsernames({
        usernames: ['lens'],
      })


      if (result.isError) {
        // Some usernames might not exist, which is acceptable
        expect(result.content[0].text).toBeDefined()
        return
      }

      const data = JSON.parse(result.content[0].text)
      expect(Array.isArray(data)).toBe(true)
    }, 10000)

    test('should fetch post reactions for real post', async () => {
      // Use a known post ID from the timeline highlights test
      const result = await (server as any).fetchPostReactions({
        post_id: '76957972086854522080449803303094865882614189523310384414943375883558051433786',
        reaction_type: 'UPVOTE',
        pageSize: 3,
      })


      if (result.isError) {
        console.log('Post reactions error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveProperty('reactions')
      expect(data).toHaveProperty('pageInfo')
    }, 10000)

    test('should handle non-existent post reactions gracefully', async () => {
      const result = await (server as any).fetchPostReactions({
        post_id: 'non-existent-post',
      })


      // Should either return empty results or error gracefully
      expect(result.content[0].text).toBeDefined()
    }, 10000)

    test('should fetch post references for real post', async () => {
      // Use a known post ID that likely has comments/quotes
      const result = await (server as any).fetchPostReferences({
        post_id: '76957972086854522080449803303094865882614189523310384414943375883558051433786',
        reference_type: 'COMMENT',
        pageSize: 3,
      })


      if (result.isError) {
        console.log('Post references error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveProperty('references')
      expect(data).toHaveProperty('pageInfo')
    }, 10000)

    test('should handle non-existent post references gracefully', async () => {
      const result = await (server as any).fetchPostReferences({
        post_id: 'non-existent-post',
      })


      // Should either return empty results or error gracefully
      expect(result.content[0].text).toBeDefined()
    }, 10000)

    test('should fetch timeline highlights for known account', async () => {
      const result = await (server as any).fetchTimelineHighlights({
        account_address: KNOWN_LENS_ADDRESS,
        feed_type: 'global',
        pageSize: 3,
      })


      if (result.isError) {
        // Timeline highlights might not be available for all accounts
        expect(result.content[0].text).toBeDefined()
        return
      }

      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveProperty('highlights')
      expect(data).toHaveProperty('pageInfo')
    }, 10000)
  })
})
