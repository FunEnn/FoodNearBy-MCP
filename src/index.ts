#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
  ListToolsResult,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { LocationService } from './services/locationService.js';
import { MapPoiService } from './services/mapPoiService.js';

dotenv.config();

interface SearchMapPoiArgs {
  location: string;
  radius?: number;
  keyword?: string;
  cuisine_type?: string;
  price_range?: string;
  map_platforms?: string[];
  poi_type?: string;
  city_limit?: boolean;
}

const DEFAULT_RADIUS = 1000;
const DEFAULT_KEYWORD = '美食';
const DEFAULT_PLATFORMS = ['amap'];

class FoodNearbyMCPServer {
  private server: Server;
  private locationService: LocationService;
  private mapPoiService: MapPoiService;

  constructor() {
    this.server = new Server(
      {
        name: "foodnearby-mcp",
        version: '0.0.7',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.locationService = new LocationService();
    this.mapPoiService = new MapPoiService();

    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => {
      return {
        tools: [
          {
            name: 'search_map_poi',
            description: '通过高德地图API搜索附近的餐饮商家POI信息，专注于美食餐厅。提供详细的餐厅信息包括评分、价格、菜系等。',
            inputSchema: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  description: '搜索位置，可以是地址、坐标、"当前位置"或区域名称（如：北京市、天安门广场、39.9042,116.4074）。使用"当前位置"将自动获取用户当前位置并搜索周边美食。',
                },
                radius: {
                  type: 'number',
                  description: '搜索半径（米），默认1000米，建议范围：500-5000米',
                  default: DEFAULT_RADIUS,
                },
                keyword: {
                  type: 'string',
                  description: '餐饮搜索关键词，如：美食、餐厅、火锅、川菜、日料、西餐、烧烤、甜品等',
                  default: DEFAULT_KEYWORD,
                },
                cuisine_type: {
                  type: 'string',
                  description: '菜系类型筛选（如：川菜、粤菜、湘菜、日料、韩料、西餐、火锅、烧烤、甜品等）',
                },
                price_range: {
                  type: 'string',
                  description: '价格区间筛选：便宜、中等、昂贵',
                },
                map_platforms: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '地图平台选择：amap（高德地图）',
                  default: ['amap'],
                },
                poi_type: {
                  type: 'string',
                  description: '高德地图餐饮POI类型（如：050000=餐饮服务，050100=中餐厅，050101=火锅，050102=烧烤）',
                },
                city_limit: {
                  type: 'boolean',
                  description: '是否仅返回指定城市数据（仅高德地图有效），默认false',
                  default: false,
                },
              },
              required: ['location'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_map_poi':
            return await this.handleSearchMapPoi(args as unknown as SearchMapPoiArgs);
          default:
            throw new Error(`未知工具: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `错误: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private async handleSearchMapPoi(args: SearchMapPoiArgs): Promise<CallToolResult> {
    const { 
      location, 
      radius = DEFAULT_RADIUS, 
      keyword = DEFAULT_KEYWORD, 
      cuisine_type, 
      price_range, 
      map_platforms = DEFAULT_PLATFORMS,
      poi_type,
      city_limit = false
    } = args;

    try {
      const amapApiKey = process.env.AMAP_API_KEY;
      
      if (!amapApiKey) {
        return {
          content: [
            {
              type: 'text',
              text: `未配置高德地图API密钥`,
            },
          ],
        };
      }

      const platforms = ['amap'];

      const results = await this.mapPoiService.searchFood(
        location, 
        radius, 
        keyword, 
        cuisine_type,
        platforms,
        poi_type,
        city_limit
      );


      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `未找到 ${location} 附近的美食商家`,
            },
          ],
        };
      }

      let filteredResults = results;
      
      if (cuisine_type) {
        filteredResults = this.mapPoiService.filterByCuisineType(filteredResults, cuisine_type);
      }
      
      if (price_range) {
        filteredResults = this.mapPoiService.filterByPriceRange(filteredResults, price_range);
      }

      const resultText = filteredResults
        .map((restaurant, index) => this.formatRestaurantInfo(restaurant, index + 1))
        .join('\n\n');

      const totalResults = results.length;
      const filteredCount = filteredResults.length;
      const filterApplied = cuisine_type || price_range;

      return {
        content: [
          {
            type: 'text',
            text: `找到 ${filteredCount} 家美食商家\n\n${resultText}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        content: [
          {
            type: 'text',
            text: `搜索失败: ${errorMessage}`,
          },
        ],
      };
    }
  }

  private formatRestaurantInfo(restaurant: any, index: number): string {
    const distanceText = restaurant.distance ? `${Math.round(restaurant.distance)}米` : '距离未知';
    const phoneText = restaurant.phone || '电话未知';
    const hoursText = restaurant.opening_hours || '营业时间未知';

    return `${index}. ${restaurant.name}
地址：${restaurant.address}
评分：${restaurant.rating}/5.0
电话：${phoneText}
营业时间：${hoursText}
价格：${restaurant.price_range}
菜系：${restaurant.cuisine_type}
距离：${distanceText}`;
  }



  public async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('foodnearby-mcp 已启动');
  }
}

const server = new FoodNearbyMCPServer();
server.run().catch(console.error);