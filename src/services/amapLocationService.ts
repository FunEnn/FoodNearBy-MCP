import axios, { AxiosResponse } from 'axios';

export interface Coordinates {
  lat: number;
  lng: number;
}

interface AmapGeocodeResponse {
  status: string;
  info: string;
  geocodes: Array<{
    location: string;
  }>;
}

export class AmapLocationService {
  private readonly amapApiKey: string | undefined;
  
  // 常量定义
  private static readonly CUISINE_TYPES = [
    '川菜', '粤菜', '湘菜', '鲁菜', '苏菜', '浙菜', '闽菜', '徽菜',
    '日料', '韩料', '西餐', '快餐', '火锅', '烧烤', '甜品', '咖啡',
    '茶饮', '面包', '蛋糕', '小吃', '面食', '米饭', '汤品'
  ];

  constructor() {
    this.amapApiKey = process.env.AMAP_API_KEY;
  }

  /**
   * 地理编码：将地址转换为坐标
   * @param address 
   * @returns Promise<Coordinates>
   */
  public async geocodeAddress(address: string): Promise<Coordinates> {
    if (!this.amapApiKey) {
      throw new Error('未配置高德地图API密钥');
    }

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
    return AmapLocationService.CUISINE_TYPES.find(type => text.includes(type)) || '其他';
  }
}
