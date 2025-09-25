import axios, { AxiosResponse } from 'axios';
import { Coordinates } from './locationService.js';

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  location: Coordinates;
  rating: number;
  review_count: number;
  phone: string;
  opening_hours: string;
  price_range: string;
  cuisine_type: string;
  distance: number;
  image: string;
  platforms: string[];
  source: string;
  tags: string[];
}

interface BaiduPoiResponse {
  status: number;
  message: string;
  results?: Array<{
    uid: string;
    name: string;
    address: string;
    location: {
      lat: number;
      lng: number;
    };
    distance: number;
    detail_info?: {
      overall_rating?: string | number;
      comment_num?: string | number;
      phone?: string;
      opening_time?: string;
      price?: string;
      tag?: string;
      photo?: {
        photo: Array<{
          photo_url: string;
        }>;
      };
    };
  }>;
}

interface AmapPoiResponse {
  status: string;
  info: string;
  pois?: Array<{
    id: string;
    name: string;
    address: string;
    location: string;
    distance: number;
    rating?: string;
    comment_num?: string;
    tel?: string;
    opening_time?: string;
    cost?: string;
    type?: string;
    photos?: Array<{
      url: string;
    }>;
  }>;
}

export class MapPoiService {
  private readonly baiduApiKey: string | undefined;
  private readonly gaodeApiKey: string | undefined;

  constructor() {
    this.baiduApiKey = process.env.BAIDU_MAP_API_KEY;
    this.gaodeApiKey = process.env.GAODE_MAP_API_KEY;
  }

