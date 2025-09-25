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
  poi_type?: string;
  city_limit?: boolean;
}

// 常量定义
const DEFAULT_RADIUS = 1000;
const DEFAULT_KEYWORD = '美食';
const DEFAULT_PLATFORMS = ['all'];

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
            description: '通过地图API搜索附近的餐饮商家POI信息，专注于美食餐厅',
            inputSchema: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  description: '搜索位置，可以是地址、坐标、"当前位置"或区域名称（如：北京市）',
                },
                radius: {
                  type: 'number',
                  description: '搜索半径（米），默认1000米',
                  default: DEFAULT_RADIUS,
                },
                keyword: {
                  type: 'string',
                  description: '餐饮搜索关键词，如：美食、餐厅、火锅、川菜、日料、西餐等',
                  default: DEFAULT_KEYWORD,
                },
                cuisine_type: {
                  type: 'string',
                  description: '菜系类型筛选（如：川菜、粤菜、湘菜、日料、韩料、西餐、火锅等）',
                },
                price_range: {
                  type: 'string',
                  description: '价格区间筛选：便宜、中等、昂贵',
                },
                map_platforms: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '地图平台：baidu、amap、all',
                  default: DEFAULT_PLATFORMS,
                },
                poi_type: {
                  type: 'string',
                  description: '高德地图餐饮POI类型（如：050000=餐饮服务，050100=中餐厅，050101=火锅）',
                },
                city_limit: {
                  type: 'boolean',
                  description: '是否仅返回指定城市数据（仅高德地图有效）',
                  default: false,
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
      radius = DEFAULT_RADIUS, 
      keyword = DEFAULT_KEYWORD, 
      cuisine_type, 
      price_range, 
      map_platforms = DEFAULT_PLATFORMS,
      poi_type,
      city_limit = false
    } = args;

    try {
      // 确定要使用的地图平台
      const platforms = map_platforms.includes('all') ? ['baidu', 'amap'] : map_platforms;
      
      // 使用综合搜索功能（自动判断是区域搜索还是坐标搜索）
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
        .map((restaurant, index) => this.formatRestaurantInfo(restaurant, index + 1))
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `🗺️ 地图POI搜索结果（${filteredResults.length}家美食商家）：\n\n${resultText}\n\n${this.formatSearchStats(location, radius, keyword, platforms, { 
              cuisine_type: cuisine_type || undefined, 
              price_range: price_range || undefined, 
              poi_type: poi_type || undefined, 
              city_limit: city_limit || undefined 
            })}\n\n💡 提示：\n- 数据来源于地图POI，包含真实的餐饮商家信息\n- 评分和评论数量来自地图平台\n- 价格区间基于地图数据估算\n- 高德地图支持餐饮POI类型精确搜索\n- 支持中餐、西餐、日料、韩料、火锅、烧烤等餐饮类型`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`地图POI搜索失败: ${errorMessage}`);
    }
  }

  /**
   * 格式化餐厅信息
   * @param restaurant - 餐厅信息
   * @param index - 序号
   * @returns 格式化后的字符串
   */
  private formatRestaurantInfo(restaurant: any, index: number): string {
    return `${index}. ${restaurant.name}
   📍 ${restaurant.address}
   ⭐ ${restaurant.rating}/5.0 (${restaurant.review_count}条评价)
   📞 ${restaurant.phone || '电话未知'}
   🕒 ${restaurant.opening_hours || '营业时间未知'}
   💰 ${restaurant.price_range}
   🍽️ ${restaurant.cuisine_type}
   📏 距离：${Math.round(restaurant.distance)}米
   🗺️ 来源：${restaurant.platforms.join(', ')}`;
  }

  /**
   * 格式化搜索统计信息
   * @param location - 搜索位置
   * @param radius - 搜索半径
   * @param keyword - 搜索关键词
   * @param platforms - 使用平台
   * @param filters - 筛选条件
   * @returns 格式化后的字符串
   */
  private formatSearchStats(
    location: string, 
    radius: number, 
    keyword: string, 
    platforms: string[], 
    filters: { cuisine_type?: string | undefined; price_range?: string | undefined; poi_type?: string | undefined; city_limit?: boolean | undefined }
  ): string {
    const filterText = [
      filters.cuisine_type && `菜系=${filters.cuisine_type}`,
      filters.price_range && `价格=${filters.price_range}`,
      filters.poi_type && `POI类型=${filters.poi_type}`,
      filters.city_limit && `城市限制=${filters.city_limit}`
    ].filter(Boolean).join(' ');

    return `📊 搜索统计：
- 搜索位置：${location}
- 搜索半径：${radius}米
- 搜索关键词：${keyword}
- 使用平台：${platforms.join(', ')}
- 筛选条件：${filterText}`;
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