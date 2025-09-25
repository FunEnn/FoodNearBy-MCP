import axios, { AxiosResponse } from 'axios';

export interface Coordinates {
  lat: number;
  lng: number;
}

interface BaiduGeocodeResponse {
  status: number;
  message: string;
  result?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface BaiduSuggestionResponse {
  status: number;
  message: string;
  result?: Array<{
    name: string;
    location: {
      lat: number;
      lng: number;
    };
    uid: string;
    province: string;
    city: string;
    district: string;
    town: string;
    town_code: string;
    business: string;
    cityid: number;
    tag: string;
    address: string;
    children?: Array<{
      uid: string;
      name: string;
      show_name: string;
    }>;
  }>;
}

interface BaiduSearchResponse {
  status: number;
  message: string;
  result?: {
    Q: string;
    total: number;
    page_size: number;
    page_num: number;
    results: Array<{
      name: string;
      location: {
        lat: string;
        lng: string;
      };
      address: string;
      province: string;
      city: string;
      area: string;
      street_id: string;
      detail: number;
      uid: string;
      photo?: {
        photo_reference: string;
        photo_url: string;
      };
    }>;
  };
}

// 矩形边界搜索响应
interface BaiduBoundsSearchResponse {
  status: number;
  message: string;
  result_type?: string;
  query_type?: string;
  results?: Array<{
    name: string;
    location: {
      lat: string;
      lng: string;
    };
    address: string;
    province: string;
    city: string;
    area: string;
    street_id: string;
    telephone: string;
    detail: number;
    uid: string;
  }>;
}

export class BaiduLocationService {
  private readonly baiduApiKey: string | undefined;
  
  // 常量定义
  private static readonly DEFAULT_COORDINATES = { lat: 39.9042, lng: 116.4074 }; // 北京天安门
  private static readonly REGION_KEYWORDS = ['市', '县', '区', '省', '自治区', '特别行政区'];
  private static readonly CUISINE_TYPES = [
    '川菜', '粤菜', '湘菜', '鲁菜', '苏菜', '浙菜', '闽菜', '徽菜',
    '日料', '韩料', '西餐', '快餐', '火锅', '烧烤', '甜品', '咖啡',
    '茶饮', '面包', '蛋糕', '小吃', '面食', '米饭', '汤品'
  ];

  constructor() {
    this.baiduApiKey = process.env.BAIDU_MAP_API_KEY;
  }

  /**
   * 地理编码：将地址转换为坐标
   * @param address 
   * @returns Promise<Coordinates>
   */
  public async geocodeAddress(address: string): Promise<Coordinates> {
    if (!this.baiduApiKey) {
      throw new Error('未配置百度地图API密钥');
    }

    const url = 'https://api.map.baidu.com/geocoding/v2/';
    const params = {
      address,
      output: 'json',
      ak: this.baiduApiKey,
    };

    const response: AxiosResponse<BaiduGeocodeResponse> = await axios.get(url, { params });
    
    if (response.data.status === 0 && response.data.result) {
      const { lat, lng } = response.data.result.location;
      return { lat, lng };
    } else {
      throw new Error(`百度地图API错误: ${response.data.message}`);
    }
  }

