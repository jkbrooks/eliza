import { z } from 'zod';
import {
  IAgentRuntime,
  Plugin,
  Service,
  logger,
  ModelType,
  GenerateTextParams,
  ProviderResult,
  Memory,
  State,
  Action,
} from '@elizaos/core';
import axios from 'axios';

// Configuration schema for the weather agent plugin
const configSchema = z.object({
  WEATHER_API_KEY: z.string().optional(),
  FETCH_AI_API_KEY: z.string().optional(),
});

// Weather service that handles API calls and data processing
export class WeatherService extends Service {
  static serviceType = 'weather';
  capabilityDescription = 'This service provides weather data through Fetch.ai integration using MCP.';
  
  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
    logger.info('Weather service initialized');
  }

  static async start(runtime: IAgentRuntime) {
    logger.info(`Starting weather service - ${new Date().toISOString()}`);
    const service = new WeatherService(runtime);
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    logger.info('Stopping weather service');
    const service = runtime.getService(WeatherService.serviceType);
    if (!service) {
      throw new Error('Weather service not found');
    }
    service.stop();
  }

  async stop() {
    logger.info('Weather service stopped');
  }

  // Method to get weather data from API
  async getWeatherData(location: string): Promise<any> {
    try {
      // Using a free weather API for demonstration
      const apiKey = process.env.WEATHER_API_KEY || 'demo';
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`
      );
      return response.data;
    } catch (error) {
      logger.error('Error fetching weather data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch weather data: ${errorMessage}`);
    }
  }

  // Method to register agent with Fetch.ai Agentverse
  // NOTE: This is a placeholder for actual Fetch.ai registration
  // In a real implementation, this would use the uAgents SDK
  async registerWithFetchAi(): Promise<boolean> {
    try {
      logger.info('Registering agent with Fetch.ai Agentverse');
      
      // TODO: Implement actual Fetch.ai registration using uAgents SDK
      // This is currently a placeholder that simulates successful registration
      
      return true;
    } catch (error) {
      logger.error('Error registering with Fetch.ai:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to register with Fetch.ai: ${errorMessage}`);
    }
  }
}

// Action to get weather for a location
export const getWeatherAction: Action = {
  name: 'GET_WEATHER',
  description: 'Get weather information for a specific location',
  parameters: {
    location: {
      type: 'string',
      description: 'The city or location to get weather for',
      required: true,
    },
  },
  handler: async (runtime, params) => {
    const { location } = params;
    if (!location) {
      return {
        success: false,
        error: 'Location is required',
      };
    }

    try {
      const weatherService = runtime.getService('weather') as WeatherService;
      if (!weatherService) {
        throw new Error('Weather service not available');
      }

      const weatherData = await weatherService.getWeatherData(location);
      
      return {
        success: true,
        data: {
          location: weatherData.name,
          country: weatherData.sys.country,
          temperature: weatherData.main.temp,
          description: weatherData.weather[0].description,
          humidity: weatherData.main.humidity,
          windSpeed: weatherData.wind.speed,
        },
      };
    } catch (error) {
      logger.error('Error in GET_WEATHER action:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to get weather: ${errorMessage}`,
      };
    }
  },
};

// Provider for weather information
export const weatherProvider = {
  name: 'weather',
  description: 'Provides weather information for a location',
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State
  ): Promise<ProviderResult> => {
    // Extract location from message or state
    const locationMatch = message.text.match(/weather (?:for|in|at) ([a-zA-Z\s]+)/i);
    const location = locationMatch ? locationMatch[1].trim() : null;

    if (!location) {
      return {
        text: 'I need a location to provide weather information. Try asking about the weather in a specific city.',
        values: {},
        data: {},
      };
    }

    try {
      const weatherService = runtime.getService('weather') as WeatherService;
      if (!weatherService) {
        throw new Error('Weather service not available');
      }

      const weatherData = await weatherService.getWeatherData(location);
      
      return {
        text: `The current weather in ${weatherData.name}, ${weatherData.sys.country} is ${weatherData.weather[0].description} with a temperature of ${weatherData.main.temp}°C, humidity at ${weatherData.main.humidity}%, and wind speed of ${weatherData.wind.speed} m/s.`,
        values: {
          location: weatherData.name,
          country: weatherData.sys.country,
          temperature: weatherData.main.temp,
          description: weatherData.weather[0].description,
        },
        data: {
          weather: weatherData,
        },
      };
    } catch (error) {
      logger.error('Error in weather provider:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        text: `I'm sorry, I couldn't get the weather information for ${location}. Please try again later.`,
        values: {},
        data: {},
      };
    }
  },
};

