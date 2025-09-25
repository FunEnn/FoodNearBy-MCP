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

interface AmapGeocodeResponse {
  status: string;
  info: string;
  geocodes: Array<{
    location: string;
  }>;
}

export class LocationService {
  private readonly baiduApiKey: string | undefined;
  private readonly gaodeApiKey: string | undefined;

  constructor() {
    this.baiduApiKey = process.env.BAIDU_MAP_API_KEY;
    this.gaodeApiKey = process.env.GAODE_MAP_API_KEY;
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
      // 这里可以集成浏览器定位API或移动端定位
      return { lat: 39.9042, lng: 116.4074 }; // 北京天安门默认坐标
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
      if (this.gaodeApiKey) {
        return await this.geocodeWithAmap(address);
      }

      throw new Error('未配置地图API密钥');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('地理编码失败:', errorMessage);
      // 返回默认坐标
      return { lat: 39.9042, lng: 116.4074 };
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
      key: this.gaodeApiKey,
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
}


