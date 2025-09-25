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

interface BaiduRegionSearchResponse {
  status: number;
  message: string;
  total?: number;
  result_type?: string;
  query_type?: string;
  results?: Array<{
    uid: string;
    name: string;
    location: {
      lat: number;
      lng: number;
    };
    province: string;
    city: string;
    area: string;
    address: string;
    telephone?: string;
    detail_info?: {
      overall_rating?: string | number;
      comment_num?: string | number;
      shop_hours?: string;
      price?: string;
      tag?: string;
      type?: string;
      brand?: string;
    };
  }>;
}

interface AmapGeocodeResponse {
  status: string;
  info: string;
  geocodes: Array<{
    location: string;
  }>;
}

export class LocationService {
  private readonly baiduApiKey: string | undefined;
  private readonly amapApiKey: string | undefined;
  
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
    this.amapApiKey = process.env.AMAP_API_KEY;
  }

  /**
   * 获取位置坐标
   * @param location - 位置信息（地址、坐标或"当前位置"）
   * @returns Promise<Coordinates>
   */
  public async getCoordinates(location: string): Promise<Coordinates> {
    // 如果已经是坐标格式
    if (this.isCoordinateFormat(location)) {
      return this.parseCoordinate(location);
    }

    // 如果是"当前位置"，返回默认坐标（这里可以集成GPS定位）
    if (location === '当前位置' || location === 'current location') {
      return LocationService.DEFAULT_COORDINATES;
    }

    // 通过地址获取坐标
    return await this.geocodeAddress(location);
  }

  /**
   * 检查是否为坐标格式
   * @param location 
   * @returns boolean
   */
  public isCoordinateFormat(location: string): boolean {
    const coordinateRegex = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/;
    return coordinateRegex.test(location);
  }

  /**
   * 解析坐标字符串
   * @param coordinate 
   * @returns Coordinates
   */
  public parseCoordinate(coordinate: string): Coordinates {
    const parts = coordinate.split(',').map(coord => parseFloat(coord.trim()));
    const lat = parts[0] || 0;
    const lng = parts[1] || 0;
    return { lat, lng };
  }

  /**
   * 地理编码：将地址转换为坐标
   * @param address 
   * @returns Promise<Coordinates>
   */
  public async geocodeAddress(address: string): Promise<Coordinates> {
    try {
      // 优先使用百度地图API
      if (this.baiduApiKey) {
        return await this.geocodeWithBaidu(address);
      }
      
      // 备用高德地图API
      if (this.amapApiKey) {
        return await this.geocodeWithAmap(address);
      }

      throw new Error('未配置地图API密钥');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('地理编码失败:', errorMessage);
      // 返回默认坐标
      return LocationService.DEFAULT_COORDINATES;
    }
  }

  /**
   * 使用百度地图API进行地理编码
   * @param address 
   * @returns Promise<Coordinates>
   */
  private async geocodeWithBaidu(address: string): Promise<Coordinates> {
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
   * 使用高德地图API进行地理编码
   * @param address 
   * @returns Promise<Coordinates>
   */
  private async geocodeWithAmap(address: string): Promise<Coordinates> {
    const url = 'https://restapi.amap.com/v3/geocode/geo';
    const params = {
      address,
      output: 'json',
      key: this.amapApiKey,
    };

    const response: AxiosResponse<AmapGeocodeResponse> = await axios.get(url, { params });
    
    if (response.data.status === '1' && response.data.geocodes.length > 0) {
      const location = response.data.geocodes[0]?.location?.split(',') || ['0', '0'];
      return { lat: parseFloat(location[1] || '0'), lng: parseFloat(location[0] || '0') };
    } else {
      throw new Error(`高德地图API错误: ${response.data.info}`);
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
   * 使用百度地图API进行区域搜索
   * @param query - 搜索关键词
   * @param region - 搜索区域
   * @param options - 搜索选项
   * @returns Promise<BaiduRegionSearchResponse['results']>
   */
  public async searchRegionWithBaidu(
    query: string,
    region: string,
    options: {
      type?: string;
      region_limit?: boolean;
      is_light_version?: boolean;
      center?: string;
      scope?: number;
      coord_type?: number;
      filter?: string;
      page_num?: number;
      page_size?: number;
      ret_coordtype?: string;
    } = {}
  ): Promise<BaiduRegionSearchResponse['results']> {
    if (!this.baiduApiKey) {
      throw new Error('未配置百度地图API密钥');
    }

    const url = 'https://api.map.baidu.com/place/v3/region';
    const params = {
      query,
      region,
      ak: this.baiduApiKey,
      output: 'json',
      ...options,
    };

    try {
      const response: AxiosResponse<BaiduRegionSearchResponse> = await axios.get(url, { params });
      
      if (response.data.status === 0 && response.data.results) {
        return response.data.results;
      } else {
        throw new Error(`百度地图区域搜索API错误: ${response.data.message}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('百度地图区域搜索失败:', errorMessage);
      throw error;
    }
  }

  /**
   * 搜索指定区域的美食
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
      const searchOptions: {
        scope: number;
        page_size: number;
        page_num: number;
        coord_type: number;
        ret_coordtype: string;
        type?: string;
      } = {
        scope: 2, // 返回详细信息
        page_size: 20,
        page_num: 0,
        coord_type: 3, // 百度经纬度坐标
        ret_coordtype: 'gcj02ll', // 返回国测局经纬度坐标
      };

      // 如果有菜系类型，添加到搜索选项中
      if (cuisineType) {
        searchOptions.type = cuisineType;
      }

      const results = await this.searchRegionWithBaidu(keyword, region, searchOptions);
      
      if (!results) {
        return [];
      }
      
      return results.map(poi => {
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
            lat: poi.location.lat,
            lng: poi.location.lng,
          },
          rating: this.parseRating(poi.detail_info?.overall_rating),
          price_range: this.parsePriceRange(poi.detail_info?.price),
          cuisine_type: this.extractCuisineType(poi.name + ' ' + (poi.detail_info?.tag || '')),
          tags: poi.detail_info?.tag?.split(',') || [],
        };

        if (poi.telephone) {
          result.phone = poi.telephone;
        }
        if (poi.detail_info?.shop_hours) {
          result.opening_hours = poi.detail_info.shop_hours;
        }

        return result;
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('区域美食搜索失败:', errorMessage);
      return [];
    }
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
    return LocationService.CUISINE_TYPES.find(type => text.includes(type)) || '其他';
  }

  /**
   * 判断是否为区域搜索
   * @param location 
   * @returns boolean
   */
  public static isRegionSearch(location: string): boolean {
    return LocationService.REGION_KEYWORDS.some(keyword => location.includes(keyword));
  }
}
