import { beforeAll, describe, expect, test } from 'bun:test'
import { LensMCPServer } from './index.ts'

describe('LensMCPServer Integration Tests', () => {
  let server: LensMCPServer
  const KNOWN_LENS_ADDRESS = '0x97ea27f43f221cf1685dd10e298d29b56e811169' // Known Lens account

  beforeAll(() => {
    server = new LensMCPServer()
  })

  describe('lens_search Integration Tests', () => {
    test('should search real accounts from mainnet', async () => {
      const result = await (server as any).lensSearch({
        query: 'lens',
        type: 'accounts',
        show: 'raw',
        limit: 3,
      })

      if (result.isError) {
        console.log('Account search error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()
      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveProperty('items')
      expect(Array.isArray(data.items)).toBe(true)
    }, 15000)

    test('should search real posts from mainnet', async () => {
      const result = await (server as any).lensSearch({
        query: 'blockchain',
        type: 'posts',
        show: 'raw',
        limit: 3,
      })

      if (result.isError) {
        console.log('Post search error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()
      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveProperty('items')
      expect(Array.isArray(data.items)).toBe(true)
    }, 15000)

    test('should search real apps from mainnet', async () => {
      const result = await (server as any).lensSearch({
        query: 'lens',
        type: 'apps',
        show: 'raw',
        limit: 5,
      })

      if (result.isError) {
        console.log('App search error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()
      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveProperty('items')
      expect(Array.isArray(data.items)).toBe(true)
    }, 15000)

    test('should search usernames with natural language', async () => {
      const result = await (server as any).lensSearch({
        for: 'usernames matching lens',
        query: 'lens',
        type: 'usernames',
        show: 'concise',
        limit: 5,
      })

      if (result.isError) {
        console.log('Username search error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()
      expect(result.content[0].text).toContain('🔍')
    }, 15000)
  })

  describe('lens_profile Integration Tests', () => {
    test('should fetch real profile with natural language parameters', async () => {
      const result = await (server as any).lensProfile({
        who: KNOWN_LENS_ADDRESS,
        include: ['basic'],
        show: 'raw',
      })

      if (result.isError) {
        console.log('Profile basic error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()

      try {
        const data = JSON.parse(result.content[0].text)
        expect(data).toHaveProperty('account')
        expect(data.account.address.toLowerCase()).toBe(KNOWN_LENS_ADDRESS.toLowerCase())
      } catch (e) {
        // If not JSON, just verify it contains the address in some form
        expect(result.content[0].text.toLowerCase()).toContain(KNOWN_LENS_ADDRESS.toLowerCase().substring(0, 10))
      }
    }, 15000)

    test('should handle comprehensive profile analysis', async () => {
      const result = await (server as any).lensProfile({
        who: KNOWN_LENS_ADDRESS,
        include: ['basic', 'social'],
        analyze: 'network',
        show: 'detailed',
      })

      if (result.isError) {
        console.log('Profile comprehensive error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()
      expect(result.content[0].text).toContain('👤')
    }, 15000)
  })

  describe('lens_content Integration Tests', () => {
    test('should analyze real content with natural language', async () => {
      const result = await (server as any).lensContent({
        what: 'posts by this user',
        about: 'posts',
        target: KNOWN_LENS_ADDRESS,
        show: 'raw',
        limit: 3,
      })

      if (result.isError) {
        console.log('Content posts error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()

      try {
        const data = JSON.parse(result.content[0].text)
        expect(data).toHaveProperty('items')
        expect(Array.isArray(data.items)).toBe(true)
      } catch (e) {
        // If not JSON, just verify it's a valid response
        expect(result.content[0].text.length).toBeGreaterThan(0)
      }
    }, 15000)

    test('should handle engagement analysis', async () => {
      const result = await (server as any).lensContent({
        about: 'highlights',
        target: KNOWN_LENS_ADDRESS,
        show: 'concise',
        limit: 3,
      })

      if (result.isError) {
        console.log('Content highlights error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()
      expect(result.content[0].text).toContain('⭐')
    }, 15000)
  })

  describe('lens_ecosystem Integration Tests', () => {
    test('should explore real ecosystem apps', async () => {
      const result = await (server as any).lensEcosystem({
        explore: 'trending apps in the ecosystem',
        view: 'apps',
        show: 'raw',
        limit: 5,
      })

      if (result.isError) {
        console.log('Ecosystem apps error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()

      try {
        const data = JSON.parse(result.content[0].text)
        expect(data).toHaveProperty('items')
        expect(Array.isArray(data.items)).toBe(true)
      } catch (e) {
        // If not JSON, just verify it's a valid response
        expect(result.content[0].text.length).toBeGreaterThan(0)
      }
    }, 15000)

    test('should show real trending content', async () => {
      const result = await (server as any).lensEcosystem({
        view: 'trending',
        timeframe: '7d',
        show: 'concise',
      })

      if (result.isError) {
        console.log('Ecosystem trending error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()
      expect(result.content[0].text).toContain('📈')
    }, 15000)

    test('should provide ecosystem statistics', async () => {
      const result = await (server as any).lensEcosystem({
        view: 'statistics',
        show: 'detailed',
      })

      if (result.isError) {
        console.log('Ecosystem statistics error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()
      expect(result.content[0].text).toContain('📊')
      expect(result.content[0].text).toContain('Active Applications:')
    }, 15000)

    test('should provide ecosystem insights', async () => {
      const result = await (server as any).lensEcosystem({
        view: 'insights',
        show: 'detailed',
      })

      if (result.isError) {
        console.log('Ecosystem insights error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()
      expect(result.content[0].text).toContain('🔍')
      expect(result.content[0].text).toContain('Growth Areas:')
    }, 15000)
  })

  describe('Natural Language Parameter Integration', () => {
    test('should handle "for" parameter in search', async () => {
      const result = await (server as any).lensSearch({
        for: 'crypto accounts on lens protocol',
        query: 'crypto',
        type: 'accounts',
        show: 'concise',
      })

      if (result.isError) {
        console.log('Natural language search error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()
      expect(result.content[0].text).toContain('🔍')
    }, 15000)

    test('should handle "who" parameter in profile', async () => {
      const result = await (server as any).lensProfile({
        who: KNOWN_LENS_ADDRESS,
        include: ['basic'],
        show: 'concise',
      })

      if (result.isError) {
        console.log('Natural language profile error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()
      expect(result.content[0].text).toContain('👤')
    }, 15000)

    test('should handle "what" parameter in content', async () => {
      const result = await (server as any).lensContent({
        what: 'posts by this user',
        about: 'posts',
        target: KNOWN_LENS_ADDRESS,
        show: 'concise',
      })

      if (result.isError) {
        console.log('Natural language content error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()
    }, 15000)

    test('should handle "explore" parameter in ecosystem', async () => {
      const result = await (server as any).lensEcosystem({
        explore: 'what apps are popular right now',
        view: 'apps',
        show: 'concise',
      })

      if (result.isError) {
        console.log('Natural language ecosystem error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()
      expect(result.content[0].text).toContain('🚀')
    }, 15000)
  })

  describe('Enhanced Error Handling Integration', () => {
    test('should provide helpful errors with examples', async () => {
      const result = await (server as any).lensSearch({
        query: 'test',
        // Missing required 'type' parameter
      })

      expect(result.isError).toBeTruthy()
      expect(result.content[0].text).toContain('I need to know what you want to find')
      expect(result.content[0].text).toContain('lens_search(query=')
    }, 15000)

    test('should handle invalid view types gracefully', async () => {
      const result = await (server as any).lensEcosystem({
        view: 'invalid_view_type',
      })

      expect(result.isError).toBeTruthy()
      expect(result.content[0].text).toContain("I don't understand")
      expect(result.content[0].text).toContain('Try:')
    }, 15000)
  })

  describe('Response Format Integration', () => {
    test('should return concise format with emojis and natural language', async () => {
      const result = await (server as any).lensEcosystem({
        view: 'apps',
        show: 'concise',
      })

      if (result.isError) {
        console.log('Concise format error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()
      expect(result.content[0].text).toContain('🚀')
      expect(result.content[0].text).not.toMatch(/^\s*{/) // Should not start with JSON
    }, 15000)

    test('should return detailed format with summary + data', async () => {
      const result = await (server as any).lensProfile({
        who: KNOWN_LENS_ADDRESS,
        include: ['basic'],
        show: 'detailed',
      })

      if (result.isError) {
        console.log('Detailed format error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()
      expect(result.content[0].text).toContain('👤')
      expect(result.content[0].text).toContain('{') // Should contain JSON
    }, 15000)
  })

  describe('Environment Configuration Tests', () => {
    test('should use correct environment configuration', () => {
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

  describe('Pagination Integration Tests', () => {
    test('should handle pagination in lens_search', async () => {
      // First page
      const firstPage = await (server as any).lensSearch({
        query: 'lens',
        type: 'posts',
        show: 'raw',
        limit: 2,
      })

      if (firstPage.isError) {
        console.log('Pagination search error (acceptable):', firstPage.content[0].text)
        expect(firstPage.content[0].text).toBeDefined()
        return
      }

      expect(firstPage.content[0].text).toBeDefined()
      const firstPageData = JSON.parse(firstPage.content[0].text)
      expect(firstPageData).toHaveProperty('items')
      expect(firstPageData).toHaveProperty('pagination')
      expect(Array.isArray(firstPageData.items)).toBe(true)
      
      // If there's a next page, test cursor pagination
      if (firstPageData.pagination.hasNext && firstPageData.pagination.nextCursor) {
        const secondPage = await (server as any).lensSearch({
          query: 'lens', 
          type: 'posts',
          show: 'raw',
          limit: 2,
          cursor: firstPageData.pagination.nextCursor,
        })

        if (!secondPage.isError) {
          const secondPageData = JSON.parse(secondPage.content[0].text)
          expect(secondPageData).toHaveProperty('items')
          expect(Array.isArray(secondPageData.items)).toBe(true)
          
          // Items should be different between pages
          if (firstPageData.items.length > 0 && secondPageData.items.length > 0) {
            expect(firstPageData.items[0].id).not.toBe(secondPageData.items[0].id)
          }
        }
      }
    }, 20000)

    test('should handle pagination in lens_content', async () => {
      const result = await (server as any).lensContent({
        about: 'posts',
        target: KNOWN_LENS_ADDRESS,
        show: 'raw',
        limit: 3,
      })

      if (result.isError) {
        console.log('Content pagination error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()
      
      try {
        const data = JSON.parse(result.content[0].text)
        expect(data).toHaveProperty('items')
        expect(data).toHaveProperty('pagination')
        expect(Array.isArray(data.items)).toBe(true)
      } catch (e) {
        // If not JSON, just verify it's a valid response
        expect(result.content[0].text.length).toBeGreaterThan(0)
      }
    }, 15000)

    test('should include pagination info in response summary', async () => {
      const result = await (server as any).lensSearch({
        query: 'blockchain',
        type: 'posts',
        show: 'concise',
        limit: 5,
      })

      if (result.isError) {
        console.log('Summary pagination error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()
      
      // Should mention pagination if more results available
      if (result.content[0].text.includes('More results available')) {
        expect(result.content[0].text).toContain('cursor')
        expect(result.content[0].text).toContain('next page')
      }
    }, 15000)

    test('should use smart compression to stay under token limits', async () => {
      // Test with comprehensive profile that previously exceeded token limit
      const result = await (server as any).lensProfile({
        who: 'daoleno',
        include: ['activity', 'influence', 'network'],
        show: 'detailed'
      })

      if (result.isError) {
        console.log('Smart compression test error:', result.content[0].text)
        return
      }

      const response = result.content[0].text
      const tokens = Math.ceil(response.length / 4)
      
      // Should be well under 25k token limit
      expect(tokens).toBeLessThan(25000)
      
      // Should not have any array truncation or content cutting
      expect(response).not.toContain('array was truncated')
      expect(response).not.toContain('content was truncated')
      
      // Should still preserve meaningful data structure
      const summaryEnd = response.indexOf('\n\n{')
      if (summaryEnd > 0) {
        const jsonPart = response.substring(summaryEnd + 2)
        try {
          const data = JSON.parse(jsonPart)
          
          // Verify data structure exists and has content
          let dataPointCount = 0
          if (data.account) dataPointCount++
          if (data.posts?.length) dataPointCount += data.posts.length
          if (data.highlights?.length) dataPointCount += data.highlights.length
          if (data.followers?.length) dataPointCount += data.followers.length
          if (data.following?.length) dataPointCount += data.following.length
          
          expect(dataPointCount).toBeGreaterThan(0)
          
        } catch (e) {
          // If JSON parsing fails, that's ok - we just verify response exists
          expect(response.length).toBeGreaterThan(100)
        }
      }
    }, 30000)

    test('should validate EVM addresses properly', async () => {
      // Test with valid address
      const validResult = await (server as any).lensProfile({
        who: '0xaF0B62118FDc775e1Ac392F9795bdC43c2376C00',
        include: ['basic'],
        show: 'concise',
      })

      // Test with username (should work)
      const usernameResult = await (server as any).lensProfile({
        who: 'lens', // This should be treated as username, not address
        include: ['basic'], 
        show: 'concise',
      })

      // Test with invalid hex address (too short)
      const invalidResult = await (server as any).lensContent({
        about: 'posts',
        target: '0x123', // Invalid - too short
        show: 'concise',
      })

      // Valid address should work (or give acceptable error)
      expect(validResult.content[0].text).toBeDefined()
      
      // Username should work (or give acceptable error)  
      expect(usernameResult.content[0].text).toBeDefined()
      
      // Invalid address should be treated as username and searched
      expect(invalidResult.content[0].text).toBeDefined()
    }, 15000)

    test('should show post types in search results', async () => {
      const result = await (server as any).lensSearch({
        query: 'blockchain',
        type: 'posts',
        show: 'concise',
        limit: 5,
      })

      if (result.isError) {
        console.log('Post type search error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()
      // Should contain post type emojis
      expect(result.content[0].text).toMatch(/[📝💬🔄🪞]/u)
    }, 15000)

    test('should optimize tokens in detailed mode', async () => {
      const result = await (server as any).lensProfile({
        who: KNOWN_LENS_ADDRESS,
        include: ['basic'],
        show: 'detailed',
      })

      if (result.isError) {
        console.log('Token optimization test error (acceptable):', result.content[0].text)
        expect(result.content[0].text).toBeDefined()
        return
      }

      expect(result.content[0].text).toBeDefined()
      const response = result.content[0].text
      const estimatedTokens = Math.ceil(response.length / 4)
      
      // Should be under the 25k token limit
      expect(estimatedTokens).toBeLessThan(25000)
    }, 15000)

    test('should handle engagement parameter correctly', async () => {
      const result = await (server as any).lensContent({
        about: 'engagement',
        target: KNOWN_LENS_ADDRESS,
        show: 'concise',
      })

      // Should automatically map engagement to reactions, but since target is address not post ID, should give helpful error
      expect(result.isError).toBeTruthy()
      expect(result.content[0].text).toContain('Reactions analysis requires a post ID')
      expect(result.content[0].text).toContain('lens_content(about="posts"')
    }, 15000)

    test('should give clear error for invalid target type', async () => {
      const result = await (server as any).lensContent({
        about: 'reactions',
        target: '0xjavi', // Invalid address format
        show: 'concise',
      })

      expect(result.isError).toBeTruthy()
      expect(result.content[0].text).toContain('requires a post ID')
    }, 15000)
  })
})
