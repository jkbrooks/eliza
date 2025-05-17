import express from 'express';
import supertest from 'supertest';
import { Plugin, IAgentRuntime } from '@elizaos/core';

/**
 * Creates a mock Express server with the plugin's routes for testing
 *
 * @param plugin The plugin containing routes to test
 * @param runtime Mock runtime to pass to route handlers
 * @returns Object containing Express app and supertest instance
 */
export function createMockServer(plugin: Plugin, runtime: IAgentRuntime) {
  const app = express();
  app.use(express.json());

  if (typeof plugin.routes === 'function') {
    const routes = plugin.routes(runtime);
    routes.forEach(route => {
      const method = route.type.toLowerCase();
      if (method === 'get') {
        app.get(route.path, route.handler as any);
      } else if (method === 'post') {
        app.post(route.path, route.handler as any);
      } else if (method === 'put') {
        app.put(route.path, route.handler as any);
      } else if (method === 'delete') {
        app.delete(route.path, route.handler as any);
      }
    });
  }

  return {
    app,
    supertest: supertest(app),
  };
}
