import axios, { AxiosResponse } from 'axios';
import { Coordinates, LocationService } from './locationService.js';
import { BaiduLocationService } from './baiduLocationService.js';
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
  private readonly baiduApiKey: string | undefined;
  private readonly amapApiKey: string | undefined;
  private readonly locationService: LocationService;
  private readonly baiduLocationService: BaiduLocationService;
  private readonly amapLocationService: AmapLocationService;

  // 常量定义
  private static readonly DEFAULT_RADIUS = 1000;
  private static readonly DEFAULT_KEYWORD = '美食';
  private static readonly DEFAULT_PLATFORMS = ['baidu', 'amap'];
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
    this.baiduApiKey = process.env.BAIDU_MAP_API_KEY;
    this.amapApiKey = process.env.AMAP_API_KEY;
    this.locationService = new LocationService();
    this.baiduLocationService = new BaiduLocationService();
    this.amapLocationService = new AmapLocationService();
  }

  /**
   * 通过百度地图API搜索附近的美食商家（使用圆形区域检索）
   * @param coordinates - 坐标
   * @param radius - 搜索半径（米）
   * @param keyword - 搜索关键词
   * @returns Promise<Restaurant[]>
   */
  public async searchNearbyFoodWithBaidu(
    coordinates: Coordinates, 
    radius: number = MapPoiService.DEFAULT_RADIUS, 
    keyword: string = MapPoiService.DEFAULT_KEYWORD
  ): Promise<Restaurant[]> {
    try {
      // 使用百度地图圆形区域检索API
      const searchResults = await this.baiduLocationService.searchFoodNearby(coordinates, keyword, radius);
      
      return searchResults.map((poi, index) => ({
        id: `baidu_circle_${index}`,
        name: poi.name,
        address: poi.address,
        location: poi.location,
        rating: poi.rating,
        review_count: 0, // 圆形区域检索API可能不返回评论数
        phone: poi.phone || '',
        opening_hours: poi.opening_hours || '',
        price_range: poi.price_range || '中等',
        cuisine_type: poi.cuisine_type || '其他',
        distance: poi.distance || 0,
        image: '',
        platforms: ['baidu_map'],
        source: 'baidu_circle_search',
        tags: poi.tags || [],
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('百度地图POI搜索失败:', errorMessage);
      return [];
    }
  }

  /**
   * 通过高德地图API搜索附近的美食商家（周边搜索）
   * @param coordinates - 坐标
   * @param radius - 搜索半径（米）
   * @param keyword - 搜索关键词
   * @returns Promise<Restaurant[]>
   */
  public async searchNearbyFoodWithAmap(
    coordinates: Coordinates, 
    radius: number = MapPoiService.DEFAULT_RADIUS, 
    keyword: string = MapPoiService.DEFAULT_KEYWORD
  ): Promise<Restaurant[]> {
    try {
      const url = 'https://restapi.amap.com/v3/place/around';
    const params = {
      key: this.amapApiKey,
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
   * 通过高德地图API进行文本搜索美食商家
   * @param city - 城市名称（可选）
   * @param keyword - 搜索关键词（可选）
   * @param types - POI类型（可选）
   * @param citylimit - 是否仅返回指定城市数据
   * @param children - 是否按照层级展示子POI数据
   * @param offset - 每页记录数据
   * @param page - 当前页数
   * @returns Promise<Restaurant[]>
   */
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
      rating: this.baiduLocationService.parseRating(poi.detail_info?.overall_rating),
      review_count: this.parseBaiduReviewCount(poi.detail_info?.comment_num),
      phone: poi.detail_info?.phone || '',
      opening_hours: poi.detail_info?.opening_time || '',
      price_range: this.baiduLocationService.parsePriceRange(poi.detail_info?.price),
      cuisine_type: this.baiduLocationService.extractCuisineType(poi.name + ' ' + (poi.detail_info?.tag || '')),
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
    radius: number = MapPoiService.DEFAULT_RADIUS, 
    keyword: string = MapPoiService.DEFAULT_KEYWORD, 
    platforms: string[] = MapPoiService.DEFAULT_PLATFORMS
  ): Promise<Restaurant[]> {
    const results: Restaurant[] = [];

    try {
      // 使用百度地图API
      if (platforms.includes('baidu') && this.baiduApiKey) {
        const baiduResults = await this.searchNearbyFoodWithBaidu(coordinates, radius, keyword);
        results.push(...baiduResults);
      }

      // 使用高德地图API
      if (platforms.includes('amap') && this.amapApiKey) {
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

  /**
   * 搜索指定区域的美食（使用百度地图区域搜索API）
   * @param region - 搜索区域（如：北京市）
   * @param keyword - 搜索关键词（如：美食、餐厅）
   * @param cuisineType - 菜系类型（可选）
   * @returns Promise<Restaurant[]>
   */
  public async searchFoodInRegion(
    region: string,
    keyword: string = MapPoiService.DEFAULT_KEYWORD,
    cuisineType?: string
  ): Promise<Restaurant[]> {
    try {
      const regionResults = await this.baiduLocationService.searchFoodInRegion(region, keyword, cuisineType);
      
      return regionResults.map((poi, index) => ({
        id: `region_${index}`,
        name: poi.name,
        address: poi.address,
        location: poi.location,
        rating: poi.rating,
        review_count: 0, // 区域搜索API可能不返回评论数
        phone: poi.phone || '',
        opening_hours: poi.opening_hours || '',
        price_range: poi.price_range || '中等',
        cuisine_type: poi.cuisine_type || '其他',
        distance: 0, // 区域搜索不提供距离信息
        image: '',
        platforms: ['baidu_map'],
        source: 'baidu_region_search',
        tags: poi.tags || [],
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('区域美食搜索失败:', errorMessage);
      return [];
    }
  }

  /**
   * 综合搜索美食（支持坐标搜索和区域搜索）
   * @param location - 位置信息（坐标、地址或区域名称）
   * @param radius - 搜索半径（米，仅用于坐标搜索）
   * @param keyword - 搜索关键词
   * @param cuisineType - 菜系类型
   * @param platforms - 要使用的平台
   * @param poiType - 高德地图POI类型（可选）
   * @param cityLimit - 是否仅返回指定城市数据（可选）
   * @returns Promise<Restaurant[]>
   */
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
      
      // 智能判断搜索策略
      const searchStrategy = this.determineSearchStrategy(location);
      console.error(`📋 搜索策略：${searchStrategy}`);

      if (searchStrategy === 'region') {
        // 区域搜索：直接使用location作为region参数
        const results: Restaurant[] = [];
        
        // 百度地图区域搜索
        if (platforms.includes('baidu')) {
          const baiduResults = await this.searchFoodInRegion(location, keyword, cuisineType);
          results.push(...baiduResults);
        }
        
        // 高德地图文本搜索
        if (platforms.includes('amap') && this.amapApiKey) {
          const amapResults = await this.searchFoodWithAmapText(
            location, 
            keyword, 
            poiType || cuisineType, 
            cityLimit
          );
          results.push(...amapResults);
        }
        
        return this.deduplicateAndSort(results);
      } else if (searchStrategy === 'coordinate') {
        // 坐标搜索：先获取坐标，再进行圆形区域搜索
        const coordinates = await this.locationService.getCoordinates(location);
        console.error(`📍 获取坐标：${coordinates.lat}, ${coordinates.lng}`);
        return await this.searchNearbyFood(coordinates, radius, keyword, platforms);
      } else {
        // 混合搜索：先尝试区域搜索，如果失败则尝试坐标搜索
        console.error(`🔄 尝试混合搜索策略`);
        
        try {
          // 先尝试区域搜索
          const regionResults = await this.searchFoodInRegion(location, keyword, cuisineType);
          if (regionResults.length > 0) {
            console.error(`✅ 区域搜索成功，找到 ${regionResults.length} 个结果`);
            return regionResults;
          }
        } catch (error) {
          console.error(`⚠️ 区域搜索失败，尝试坐标搜索:`, error);
        }
        
        // 如果区域搜索失败，尝试坐标搜索
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

  /**
   * 智能判断搜索策略
   * @param location - 位置信息
   * @returns 搜索策略：'region' | 'coordinate' | 'mixed'
   */
  private determineSearchStrategy(location: string): 'region' | 'coordinate' | 'mixed' {
    // 如果包含区域关键词，使用区域搜索
    if (BaiduLocationService.isRegionSearch(location)) {
      return 'region';
    }
    
    // 如果是坐标格式，使用坐标搜索
    if (this.locationService.isCoordinateFormat(location)) {
      return 'coordinate';
    }
    
    // 如果是"当前位置"，使用坐标搜索
    if (location === '当前位置' || location === 'current location') {
      return 'coordinate';
    }
    
    // 其他情况使用混合搜索策略
    return 'mixed';
  }
}

