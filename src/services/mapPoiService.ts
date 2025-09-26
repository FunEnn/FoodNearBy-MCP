import axios, { AxiosResponse } from 'axios';
import { Coordinates, LocationService } from './locationService.js';
import { AmapLocationService } from './amapLocationService.js';

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

interface AmapPoiResponse {
  status: string;
  info: string;
  count?: string;
  suggestion?: {
    keywords: string[];
    cities: Array<{
      name: string;
      num: string;
      citycode: string;
      adcode: string;
    }>;
  };
  pois?: Array<{
    id: string;
    parent?: string;
    name: string;
    type: string;
    typecode: string;
    biz_type?: string;
    address: string;
    location: string;
    distance?: number;
    tel?: string;
    postcode?: string;
    website?: string;
    email?: string;
    pcode?: string;
    pname?: string;
    citycode?: string;
    cityname?: string;
    adcode?: string;
    adname?: string;
    entr_location?: string;
    navi_poiid?: string;
    gridcode?: string;
    alias?: string;
    parking_type?: string;
    tag?: string;
    indoor_map?: string;
    indoor_data?: any;
    cpid?: string;
    floor?: string;
    truefloor?: string;
    groupbuy_num?: string;
    business_area?: string;
    discount_num?: string;
    biz_ext?: {
      rating?: string;
      cost?: string;
      meal_ordering?: string;
      seat_ordering?: string;
      ticket_ordering?: string;
      hotel_ordering?: string;
    };
    photos?: Array<{
      title: string;
      url: string;
    }>;
  }>;
}

export class MapPoiService {
  private readonly amapApiKey: string | undefined;
  private readonly locationService: LocationService;
  private readonly amapLocationService: AmapLocationService;

  // 常量定义
  private static readonly DEFAULT_RADIUS = 1000;
  private static readonly DEFAULT_KEYWORD = '美食';
  private static readonly DEFAULT_PLATFORMS = ['amap'];
  private static readonly MAX_OFFSET = 25;

  // 高德地图餐饮POI类型常量
  public static readonly AMAP_FOOD_TYPES = {
    RESTAURANT: '050000',           // 餐饮服务
    CHINESE_RESTAURANT: '050100',   // 中餐厅
    WESTERN_RESTAURANT: '050200',   // 西餐厅
    JAPANESE_RESTAURANT: '050300',  // 日本料理
    KOREAN_RESTAURANT: '050400',    // 韩国料理
    FAST_FOOD: '050500',            // 快餐
    COFFEE_SHOP: '050600',          // 咖啡厅
    TEA_HOUSE: '050700',            // 茶艺馆
    BAR: '050800',                  // 酒吧
    CAKE_SHOP: '050900',            // 蛋糕店
    HOT_POT: '050101',              // 火锅
    BARBECUE: '050102',             // 烧烤
    DESSERT: '050103',              // 甜品
    SNACKS: '050104',               // 小吃
  };

  constructor() {
    this.amapApiKey = process.env.AMAP_API_KEY;
    this.locationService = new LocationService();
    this.amapLocationService = new AmapLocationService();
  }

