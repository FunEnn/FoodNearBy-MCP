import { BaiduLocationService } from './baiduLocationService.js';
import { AmapLocationService } from './amapLocationService.js';

export interface Coordinates {
  lat: number;
  lng: number;
}

export class LocationService {
  private readonly baiduLocationService: BaiduLocationService;
  private readonly amapLocationService: AmapLocationService;
  
  // 常量定义
  private static readonly DEFAULT_COORDINATES = { lat: 39.9042, lng: 116.4074 }; // 北京天安门
  private static readonly REGION_KEYWORDS = ['市', '县', '区', '省', '自治区', '特别行政区'];

  constructor() {
    this.baiduLocationService = new BaiduLocationService();
    this.amapLocationService = new AmapLocationService();
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
      try {
        return await this.baiduLocationService.geocodeAddress(address);
      } catch (baiduError) {
        console.warn('百度地图地理编码失败，尝试高德地图:', baiduError);
        // 备用高德地图API
        return await this.amapLocationService.geocodeAddress(address);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('地理编码失败:', errorMessage);
      // 返回默认坐标
      return LocationService.DEFAULT_COORDINATES;
    }
  }


  /**
   * 计算两点间距离（米）
   * @param coord1 
   * @param coord2 
   * @returns number
   */
  public calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    return this.baiduLocationService.calculateDistance(coord1, coord2);
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
