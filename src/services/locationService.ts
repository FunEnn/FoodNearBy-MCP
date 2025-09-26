import { AmapLocationService } from './amapLocationService.js';

export interface Coordinates {
  lat: number;
  lng: number;
}

export class LocationService {
  private readonly amapLocationService: AmapLocationService;
  
  private static readonly DEFAULT_COORDINATES = { lat: 39.9042, lng: 116.4074 };
  private static readonly REGION_KEYWORDS = ['市', '县', '区', '省', '自治区', '特别行政区'];

  constructor() {
    this.amapLocationService = new AmapLocationService();
  }

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

  public isCoordinateFormat(location: string): boolean {
    const coordinateRegex = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/;
    return coordinateRegex.test(location);
  }

  public parseCoordinate(coordinate: string): Coordinates {
    const parts = coordinate.split(',').map(coord => parseFloat(coord.trim()));
    const lat = parts[0] || 0;
    const lng = parts[1] || 0;
    return { lat, lng };
  }

  public async geocodeAddress(address: string): Promise<Coordinates> {
    try {
      // 使用高德地图API
      return await this.amapLocationService.geocodeAddress(address);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('地理编码失败:', errorMessage);
      // 返回默认坐标
      return LocationService.DEFAULT_COORDINATES;
    }
  }


  public calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    return this.amapLocationService.calculateDistance(coord1, coord2);
  }

  public static isRegionSearch(location: string): boolean {
    return LocationService.REGION_KEYWORDS.some(keyword => location.includes(keyword));
  }
}
