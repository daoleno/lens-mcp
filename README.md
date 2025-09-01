# Lens Protocol MCP Server

A Model Context Protocol (MCP) server that provides access to Lens Protocol data and functionality. This server enables AI tools to interact with the Lens Protocol ecosystem through standardized MCP interfaces.

## Features

### Tools (Actions)
- **fetch_account** - Fetch Lens Protocol account/profile by address
- **fetch_posts** - Fetch posts with optional filters (by author, pagination)
- **fetch_followers** - Get followers of a specific account
- **fetch_following** - Get accounts that a specific account follows
- **fetch_apps** - Fetch Lens Protocol applications
- **fetch_groups** - Fetch groups from the protocol
- **fetch_usernames** - Fetch username information
- **search_accounts** - Search for profiles by username query
- **search_posts** - Search for posts by content query
- **search_usernames** - Search for usernames by query string
- **fetch_accounts_by_usernames** - Bulk fetch accounts by username list
- **fetch_post_reactions** - Get reactions (likes, upvotes, downvotes) for a post
- **fetch_post_references** - Get references (shares, comments, quotes) to a post
- **fetch_timeline_highlights** - Get timeline highlights for an account

### Resources (Data Access)
- **lens://account/{address}** - Account/profile information
- **lens://post/{id}** - Post/publication data
- **lens://app/{address}** - Application information
- **lens://group/{address}** - Group information

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

### Example MCP Tool Calls

#### Fetch Account
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "fetch_account",
    "arguments": {
      "address": "0x1234567890123456789012345678901234567890"
    }
  }
}
```

#### Fetch Posts
```json
{
  "jsonrpc": "2.0", 
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "fetch_posts",
    "arguments": {
      "pageSize": 5,
      "author": "0x1234567890123456789012345678901234567890"
    }
  }
}
```

#### Fetch Followers
```json
{
  "jsonrpc": "2.0",
  "id": 3, 
  "method": "tools/call",
  "params": {
    "name": "fetch_followers",
    "arguments": {
      "account": "0x1234567890123456789012345678901234567890",
      "pageSize": 10
    }
  }
}
```

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
        "url": "https://lens-mcp.lenscan.io/mcp"
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

## Architecture

The server is built using:
- **@lens-protocol/client@canary** - Official Lens Protocol TypeScript SDK
- **@modelcontextprotocol/sdk** - MCP server implementation
- **Bun** - Fast JavaScript runtime and package manager

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