// MCP integration for weather data
export class WeatherMCPConnector {
  private runtime: IAgentRuntime;
  
  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
    logger.info('Weather MCP connector initialized');
  }

  // Method to handle MCP requests for weather data
  async handleMCPRequest(request: any): Promise<any> {
    try {
      const { location } = request;
      if (!location) {
        return {
          error: 'Location is required for weather data',
        };
      }

      const weatherService = this.runtime.getService('weather') as WeatherService;
      if (!weatherService) {
        throw new Error('Weather service not available');
      }

      const weatherData = await weatherService.getWeatherData(location);
      return {
        success: true,
        data: weatherData,
      };
    } catch (error) {
      logger.error('Error handling MCP request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to process MCP request: ${errorMessage}`,
      };
    }
  }
}

// Create a closure with runtime for route handlers
const createRouteHandlers = (runtime: IAgentRuntime) => {
  // Weather API endpoint handler
  const weatherHandler = async (_req: any, res: any) => {
    const location = _req.query.location;
    if (!location) {
      return res.status(400).json({
        error: 'Location parameter is required',
      });
    }

    try {
      const weatherService = runtime.getService('weather') as WeatherService;
      if (!weatherService) {
        throw new Error('Weather service not available');
      }

      const weatherData = await weatherService.getWeatherData(location);
      res.json({
        success: true,
        data: weatherData,
      });
    } catch (error) {
      logger.error('Error in /weather endpoint:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: `Failed to get weather data: ${errorMessage}`,
      });
    }
  };

  // MCP endpoint handler
  const mcpHandler = async (_req: any, res: any) => {
    try {
      const mcpConnector = new WeatherMCPConnector(runtime);
      const result = await mcpConnector.handleMCPRequest(_req.body);
      res.json(result);
    } catch (error) {
      logger.error('Error in /weather/mcp endpoint:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: `Failed to process MCP request: ${errorMessage}`,
      });
    }
  };

  return {
    weatherHandler,
    mcpHandler,
  };
};

// Main plugin definition
export const weatherPlugin: Plugin = {
  name: 'plugin-weather-agent',
  description: 'Weather Data Agent with Fetch.ai integration for elizaOS',
  config: {
    WEATHER_API_KEY: process.env.WEATHER_API_KEY,
    FETCH_AI_API_KEY: process.env.FETCH_AI_API_KEY,
  },
  async init(config: Record<string, string>) {
    logger.info('Initializing weather agent plugin');
    try {
      const validatedConfig = await configSchema.parseAsync(config);
      // Set environment variables
      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value) process.env[key] = value;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid plugin configuration: ${error.errors.map((e) => e.message).join(', ')}`
        );
      }
      throw error;
    }
  },
  models: {
    [ModelType.TEXT_SMALL]: async (
      runtime,
      { prompt, stopSequences = [] }: GenerateTextParams
    ) => {
      // Simple response for demonstration
      if (prompt.toLowerCase().includes('weather')) {
        return 'I can help you get weather information for any location. Just ask about the weather in a specific city.';
      }
      return 'I am a weather agent that can provide weather information through Fetch.ai integration.';
    },
  },
  tests: [
    {
      name: 'weather_agent_test_suite',
      tests: [
        {
          name: 'service_availability_test',
          fn: async (runtime) => {
            logger.debug('Testing weather service availability');
            const service = runtime.getService('weather');
            if (!service) {
              throw new Error('Weather service not found');
            }
          },
        },
        {
          name: 'weather_action_test',
          fn: async (runtime) => {
            logger.debug('Testing weather action registration');
            const actionExists = weatherPlugin.actions.some((a) => a.name === 'GET_WEATHER');
            if (!actionExists) {
              throw new Error('GET_WEATHER action not found in plugin');
            }
          },
        },
      ],
    },
  ],
  routes: (runtime) => {
    const { weatherHandler, mcpHandler } = createRouteHandlers(runtime);
    
    return [
      {
        path: '/weather',
        type: 'GET',
        handler: weatherHandler,
      },
      {
        path: '/weather/mcp',
        type: 'POST',
        handler: mcpHandler,
      },
    ];
  },
  events: {
    MESSAGE_RECEIVED: [
      async (params) => {
        if (params.message?.text?.toLowerCase().includes('weather')) {
          logger.debug('Weather-related message received');
        }
      },
    ],
  },
  services: [WeatherService],
  actions: [getWeatherAction],
  providers: [weatherProvider],
};

export default weatherPlugin;
