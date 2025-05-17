# Weather Data Agent Plugin for elizaOS

This plugin integrates a Weather Data Agent with Fetch.ai's Agentverse using Model Context Protocol (MCP).

## Features

- Weather data retrieval via OpenWeatherMap API
- Integration with Fetch.ai's Agentverse for agent discovery
- MCP endpoint for standardized context access
- REST API endpoints for direct weather data access

## Installation

```bash
# From the eliza root directory
cd packages/plugin-weather-agent
npm install
npm run build
```

## Configuration

The plugin requires the following environment variables:

- `WEATHER_API_KEY`: Your OpenWeatherMap API key (optional, uses demo mode if not provided)
- `FETCH_AI_API_KEY`: Your Fetch.ai API key for Agentverse integration (optional)

## Usage

### Enabling the Plugin

To enable this plugin in elizaOS, add it to your configuration:

```javascript
// In your elizaOS configuration
{
  "plugins": [
    // ... other plugins
    "@elizaos/plugin-weather-agent"
  ]
}
```

### As an elizaOS Plugin

Once installed and enabled, the plugin provides:

1. A weather service accessible via `runtime.getService('weather')`
2. A `GET_WEATHER` action for retrieving weather data
3. A weather provider that responds to natural language queries about weather

Example usage:
```javascript
// Using the GET_WEATHER action
const result = await runtime.executeAction('GET_WEATHER', { location: 'London' });

// Using the weather service directly
const weatherService = runtime.getService('weather');
const weatherData = await weatherService.getWeatherData('Tokyo');
```

### REST API

The plugin exposes the following endpoints:

- `GET /weather?location=CityName`: Get weather data for a specific location
- `POST /weather/mcp`: MCP-compatible endpoint for weather data requests

### MCP Integration

The plugin implements the Model Context Protocol (MCP) standard, allowing AI models to request weather data in a standardized format.

## Fetch.ai Integration

This plugin demonstrates integration with Fetch.ai's Agentverse by:

1. Implementing a compatible agent structure
2. Providing registration with the Agentverse ecosystem
3. Supporting agent discovery and communication

**Note:** The current implementation includes placeholders for Fetch.ai registration. In a production environment, you would need to implement the full uAgents SDK integration.

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm run test
```

## Known Limitations

- The Fetch.ai integration is currently a placeholder and requires the uAgents SDK for full functionality
- Weather data is retrieved from OpenWeatherMap API, which requires an API key for production use
- The MCP implementation is a simplified version of the full protocol

## License

See the elizaOS license for details.
