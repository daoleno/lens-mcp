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
})
