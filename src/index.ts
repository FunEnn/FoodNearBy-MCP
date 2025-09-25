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

// 加载环境变量
dotenv.config();

interface SearchMapPoiArgs {
  location: string;
  radius?: number;
  keyword?: string;
  cuisine_type?: string;
  price_range?: string;
  map_platforms?: string[];
}

class FoodNearbyMCPServer {
  private server: Server;
  private locationService: LocationService;
  private mapPoiService: MapPoiService;

  constructor() {
    this.server = new Server(
      {
        name: '@funenn/mcp-server',
        version: '1.0.0',
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
    // 列出可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => {
      return {
        tools: [
          {
            name: 'search_map_poi',
            description: '通过地图API搜索附近的美食商家POI信息',
            inputSchema: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  description: '搜索位置，可以是地址、坐标或"当前位置"',
                },
                radius: {
                  type: 'number',
                  description: '搜索半径（米），默认1000米',
                  default: 1000,
                },
                keyword: {
                  type: 'string',
                  description: '搜索关键词，如：美食、餐厅、火锅、川菜等',
                  default: '美食',
                },
                cuisine_type: {
                  type: 'string',
                  description: '菜系类型筛选',
                },
                price_range: {
                  type: 'string',
                  description: '价格区间筛选：便宜、中等、昂贵',
                },
                map_platforms: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '地图平台：baidu、amap、all',
                  default: ['all'],
                },
              },
              required: ['location'],
            },
          },
        ],
      };
    });

    // 处理工具调用
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
      radius = 1000, 
      keyword = '美食', 
      cuisine_type, 
      price_range, 
      map_platforms = ['all'] 
    } = args;

    try {
      // 获取位置坐标
      const coordinates = await this.locationService.getCoordinates(location);
      
      // 确定要使用的地图平台
      const platforms = map_platforms.includes('all') ? ['baidu', 'amap'] : map_platforms;
      
      // 搜索地图POI
      const results = await this.mapPoiService.searchNearbyFood(
        coordinates, 
        radius, 
        keyword, 
        platforms
      );

      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `🗺️ 未找到 ${location} 附近的美食商家。\n\n可能的原因：\n1. 该区域美食商家较少\n2. 搜索关键词不准确\n3. 搜索半径过小\n4. 地图API密钥配置问题\n\n建议：\n- 尝试扩大搜索半径\n- 使用更通用的关键词（如"餐厅"）\n- 检查地图API配置`,
            },
          ],
        };
      }

      // 应用筛选条件
      let filteredResults = results;
      
      if (cuisine_type) {
        filteredResults = this.mapPoiService.filterByCuisineType(filteredResults, cuisine_type);
      }
      
      if (price_range) {
        filteredResults = this.mapPoiService.filterByPriceRange(filteredResults, price_range);
      }

      const resultText = filteredResults
        .map((restaurant, index) => {
          return `${index + 1}. ${restaurant.name}\n   📍 ${restaurant.address}\n   ⭐ ${restaurant.rating}/5.0 (${restaurant.review_count}条评价)\n   📞 ${restaurant.phone || '电话未知'}\n   🕒 ${restaurant.opening_hours || '营业时间未知'}\n   💰 ${restaurant.price_range}\n   🍽️ ${restaurant.cuisine_type}\n   📏 距离：${Math.round(restaurant.distance)}米\n   🗺️ 来源：${restaurant.platforms.join(', ')}`;
        })
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `🗺️ 地图POI搜索结果（${filteredResults.length}家美食商家）：\n\n${resultText}\n\n📊 搜索统计：\n- 搜索位置：${location}\n- 搜索半径：${radius}米\n- 搜索关键词：${keyword}\n- 使用平台：${platforms.join(', ')}\n- 筛选条件：${cuisine_type ? `菜系=${cuisine_type}` : ''} ${price_range ? `价格=${price_range}` : ''}\n\n💡 提示：\n- 数据来源于地图POI，包含真实的商家信息\n- 评分和评论数量来自地图平台\n- 价格区间基于地图数据估算`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`地图POI搜索失败: ${errorMessage}`);
    }
  }

  public async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('@funenn/mcp-server 已启动');
  }
}

// 启动服务器
const server = new FoodNearbyMCPServer();
server.run().catch(console.error);

