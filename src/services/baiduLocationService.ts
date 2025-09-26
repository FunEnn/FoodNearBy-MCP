import { 
  Coordinates, 
  BaiduApiClient, 
  FoodSearchResult,
  SearchOptions,
  DEFAULT_SEARCH_OPTIONS,
  DEFAULT_RADIUS,
  MAX_RESULTS,
  calculateDistance,
  removeDuplicateResults,
  parseRating,
  parsePriceRange,
  extractCuisineType,
  isRegionSearch
} from '../lib/baidu';


export class BaiduLocationService {
  private readonly apiClient: BaiduApiClient | null;

  constructor() {
    const apiKey = process.env.BAIDU_MAP_API_KEY;
    this.apiClient = apiKey ? new BaiduApiClient(apiKey) : null;
  }

  // 地理编码：地址转坐标
  public async geocodeAddress(address: string): Promise<Coordinates> {
    if (!this.apiClient) throw new Error('未配置百度地图API密钥');

    const response = await this.apiClient.geocodeAddress(address);
    
    if (response.status === 0 && response.result) {
      const { lat, lng } = response.result.location;
      return { lat, lng };
    }
    throw new Error(`百度地图API错误: ${response.message}`);
  }

  // 建议搜索
  public async searchSuggestion(query: string, region: string, options: SearchOptions = {}) {
    if (!this.apiClient) throw new Error('未配置百度地图API密钥');

    const response = await this.apiClient.searchSuggestion(query, region, options);
    
    if (response.status === 0 && response.result) {
      return response.result;
    }
    throw new Error(`百度地图建议搜索API错误: ${response.message}`);
  }

  // 圆形区域检索
  public async searchPlaceInCircle(query: string, location: string, radius: number = DEFAULT_RADIUS, options: SearchOptions = {}) {
    if (!this.apiClient) throw new Error('未配置百度地图API密钥');

    const response = await this.apiClient.searchPlaceInCircle(query, location, radius, options);
    
    if (response.status === 0 && response.result) {
      return response.result;
    }
    throw new Error(`百度地图圆形区域检索API错误: ${response.message}`);
  }



  // 区域美食搜索
  public async searchFoodInRegion(region: string, keyword: string = '美食', cuisineType?: string) {
    try {
      console.error(`🔍 区域搜索：region=${region}, keyword=${keyword}, cuisineType=${cuisineType}`);
      
      // 如果是具体地址，先尝试坐标搜索
      if (!isRegionSearch(region)) {
        console.error(`📍 检测到具体地址，尝试坐标搜索`);
        try {
          const coordinates = await this.geocodeAddress(region);
          console.error(`✅ 获取坐标成功：${coordinates.lat}, ${coordinates.lng}`);
          
          const nearbyResults = await this.searchFoodNearby(coordinates, keyword, 2000, cuisineType);
          return nearbyResults.map(result => ({
            name: result.name,
            address: result.address,
            location: result.location,
            rating: result.rating,
            phone: result.phone || '',
            opening_hours: result.opening_hours || '',
            price_range: result.price_range || '中等',
            cuisine_type: result.cuisine_type || '其他',
            tags: result.tags || [],
          }));
        } catch (error) {
          console.error(`⚠️ 坐标搜索失败，尝试区域搜索:`, error);
        }
      }
      
      // 建议搜索获取坐标点
      const suggestionOptions: SearchOptions = { city_limit: true, coord_type: 3, ret_coordtype: '3', output: 'json' };
      console.error(`🔍 尝试建议搜索：region=${region}, keyword=${keyword}`);
      const suggestionResults = await this.searchSuggestion(keyword, region, suggestionOptions);
      
      if (!suggestionResults || suggestionResults.length === 0) return [];

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

      // 使用第一个坐标点进行圆形区域搜索
      if (coordinates.length > 0) {
        const firstCoord = coordinates[0];
        if (firstCoord) {
          const coordLocation = { lat: firstCoord.lat, lng: firstCoord.lng };
          
          console.error(`📍 使用坐标点进行圆形区域搜索：${firstCoord.name}`);
          const nearbyResults = await this.searchFoodNearby(coordLocation, keyword, 2000, cuisineType);
          
          return nearbyResults.map(result => ({
            name: result.name,
            address: result.address,
            location: result.location,
            rating: result.rating,
            phone: result.phone || '',
            opening_hours: result.opening_hours || '',
            price_range: result.price_range || '中等',
            cuisine_type: result.cuisine_type || '其他',
            tags: result.tags || [],
          }));
        }
      }

      return [];
    } catch (error) {
      console.error('区域美食搜索失败:', error);
      return [];
    }
  }

  // 附近美食搜索
  public async searchFoodNearby(coordinates: Coordinates, keyword: string = '美食', radius: number = DEFAULT_RADIUS, cuisineType?: string): Promise<FoodSearchResult[]> {
    try {
      const searchQuery = cuisineType ? `${keyword} ${cuisineType}` : keyword;
      const locationStr = `${coordinates.lat},${coordinates.lng}`;
      
      const searchResult = await this.searchPlaceInCircle(searchQuery, locationStr, radius, DEFAULT_SEARCH_OPTIONS);
      
      if (!searchResult || !searchResult.results || searchResult.results.length === 0) return [];

      const mappedResults: FoodSearchResult[] = searchResult.results.map(poi => {
        const poiLocation = { lat: parseFloat(poi.location.lat), lng: parseFloat(poi.location.lng) };
        const distance = calculateDistance(coordinates, poiLocation);
        
        return {
          name: poi.name,
          address: poi.address,
          location: poiLocation,
          rating: 4.0,
          price_range: '中等',
          cuisine_type: extractCuisineType(poi.name),
          tags: [],
          distance: Math.round(distance),
          phone: '',
          opening_hours: '',
        };
      });

      const uniqueResults = removeDuplicateResults(mappedResults);
      return uniqueResults
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, MAX_RESULTS);
    } catch (error) {
      console.error('附近美食搜索失败:', error);
      return [];
    }
  }


  // 计算距离（保留向后兼容性）
  public calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    return calculateDistance(coord1, coord2);
  }

  // 去重（保留向后兼容性）
  public removeDuplicateResults<T extends { name: string; address: string; location: Coordinates }>(results: T[]): T[] {
    return removeDuplicateResults(results);
  }

  // 解析评分（保留向后兼容性）
  public parseRating(rating: string | number | undefined): number {
    return parseRating(rating);
  }

  // 解析价格（保留向后兼容性）
  public parsePriceRange(price: string | undefined): string {
    return parsePriceRange(price);
  }

  // 提取菜系（保留向后兼容性）
  public extractCuisineType(text: string): string {
    return extractCuisineType(text);
  }

  // 判断区域搜索（保留向后兼容性）
  public static isRegionSearch(location: string): boolean {
    return isRegionSearch(location);
  }
}
