import { expect, vi, describe, test, beforeEach } from 'vitest';
import { weatherPlugin, WeatherService, getWeatherAction, weatherProvider, WeatherMCPConnector } from '../src';
import axios from 'axios';
import { createMockServer } from './utils/mockServer';

// Mock axios
vi.mock('axios');

// Sample weather data response
const mockWeatherData = {
  name: 'London',
  sys: {
    country: 'GB'
  },
  main: {
    temp: 15.5,
    humidity: 76
  },
  weather: [
    {
      description: 'partly cloudy'
    }
  ],
  wind: {
    speed: 4.2
  }
};

// Mock runtime for testing
const mockRuntime = {
  getService: vi.fn((name) => {
    if (name === 'weather') {
      return new WeatherService(mockRuntime as any);
    }
    return null;
  }),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }
} as any;

describe('Weather Agent Plugin Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup axios mock
    (axios.get as any).mockResolvedValue({ data: mockWeatherData });
  });

  test('Plugin should have correct name and description', () => {
    expect(weatherPlugin.name).toBe('plugin-weather-agent');
    expect(weatherPlugin.description).toContain('Weather Data Agent');
  });

  test('Plugin should have weather service registered', () => {
    const hasWeatherService = weatherPlugin.services.some(
      (service) => service.serviceType === 'weather'
    );
    expect(hasWeatherService).toBe(true);
  });

  test('Plugin should have GET_WEATHER action registered', () => {
    const hasGetWeatherAction = weatherPlugin.actions.some(
      (action) => action.name === 'GET_WEATHER'
    );
    expect(hasGetWeatherAction).toBe(true);
  });

  test('Plugin should have weather provider registered', () => {
    const hasWeatherProvider = weatherPlugin.providers.some(
      (provider) => provider.name === 'weather'
    );
    expect(hasWeatherProvider).toBe(true);
  });

  test('Plugin should have routes function that returns weather routes', () => {
    expect(typeof weatherPlugin.routes).toBe('function');
    const routes = (weatherPlugin.routes as any)(mockRuntime);
    
    const hasWeatherRoute = routes.some(
      (route: any) => route.path === '/weather'
    );
    const hasMcpRoute = routes.some(
      (route: any) => route.path === '/weather/mcp'
    );
    
    expect(hasWeatherRoute).toBe(true);
    expect(hasMcpRoute).toBe(true);
  });

  test('WeatherService should fetch weather data correctly', async () => {
    const weatherService = new WeatherService(mockRuntime as any);
    const result = await weatherService.getWeatherData('London');
    
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('London')
    );
    expect(result).toEqual(mockWeatherData);
  });

  test('GET_WEATHER action should return weather data', async () => {
    const result = await getWeatherAction.handler(mockRuntime as any, { location: 'London' });
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('location', 'London');
    expect(result.data).toHaveProperty('temperature', 15.5);
  });

  test('Weather provider should extract location and return weather data', async () => {
    const result = await weatherProvider.handler(
      mockRuntime as any,
      { text: 'What is the weather in London?' } as any,
      {} as any
    );
    
    expect(result.text).toContain('London');
    expect(result.text).toContain('15.5°C');
    expect(result.values).toHaveProperty('location', 'London');
  });

  test('MCP connector should handle requests correctly', async () => {
    const mcpConnector = new WeatherMCPConnector(mockRuntime as any);
    const result = await mcpConnector.handleMCPRequest({ location: 'London' });
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockWeatherData);
  });

  test('Error handling in weather service', async () => {
    (axios.get as any).mockRejectedValueOnce(new Error('API error'));

    const weatherService = new WeatherService(mockRuntime as any);
    await expect(weatherService.getWeatherData('London')).rejects.toThrow('Failed to fetch weather data');
  });
});

// HTTP Endpoint Tests
describe('Weather Agent HTTP Endpoint Tests', () => {
  let server: any;
  let request: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (axios.get as any).mockResolvedValue({ data: mockWeatherData });

    const { app, supertest } = createMockServer(weatherPlugin as any, mockRuntime as any);
    server = app;
    request = supertest;
  });

  test('GET /weather should return weather data for valid location', async () => {
    const response = await request.get('/weather?location=London');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(mockWeatherData);
  });

  test('GET /weather should return 400 when location is missing', async () => {
    const response = await request.get('/weather');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Location parameter is required');
  });

  test('GET /weather should return 500 when weather service fails', async () => {
    (axios.get as any).mockRejectedValueOnce(new Error('API error'));

    const response = await request.get('/weather?location=London');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Failed to get weather data');
  });

  test('POST /weather/mcp should handle valid MCP requests', async () => {
    const response = await request
      .post('/weather/mcp')
      .send({ location: 'London' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(mockWeatherData);
  });

  test('POST /weather/mcp should return error when location is missing', async () => {
    const response = await request
      .post('/weather/mcp')
      .send({})
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body.error).toContain('Location is required');
  });

  test('POST /weather/mcp should handle service errors', async () => {
    (axios.get as any).mockRejectedValueOnce(new Error('API error'));

    const response = await request
      .post('/weather/mcp')
      .send({ location: 'London' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Failed to process MCP request');
  });
});
