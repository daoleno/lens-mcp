# Lens Protocol MCP Server

A Model Context Protocol (MCP) server that provides agent-optimized access to Lens Protocol data and functionality.

## 🛠️ Available Tools

### **lens_search**
When you need to find or discover anything on Lens Protocol
- **Find**: Accounts, posts, usernames, apps, and groups
- **Natural Language**: "crypto accounts", "DeFi posts", "popular apps"
- **Example**: `lens_search(query="vitalik", type="accounts", show="concise")`

### **lens_profile** 
When you want to learn everything about a Lens Protocol account
- **Comprehensive Analysis**: Identity, social connections, influence, and activity with posts
- **Include Options**: `basic`, `social`, `influence`, `activity` (includes posts), `network`
- **Example**: `lens_profile(who="0x...", include=["basic", "activity"], analyze="influence")`

### **lens_content**
When you want to understand how content performs and what people think about it
- **Content Analysis**: Posts, reactions, comments, engagement metrics
- **Natural Queries**: "reactions to this post", "popular posts by user"
- **Example**: `lens_content(about="reactions", target="post_123", include=["likes", "comments"])`

### **lens_ecosystem**
When you want to explore the broader Lens Protocol ecosystem
- **Ecosystem Views**: Trending content, popular applications, platform statistics
- **Community Insights**: Apps, groups, ecosystem health, growth areas
- **Example**: `lens_ecosystem(view="trending", timeframe="7d", show="detailed")`


### Resources (Data Access)
- **lens://account/{address}** - Account/profile information
- **lens://post/{id}** - Post/publication data
- **lens://app/{address}** - Application information
- **lens://group/{address}** - Group information

## 📋 Response Formats

### Concise (Default)
Natural language summaries optimized for AI understanding:
```
🔍 Found 5 accounts matching "blockchain":
• vitalik.lens (0x1234...)
• ethereum.lens (0x5678...)
• defi.lens (0x9abc...)
... and 2 more
```

### Detailed
Summary + complete JSON data for full context:
```
🔍 Found 5 accounts matching "blockchain":
• vitalik.lens (0x1234...)
...

{
  "items": [...],
  "pageInfo": {...}
}
```

### Raw
Direct JSON output for programmatic use:
```json
{
  "items": [...],
  "pageInfo": {...}
}
```

## 🎯 Usage Examples

#### Search for Accounts
```json
{
  "name": "lens_search",
  "arguments": {
    "query": "vitalik",
    "type": "accounts",
    "show": "concise",
    "limit": 10
  }
}
```

#### Analyze Profile with Activity and Social Data
```json
{
  "name": "lens_profile",
  "arguments": {
    "who": "0x...",
    "include": ["basic", "activity", "social"],
    "show": "detailed"
  }
}
```

#### Understand Content Engagement
```json
{
  "name": "lens_content",
  "arguments": {
    "what": "reactions to this post",
    "about": "reactions", 
    "target": "post_123",
    "include": ["likes", "comments"]
  }
}
```

#### Explore Ecosystem Trends
```json
{
  "name": "lens_ecosystem",
  "arguments": {
    "view": "trending",
    "timeframe": "7d",
    "show": "detailed"
  }
}
```


## Installation

```bash
bun install
```

## Usage

### Starting the Server

#### Local (stdio) Mode
```bash
bun start
```

#### Remote HTTP Mode
```bash
bun start:http
# Or with custom port
PORT=8080 bun start:http
```

The server supports both stdio (for local use) and HTTP (for remote access) transports.

### Configuration

Set environment variables:

- `LENS_ENVIRONMENT`: Set to "testnet" for testnet, defaults to mainnet
- `PORT`: HTTP server port (default: 3000)

### MCP Client Configuration

#### Local Server Configuration
Add this server to your MCP client configuration:

```json
{
  "mcpServers": {
    "lens-protocol": {
      "command": "bun",
      "args": ["index.ts"],
      "cwd": "/path/to/lens-mcp"
    }
  }
}
```

#### Remote Server Configuration
For remote HTTP access:

```json
{
  "mcpServers": {
    "lens-protocol-remote": {
      "transport": {
        "type": "http",
        "url": "https://lens-mcp.wooo.guru/mcp"
      }
    }
  }
}
```

## Development

### Running in Development Mode
```bash
# Stdio mode
bun dev

# HTTP mode  
bun dev:http
```

### Testing
```bash
# Run unit tests
bun test

# Run integration tests  
bun test:integration

# Run all tests
bun test:all
```

### Docker Deployment

```bash
# Build and run with Docker
docker build -f docker/Dockerfile -t lens-mcp .
docker run -p 3000:3000 lens-mcp

# Or use docker-compose
docker-compose -f docker/docker-compose.yml up
```

## 🏗️ Architecture & Design Principles

### Built With
- **@lens-protocol/client@canary** - Official Lens Protocol TypeScript SDK
- **@modelcontextprotocol/sdk** - MCP server implementation
- **Bun** - Fast JavaScript runtime and package manager

### Design Principles
1. **Workflow-Focused**: Tools match natural task subdivisions
2. **Context Efficient**: Built-in token limits and smart pagination 
3. **Natural Language**: Returns semantic summaries by default
4. **Actionable Errors**: Error messages include specific guidance
5. **Multiple Formats**: Choose between `concise`, `detailed`, or `raw` output

## Limitations

- Search functionality is limited in public client mode (requires authenticated session)
- Some advanced features require authentication which is not implemented in this server
- Rate limiting depends on Lens Protocol API limits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Test with `bun test.ts`
5. Submit a pull request

## License

MIT License