  public async searchNearbyFoodWithAmap(
    coordinates: Coordinates, 
    radius: number = MapPoiService.DEFAULT_RADIUS, 
    keyword: string = MapPoiService.DEFAULT_KEYWORD
  ): Promise<Restaurant[]> {
    try {
      // 使用AmapLocationService的新方法
      const results = await this.amapLocationService.searchNearbyFood(coordinates, radius, keyword);
      
      return results.map(poi => ({
        id: `amap_${poi.id}`,
        name: poi.name,
        address: poi.address,
        location: poi.location,
        rating: poi.rating,
        review_count: 0, // 高德地图API不直接返回评论数
        phone: poi.phone,
        opening_hours: '', // 高德地图API不直接返回营业时间
        price_range: poi.price_range,
        cuisine_type: poi.cuisine_type,
        distance: poi.distance,
        image: poi.image,
        platforms: ['amap'],
        source: 'amap',
        tags: poi.tags,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('高德地图POI搜索失败:', errorMessage);
      return [];
    }
  }

  public async searchFoodWithAmapText(
    city?: string,
    keyword?: string,
    types?: string,
    citylimit: boolean = false,
    children: number = 0,
    offset: number = 20,
    page: number = 1
  ): Promise<Restaurant[]> {
    try {
      const url = 'https://restapi.amap.com/v3/place/text';
      const params: Record<string, any> = {
        key: this.amapApiKey,
        output: 'json',
        extensions: 'all', // 返回详细信息
        offset: Math.min(offset, MapPoiService.MAX_OFFSET), // 强烈建议不超过25
        page: page,
        children: children,
        citylimit: citylimit,
      };

      // keywords 和 types 二选一必填
      if (keyword) {
        params.keywords = keyword;
      } else if (types) {
        params.types = types;
      } else {
        // 默认使用美食关键词
        params.keywords = MapPoiService.DEFAULT_KEYWORD;
      }

      // 如果指定了城市
      if (city) {
        params.city = city;
      }

      const response: AxiosResponse<AmapPoiResponse> = await axios.get(url, { params });
      
      if (response.data.status === '1' && response.data.pois) {
        return response.data.pois.map(poi => this.formatAmapPoi(poi));
      } else {
        throw new Error(`高德地图文本搜索API错误: ${response.data.info}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('高德地图文本搜索失败:', errorMessage);
      return [];
    }
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
      rating: this.amapLocationService.parseRating(poi.biz_ext?.rating),
      review_count: 0, // 高德地图API不直接返回评论数
      phone: poi.tel || '',
      opening_hours: '', // 高德地图API不直接返回营业时间
      price_range: this.amapLocationService.parsePriceRange(poi.biz_ext?.cost),
      cuisine_type: this.amapLocationService.extractCuisineType(poi.name + ' ' + (poi.type || '') + ' ' + (poi.tag || '')),
      distance: poi.distance || 0,
      image: poi.photos?.[0]?.url || '',
      platforms: ['amap'],
      source: 'amap',
      tags: this.parseAmapTags(poi.type, poi.tag),
    };
  }



  /**
   * 解析高德地图标签
   * @param type - POI类型
   * @param tag - 特色标签
   * @returns string[]
   */
  private parseAmapTags(type?: string, tag?: string): string[] {
    const tags: string[] = [];
    
    if (type) {
      // 解析POI类型，格式：大类;中类;小类
      const typeParts = type.split(';').map(part => part.trim()).filter(part => part);
      tags.push(...typeParts);
    }
    
    if (tag) {
      // 解析特色标签，格式：标签1,标签2,标签3
      const tagParts = tag.split(',').map(part => part.trim()).filter(part => part);
      tags.push(...tagParts);
    }
    
    return tags;
  }

  public async searchNearbyFood(
    coordinates: Coordinates, 
    radius: number = MapPoiService.DEFAULT_RADIUS, 
    keyword: string = MapPoiService.DEFAULT_KEYWORD, 
    platforms: string[] = MapPoiService.DEFAULT_PLATFORMS
  ): Promise<Restaurant[]> {
    try {
      // 只使用高德地图API
      if (this.amapApiKey) {
        const amapResults = await this.searchNearbyFoodWithAmap(coordinates, radius, keyword);
        return amapResults;
      } else {
        throw new Error('未配置高德地图API密钥');
      }
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


  public async searchFoodNearCurrentLocation(
    radius: number = MapPoiService.DEFAULT_RADIUS,
    keyword: string = MapPoiService.DEFAULT_KEYWORD,
    cuisineType?: string,
    platforms: string[] = MapPoiService.DEFAULT_PLATFORMS,
    poiType?: string
  ): Promise<Restaurant[]> {
    try {
      console.error('🔍 开始获取当前位置并搜索周边美食');
      
      // 获取当前位置
      const currentLocation = await this.amapLocationService.getCurrentLocationByIp();
      console.error(`📍 当前位置：${currentLocation.lat}, ${currentLocation.lng}`);
      
      // 搜索周边美食
      const results = await this.searchNearbyFood(currentLocation, radius, keyword, platforms);
      
      // 应用菜系筛选
      let filteredResults = results;
      if (cuisineType) {
        filteredResults = this.filterByCuisineType(filteredResults, cuisineType);
      }
      
      console.error(`✅ 找到 ${filteredResults.length} 家美食商家`);
      return filteredResults;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('获取当前位置并搜索美食失败:', errorMessage);
      return [];
    }
  }

  public async searchFood(
    location: string,
    radius: number = MapPoiService.DEFAULT_RADIUS,
    keyword: string = MapPoiService.DEFAULT_KEYWORD,
    cuisineType?: string,
    platforms: string[] = MapPoiService.DEFAULT_PLATFORMS,
    poiType?: string,
    cityLimit: boolean = false
  ): Promise<Restaurant[]> {
    try {
      console.error(`🔍 搜索参数：location=${location}, keyword=${keyword}, cuisineType=${cuisineType}`);
      
      // 如果是"当前位置"，直接使用当前位置搜索
      if (location === '当前位置' || location === 'current location') {
        console.error('📍 检测到当前位置搜索请求');
        return await this.searchFoodNearCurrentLocation(radius, keyword, cuisineType, platforms, poiType);
      }
      
      // 智能判断搜索策略
      const searchStrategy = this.determineSearchStrategy(location);
      console.error(`📋 搜索策略：${searchStrategy}`);

      if (searchStrategy === 'region') {
        // 区域搜索：使用高德地图文本搜索
        if (this.amapApiKey) {
          const amapResults = await this.searchFoodWithAmapText(
            location, 
            keyword, 
            poiType || cuisineType, 
            cityLimit
          );
          return amapResults;
        } else {
          throw new Error('未配置高德地图API密钥');
        }
      } else if (searchStrategy === 'coordinate') {
        // 坐标搜索：先获取坐标，再进行圆形区域搜索
        const coordinates = await this.locationService.getCoordinates(location);
        console.error(`📍 获取坐标：${coordinates.lat}, ${coordinates.lng}`);
        return await this.searchNearbyFood(coordinates, radius, keyword, platforms);
      } else {
        // 混合搜索：先尝试文本搜索，如果失败则尝试坐标搜索
        console.error(`🔄 尝试混合搜索策略`);
        
        try {
          // 先尝试高德地图文本搜索
          if (this.amapApiKey) {
            const textResults = await this.searchFoodWithAmapText(
              location, 
              keyword, 
              poiType || cuisineType, 
              cityLimit
            );
            if (textResults.length > 0) {
              console.error(`✅ 文本搜索成功，找到 ${textResults.length} 个结果`);
              return textResults;
            }
          }
        } catch (error) {
          console.error(`⚠️ 文本搜索失败，尝试坐标搜索:`, error);
        }
        
        // 如果文本搜索失败，尝试坐标搜索
        const coordinates = await this.locationService.getCoordinates(location);
        console.error(`📍 获取坐标：${coordinates.lat}, ${coordinates.lng}`);
        return await this.searchNearbyFood(coordinates, radius, keyword, platforms);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('美食搜索失败:', errorMessage);
      return [];
    }
  }

  private determineSearchStrategy(location: string): 'region' | 'coordinate' | 'mixed' {
    // 如果是坐标格式，使用坐标搜索
    if (this.locationService.isCoordinateFormat(location)) {
      return 'coordinate';
    }
    
    // 如果是"当前位置"，使用坐标搜索
    if (location === '当前位置' || location === 'current location') {
      return 'coordinate';
    }
    
    // 如果包含区域关键词，使用区域搜索
    if (location.includes('市') || location.includes('区') || location.includes('县') || 
        location.includes('省') || location.includes('自治区') || location.includes('特别行政区')) {
      return 'region';
    }
    
    // 其他情况使用混合搜索策略
    return 'mixed';
  }
}