  /**
   * 通过百度地图API搜索附近的美食商家
   * @param coordinates - 坐标
   * @param radius - 搜索半径（米）
   * @param keyword - 搜索关键词
   * @returns Promise<Restaurant[]>
   */
  public async searchNearbyFoodWithBaidu(
    coordinates: Coordinates, 
    radius: number = 1000, 
    keyword: string = '美食'
  ): Promise<Restaurant[]> {
    try {
      const url = 'https://api.map.baidu.com/place/v2/search';
      const params = {
        query: keyword,
        location: `${coordinates.lat},${coordinates.lng}`,
        radius: radius,
        output: 'json',
        ak: this.baiduApiKey,
        scope: 2, // 返回详细信息
        page_size: 20,
        page_num: 0,
      };

      const response: AxiosResponse<BaiduPoiResponse> = await axios.get(url, { params });
      
      if (response.data.status === 0 && response.data.results) {
        return response.data.results.map(poi => this.formatBaiduPoi(poi));
      } else {
        throw new Error(`百度地图API错误: ${response.data.message}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('百度地图POI搜索失败:', errorMessage);
      return [];
    }
  }

  /**
   * 通过高德地图API搜索附近的美食商家
   * @param coordinates - 坐标
   * @param radius - 搜索半径（米）
   * @param keyword - 搜索关键词
   * @returns Promise<Restaurant[]>
   */
  public async searchNearbyFoodWithAmap(
    coordinates: Coordinates, 
    radius: number = 1000, 
    keyword: string = '美食'
  ): Promise<Restaurant[]> {
    try {
      const url = 'https://restapi.amap.com/v3/place/around';
    const params = {
      key: this.gaodeApiKey,
      location: `${coordinates.lng},${coordinates.lat}`, // 高德地图使用经度,纬度格式
      keywords: keyword,
      radius: radius,
      output: 'json',
      extensions: 'all', // 返回详细信息
      page: 1,
      offset: 20,
    };

      const response: AxiosResponse<AmapPoiResponse> = await axios.get(url, { params });
      
      if (response.data.status === '1' && response.data.pois) {
        return response.data.pois.map(poi => this.formatAmapPoi(poi));
      } else {
        throw new Error(`高德地图API错误: ${response.data.info}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('高德地图POI搜索失败:', errorMessage);
      return [];
    }
  }

  /**
   * 格式化百度地图POI数据
   * @param poi - 百度地图POI数据
   * @returns Restaurant
   */
  private formatBaiduPoi(poi: NonNullable<BaiduPoiResponse['results']>[0]): Restaurant {
    return {
      id: `baidu_${poi.uid}`,
      name: poi.name,
      address: poi.address,
      location: {
        lat: poi.location.lat,
        lng: poi.location.lng,
      },
      rating: this.parseBaiduRating(poi.detail_info?.overall_rating),
      review_count: this.parseBaiduReviewCount(poi.detail_info?.comment_num),
      phone: poi.detail_info?.phone || '',
      opening_hours: poi.detail_info?.opening_time || '',
      price_range: this.parseBaiduPriceRange(poi.detail_info?.price),
      cuisine_type: this.extractCuisineType(poi.name + ' ' + (poi.detail_info?.tag || '')),
      distance: poi.distance,
      image: poi.detail_info?.photo?.photo[0]?.photo_url || '',
      platforms: ['baidu_map'],
      source: 'baidu_map',
      tags: poi.detail_info?.tag?.split(',') || [],
    };
  }

  /**
   * 格式化高德地图POI数据
   * @param poi - 高德地图POI数据
   * @returns Restaurant
   */
  private formatAmapPoi(poi: NonNullable<AmapPoiResponse['pois']>[0]): Restaurant {
    return {
      id: `amap_${poi.id}`,
      name: poi.name,
      address: poi.address,
      location: {
        lat: parseFloat(poi.location?.split(',')[1] || '0'),
        lng: parseFloat(poi.location?.split(',')[0] || '0'),
      },
      rating: this.parseAmapRating(poi.rating),
      review_count: this.parseAmapReviewCount(poi.comment_num),
      phone: poi.tel || '',
      opening_hours: poi.opening_time || '',
      price_range: this.parseAmapPriceRange(poi.cost),
      cuisine_type: this.extractCuisineType(poi.name + ' ' + (poi.type || '')),
      distance: poi.distance,
      image: poi.photos?.[0]?.url || '',
      platforms: ['amap'],
      source: 'amap',
      tags: poi.type?.split(';') || [],
    };
  }

  /**
   * 解析百度地图评分
   * @param rating 
   * @returns number
   */
  private parseBaiduRating(rating: string | number | undefined): number {
    if (!rating) return 0;
    const num = parseFloat(String(rating));
    return isNaN(num) ? 0 : Math.min(5, Math.max(0, num));
  }

  /**
   * 解析高德地图评分
   * @param rating 
   * @returns number
   */
  private parseAmapRating(rating: string | undefined): number {
    if (!rating) return 0;
    const num = parseFloat(rating);
    return isNaN(num) ? 0 : Math.min(5, Math.max(0, num));
  }

  /**
   * 解析百度地图评论数量
   * @param count 
   * @returns number
   */
  private parseBaiduReviewCount(count: string | number | undefined): number {
    if (!count) return 0;
    const num = parseInt(String(count));
    return isNaN(num) ? 0 : num;
  }

  /**
   * 解析高德地图评论数量
   * @param count 
   * @returns number
   */
  private parseAmapReviewCount(count: string | undefined): number {
    if (!count) return 0;
    const num = parseInt(count);
    return isNaN(num) ? 0 : num;
  }

  /**
   * 解析百度地图价格区间
   * @param price 
   * @returns string
   */
  private parseBaiduPriceRange(price: string | undefined): string {
    if (!price) return '中等';
    const num = parseFloat(price);
    if (isNaN(num)) return '中等';
    if (num < 30) return '便宜';
    if (num > 100) return '昂贵';
    return '中等';
  }

  /**
   * 解析高德地图价格区间
   * @param cost 
   * @returns string
   */
  private parseAmapPriceRange(cost: string | undefined): string {
    if (!cost) return '中等';
    const num = parseFloat(cost);
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
  private extractCuisineType(text: string): string {
    const cuisineTypes = [
      '川菜', '粤菜', '湘菜', '鲁菜', '苏菜', '浙菜', '闽菜', '徽菜',
      '日料', '韩料', '西餐', '快餐', '火锅', '烧烤', '甜品', '咖啡',
      '茶饮', '面包', '蛋糕', '小吃', '面食', '米饭', '汤品'
    ];
    
    for (const type of cuisineTypes) {
      if (text.includes(type)) {
        return type;
      }
    }
    
    return '其他';
  }


  /**
   * 搜索附近美食（综合多个地图API）
   * @param coordinates - 坐标
   * @param radius - 搜索半径（米）
   * @param keyword - 搜索关键词
   * @param platforms - 要使用的平台
   * @returns Promise<Restaurant[]>
   */
  public async searchNearbyFood(
    coordinates: Coordinates, 
    radius: number = 1000, 
    keyword: string = '美食', 
    platforms: string[] = ['baidu', 'amap']
  ): Promise<Restaurant[]> {
    const results: Restaurant[] = [];

    try {
      // 使用百度地图API
      if (platforms.includes('baidu') && this.baiduApiKey) {
        const baiduResults = await this.searchNearbyFoodWithBaidu(coordinates, radius, keyword);
        results.push(...baiduResults);
      }

      // 使用高德地图API
      if (platforms.includes('amap') && this.gaodeApiKey) {
        const amapResults = await this.searchNearbyFoodWithAmap(coordinates, radius, keyword);
        results.push(...amapResults);
      }

      // 去重并排序
      return this.deduplicateAndSort(results);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('地图POI搜索失败:', errorMessage);
      return [];
    }
  }

  /**
   * 去重并排序结果
   * @param results 
   * @returns Restaurant[]
   */
  private deduplicateAndSort(results: Restaurant[]): Restaurant[] {
    // 按名称去重
    const uniqueResults = results.reduce((acc, current) => {
      const existing = acc.find(item => 
        item.name === current.name && 
        Math.abs(item.location.lat - current.location.lat) < 0.001 &&
        Math.abs(item.location.lng - current.location.lng) < 0.001
      );
      
      if (!existing) {
        acc.push(current);
      } else {
        // 合并平台信息
        existing.platforms = [...new Set([...existing.platforms, ...current.platforms])];
        // 选择更好的数据源
        if (current.rating > existing.rating) {
          Object.assign(existing, current);
        }
      }
      return acc;
    }, [] as Restaurant[]);

    // 按评分和距离排序
    return uniqueResults.sort((a, b) => {
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }
      return (a.distance || 0) - (b.distance || 0);
    });
  }

  /**
   * 按菜系类型筛选
   * @param restaurants - 餐厅列表
   * @param cuisineType - 菜系类型
   * @returns Restaurant[]
   */
  public filterByCuisineType(restaurants: Restaurant[], cuisineType: string): Restaurant[] {
    if (!cuisineType) return restaurants;
    return restaurants.filter(restaurant => 
      restaurant.cuisine_type === cuisineType || 
      restaurant.tags.some(tag => tag.includes(cuisineType))
    );
  }

  /**
   * 按价格区间筛选
   * @param restaurants - 餐厅列表
   * @param priceRange - 价格区间
   * @returns Restaurant[]
   */
  public filterByPriceRange(restaurants: Restaurant[], priceRange: string): Restaurant[] {
    if (!priceRange) return restaurants;
    return restaurants.filter(restaurant => restaurant.price_range === priceRange);
  }

  /**
   * 按距离筛选
   * @param restaurants - 餐厅列表
   * @param maxDistance - 最大距离（米）
   * @returns Restaurant[]
   */
  public filterByDistance(restaurants: Restaurant[], maxDistance: number): Restaurant[] {
    if (!maxDistance) return restaurants;
    return restaurants.filter(restaurant => (restaurant.distance || 0) <= maxDistance);
  }
}