  /**
   * 使用百度地图API进行建议搜索
   * @param query - 搜索关键词
   * @param region - 搜索区域
   * @param options - 搜索选项
   * @returns Promise<BaiduSuggestionResponse['result']>
   */
  public async searchSuggestion(
    query: string,
    region: string,
    options: {
      city_limit?: boolean;
      location?: string;
      coord_type?: number;
      ret_coordtype?: number;
      output?: string;
    } = {}
  ): Promise<BaiduSuggestionResponse['result']> {
    if (!this.baiduApiKey) {
      throw new Error('未配置百度地图API密钥');
    }

    const url = 'https://api.map.baidu.com/place/v2/suggestion';
    const params = {
      query,
      region,
      city_limit: options.city_limit || false,
      ak: this.baiduApiKey,
      output: options.output || 'json',
      ...options,
    };

    try {
      const response: AxiosResponse<BaiduSuggestionResponse> = await axios.get(url, { params });
      
      if (response.data.status === 0 && response.data.result) {
        return response.data.result;
      } else {
        throw new Error(`百度地图建议搜索API错误: ${response.data.message}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('百度地图建议搜索失败:', errorMessage);
      throw error;
    }
  }

  /**
   * 使用百度地图API进行地点搜索（先获取经纬度，再搜索）
   * @param query - 搜索关键词
   * @param region - 搜索区域
   * @param options - 搜索选项
   * @returns Promise<BaiduSearchResponse['result']>
   */
  public async searchPlace(
    query: string,
    region: string,
    options: {
      tag?: string;
      city_limit?: boolean;
      extensions_adcode?: boolean;
      output?: string;
      scope?: string;
      filter?: string;
      coord_type?: number;
      ret_coordtype?: string;
      page_size?: number;
      page_num?: number;
      photo_show?: boolean;
    } = {}
  ): Promise<BaiduSearchResponse['result']> {
    if (!this.baiduApiKey) {
      throw new Error('未配置百度地图API密钥');
    }

    const url = 'https://api.map.baidu.com/place/v2/search';
    const params = {
      query,
      region,
      ak: this.baiduApiKey,
      output: 'json',
      scope: '2', // 返回详细信息
      page_size: 20,
      page_num: 0,
      coord_type: 3, // 百度经纬度坐标
      ret_coordtype: 'gcj02ll', // 返回国测局经纬度坐标
      ...options,
    };

    try {
      const response: AxiosResponse<BaiduSearchResponse> = await axios.get(url, { params });
      
      if (response.data.status === 0 && response.data.result) {
        return response.data.result;
      } else {
        throw new Error(`百度地图搜索API错误: ${response.data.message}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('百度地图搜索失败:', errorMessage);
      throw error;
    }
  }

  /**
   * 使用百度地图API进行矩形边界搜索
   * @param query - 搜索关键词
   * @param bounds - 矩形边界，格式：西南角纬度,西南角经度;东北角纬度,东北角经度
   * @param options - 搜索选项
   * @returns Promise<BaiduBoundsSearchResponse['results']>
   */
  public async searchPlaceByBounds(
    query: string,
    bounds: string,
    options: {
      tag?: string;
      output?: string;
      scope?: string;
      filter?: string;
      coord_type?: number;
      ret_coordtype?: string;
      page_size?: number;
      page_num?: number;
      photo_show?: boolean;
    } = {}
  ): Promise<BaiduBoundsSearchResponse['results']> {
    if (!this.baiduApiKey) {
      throw new Error('未配置百度地图API密钥');
    }

    const url = 'https://api.map.baidu.com/place/v2/search';
    const params = {
      query,
      bounds,
      ak: this.baiduApiKey,
      output: options.output || 'json',
      ...options,
    };

    try {
      const response: AxiosResponse<BaiduBoundsSearchResponse> = await axios.get(url, { params });
      
      if (response.data.status === 0 && response.data.results) {
        return response.data.results;
      } else {
        throw new Error(`百度地图边界搜索API错误: ${response.data.message}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('百度地图边界搜索失败:', errorMessage);
      throw error;
    }
  }

  /**
   * 搜索指定区域的美食（两步流程：先获取建议坐标，再进行多边形区域检索）
   * @param region - 搜索区域（如：北京市、漳州市）
   * @param keyword - 搜索关键词（如：美食、餐厅）
   * @param cuisineType - 菜系类型（可选）
   * @returns Promise<Array<{name: string, address: string, location: Coordinates, rating: number}>>
   */
  public async searchFoodInRegion(
    region: string,
    keyword: string = '美食',
    cuisineType?: string
  ): Promise<Array<{
    name: string;
    address: string;
    location: Coordinates;
    rating: number;
    phone?: string;
    opening_hours?: string;
    price_range?: string;
    cuisine_type?: string;
    tags?: string[];
  }>> {
    try {
      // 第一步：调用建议搜索API获取多个经纬度坐标
      const suggestionOptions = {
        city_limit: true, // 限制在指定城市
        coord_type: 3, // 百度经纬度坐标
        ret_coordtype: 3, // 返回国测局经纬度坐标
        output: 'json',
      };

      const suggestionResults = await this.searchSuggestion(keyword, region, suggestionOptions);
      
      if (!suggestionResults || suggestionResults.length === 0) {
        return [];
      }

      // 收集所有建议的坐标点
      const coordinates = suggestionResults.map(result => ({
        lat: result.location.lat,
        lng: result.location.lng,
        name: result.name,
        address: result.address,
        province: result.province,
        city: result.city,
        district: result.district,
        town: result.town,
        business: result.business,
        tag: result.tag
      }));

      // 第二步：使用这些坐标进行多边形区域检索
      const allResults: Array<{
        name: string;
        address: string;
        location: Coordinates;
        rating: number;
        phone?: string;
        opening_hours?: string;
        price_range?: string;
        cuisine_type?: string;
        tags?: string[];
      }> = [];

      // 为每个坐标点进行边界搜索
      for (const coord of coordinates) {
        try {
          // 构建以该坐标为中心的矩形边界（约1公里范围）
          const offset = 0.01; // 约1公里的偏移量
          const southwest = {
            lat: coord.lat - offset,
            lng: coord.lng - offset
          };
          const northeast = {
            lat: coord.lat + offset,
            lng: coord.lng + offset
          };

          const bounds = `${southwest.lat},${southwest.lng};${northeast.lat},${northeast.lng}`;
          
          const searchOptions = {
            scope: '2', // 返回详细信息
            page_size: 10, // 每个区域限制10个结果
            page_num: 0,
            coord_type: 3, // 百度经纬度坐标
            ret_coordtype: 'gcj02ll', // 返回国测局经纬度坐标
            output: 'json',
          };

          // 构建搜索关键词，如果有菜系类型则组合搜索
          const searchQuery = cuisineType ? `${keyword} ${cuisineType}` : keyword;

          const searchResult = await this.searchPlaceByBounds(searchQuery, bounds, searchOptions);
          
          if (searchResult && searchResult.length > 0) {
            const mappedResults = searchResult.map(poi => ({
              name: poi.name,
              address: poi.address,
              location: {
                lat: parseFloat(poi.location.lat),
                lng: parseFloat(poi.location.lng),
              },
              rating: 4.0, // 搜索API不返回评分，设置默认值
              price_range: '中等', // 搜索API不返回价格信息，设置默认值
              cuisine_type: this.extractCuisineType(poi.name),
              tags: [],
            }));
            
            allResults.push(...mappedResults);
          }
        } catch (error) {
          console.warn(`坐标点 ${coord.name} 的搜索失败:`, error);
          // 继续处理其他坐标点
        }
      }

      // 去重并返回结果
      const uniqueResults = this.removeDuplicateResults(allResults);
      return uniqueResults.slice(0, 20); // 限制返回20个结果

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('区域美食搜索失败:', errorMessage);
      return [];
    }
  }

  /**
   * 基于坐标搜索附近的美食（使用两步流程）
   * @param coordinates - 中心坐标
   * @param keyword - 搜索关键词（如：美食、餐厅）
   * @param radius - 搜索半径（米）
   * @param cuisineType - 菜系类型（可选）
   * @returns Promise<Array<{name: string, address: string, location: Coordinates, rating: number}>>
   */
  public async searchFoodNearby(
    coordinates: Coordinates,
    keyword: string = '美食',
    radius: number = 1000,
    cuisineType?: string
  ): Promise<Array<{
    name: string;
    address: string;
    location: Coordinates;
    rating: number;
    phone?: string;
    opening_hours?: string;
    price_range?: string;
    cuisine_type?: string;
    tags?: string[];
    distance?: number;
  }>> {
    try {
      // 第一步：调用建议搜索API获取该坐标附近的建议点
      const locationStr = `${coordinates.lat},${coordinates.lng}`;
      const suggestionOptions = {
        location: locationStr, // 传入位置参数，返回结果将以距离进行排序
        coord_type: 3, // 百度经纬度坐标
        ret_coordtype: 3, // 返回国测局经纬度坐标
        output: 'json',
      };

      const suggestionResults = await this.searchSuggestion(keyword, locationStr, suggestionOptions);
      
      if (!suggestionResults || suggestionResults.length === 0) {
        return [];
      }

      // 第二步：使用这些坐标进行多边形区域检索
      const allResults: Array<{
        name: string;
        address: string;
        location: Coordinates;
        rating: number;
        phone?: string;
        opening_hours?: string;
        price_range?: string;
        cuisine_type?: string;
        tags?: string[];
        distance?: number;
      }> = [];

      // 为每个建议的坐标点进行边界搜索
      for (const suggestion of suggestionResults.slice(0, 5)) { // 限制处理前5个建议点
        try {
          // 构建以该坐标为中心的矩形边界（约500米范围）
          const offset = 0.005; // 约500米的偏移量
          const southwest = {
            lat: suggestion.location.lat - offset,
            lng: suggestion.location.lng - offset
          };
          const northeast = {
            lat: suggestion.location.lat + offset,
            lng: suggestion.location.lng + offset
          };

          const bounds = `${southwest.lat},${southwest.lng};${northeast.lat},${northeast.lng}`;
          
          const searchOptions = {
            scope: '2', // 返回详细信息
            page_size: 5, // 每个区域限制5个结果
            page_num: 0,
            coord_type: 3, // 百度经纬度坐标
            ret_coordtype: 'gcj02ll', // 返回国测局经纬度坐标
            output: 'json',
          };

          // 构建搜索关键词，如果有菜系类型则组合搜索
          const searchQuery = cuisineType ? `${keyword} ${cuisineType}` : keyword;

          const searchResult = await this.searchPlaceByBounds(searchQuery, bounds, searchOptions);
          
          if (searchResult && searchResult.length > 0) {
            const mappedResults = searchResult.map(poi => {
              const poiLocation = {
                lat: parseFloat(poi.location.lat),
                lng: parseFloat(poi.location.lng),
              };
              
              // 计算距离
              const distance = this.calculateDistance(coordinates, poiLocation);
              
              return {
                name: poi.name,
                address: poi.address,
                location: poiLocation,
                rating: 4.0, // 搜索API不返回评分，设置默认值
                price_range: '中等', // 搜索API不返回价格信息，设置默认值
                cuisine_type: this.extractCuisineType(poi.name),
                tags: [],
                distance: Math.round(distance), // 距离（米）
              };
            });
            
            allResults.push(...mappedResults);
          }
        } catch (error) {
          console.warn(`建议点 ${suggestion.name} 的搜索失败:`, error);
          // 继续处理其他建议点
        }
      }

      // 去重、过滤距离范围并排序
      const uniqueResults = this.removeDuplicateResults(allResults);
      return uniqueResults
        .filter(result => result.distance && result.distance <= radius) // 过滤距离范围内的结果
        .sort((a, b) => (a.distance || 0) - (b.distance || 0)) // 按距离排序
        .slice(0, 20); // 限制返回20个结果

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('附近美食搜索失败:', errorMessage);
      return [];
    }
  }

  /**
   * 在矩形区域内搜索美食
   * @param southwest - 西南角坐标
   * @param northeast - 东北角坐标
   * @param keyword - 搜索关键词（如：美食、餐厅）
   * @param cuisineType - 菜系类型（可选）
   * @returns Promise<Array<{name: string, address: string, location: Coordinates, rating: number}>>
   */
  public async searchFoodInBounds(
    southwest: Coordinates,
    northeast: Coordinates,
    keyword: string = '美食',
    cuisineType?: string
  ): Promise<Array<{
    name: string;
    address: string;
    location: Coordinates;
    rating: number;
    phone?: string;
    opening_hours?: string;
    price_range?: string;
    cuisine_type?: string;
    tags?: string[];
  }>> {
    try {
      // 构建搜索关键词，如果有菜系类型则组合搜索
      const searchQuery = cuisineType ? `${keyword} ${cuisineType}` : keyword;
      
      // 构建边界字符串：西南角纬度,西南角经度;东北角纬度,东北角经度
      const bounds = `${southwest.lat},${southwest.lng};${northeast.lat},${northeast.lng}`;
      
      const searchOptions: {
        tag?: string;
        output?: string;
        scope?: string;
        filter?: string;
        coord_type?: number;
        ret_coordtype?: string;
        page_size?: number;
        page_num?: number;
        photo_show?: boolean;
      } = {
        scope: '2', // 返回详细信息
        page_size: 20,
        page_num: 0,
        coord_type: 3, // 百度经纬度坐标
        ret_coordtype: 'gcj02ll', // 返回国测局经纬度坐标
        output: 'json',
      };

      // 使用边界搜索API
      const searchResult = await this.searchPlaceByBounds(searchQuery, bounds, searchOptions);
      
      if (!searchResult || searchResult.length === 0) {
        return [];
      }
      
      return searchResult.map(poi => {
        const result: {
          name: string;
          address: string;
          location: Coordinates;
          rating: number;
          phone?: string;
          opening_hours?: string;
          price_range?: string;
          cuisine_type?: string;
          tags?: string[];
        } = {
          name: poi.name,
          address: poi.address,
          location: {
            lat: parseFloat(poi.location.lat),
            lng: parseFloat(poi.location.lng),
          },
          rating: 4.0, // 搜索API不返回评分，设置默认值
          price_range: '中等', // 搜索API不返回价格信息，设置默认值
          cuisine_type: this.extractCuisineType(poi.name),
          tags: [],
        };

        return result;
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('矩形区域美食搜索失败:', errorMessage);
      return [];
    }
  }

  /**
   * 计算两点间距离（米）
   * @param coord1 
   * @param coord2 
   * @returns number
   */
  public calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371000; // 地球半径（米）
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLng = this.toRadians(coord2.lng - coord1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(coord1.lat)) * Math.cos(this.toRadians(coord2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 角度转弧度
   * @param degrees 
   * @returns number
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * 去除重复的搜索结果
   * @param results - 搜索结果数组
   * @returns 去重后的结果数组
   */
  public removeDuplicateResults<T extends { name: string; address: string; location: Coordinates }>(
    results: T[]
  ): T[] {
    const seen = new Set<string>();
    return results.filter(result => {
      // 使用名称和地址作为唯一标识
      const key = `${result.name}|${result.address}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 解析评分
   * @param rating 
   * @returns number
   */
  public parseRating(rating: string | number | undefined): number {
    if (!rating) return 0;
    const num = parseFloat(String(rating));
    return isNaN(num) ? 0 : Math.min(5, Math.max(0, num));
  }

  /**
   * 解析价格区间
   * @param price 
   * @returns string
   */
  public parsePriceRange(price: string | undefined): string {
    if (!price) return '中等';
    const num = parseFloat(price);
    if (isNaN(num)) return '中等';
    if (num < 30) return '便宜';
    if (num > 100) return '昂贵';
    return '中等';
  }

  /**
   * 提取菜系类型
   * @param text 
   * @returns string
   */
  public extractCuisineType(text: string): string {
    return BaiduLocationService.CUISINE_TYPES.find(type => text.includes(type)) || '其他';
  }

  /**
   * 判断是否为区域搜索
   * @param location 
   * @returns boolean
   */
  public static isRegionSearch(location: string): boolean {
    return BaiduLocationService.REGION_KEYWORDS.some(keyword => location.includes(keyword));
  }
}
