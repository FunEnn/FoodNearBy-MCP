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

interface AmapIpLocationResponse {
  status: string;
  info: string;
  infocode: string;
  province: string;
  city: string;
  adcode: string;
  rectangle: string;
}

interface AmapNearbySearchResponse {
  status: string;
  info: string;
  count: string;
  pois: Array<{
    id: string;
    name: string;
    type: string;
    typecode: string;
    address: string;
    location: string;
    distance: number;
    tel?: string;
    tag?: string;
    biz_ext?: {
      rating?: string;
      cost?: string;
    };
    photos?: Array<{
      title: string;
      url: string;
    }>;
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

  public async getCurrentLocationByIp(): Promise<Coordinates> {
    if (!this.amapApiKey) {
      throw new Error('未配置高德地图API密钥');
    }

    const url = 'https://restapi.amap.com/v3/ip';
    const params = {
      key: this.amapApiKey,
      output: 'json',
    };

    const response: AxiosResponse<AmapIpLocationResponse> = await axios.get(url, { params });
    
    if (response.data.status === '1' && response.data.rectangle) {
      // rectangle格式：左下角经度,左下角纬度;右上角经度,右上角纬度
      const parts = response.data.rectangle.split(';');
      if (parts.length >= 2 && parts[0] && parts[1]) {
        const bottomLeft = parts[0].split(',');
        const topRight = parts[1].split(',');
        if (bottomLeft.length >= 2 && topRight.length >= 2) {
          const lng = (parseFloat(bottomLeft[0] || '0') + parseFloat(topRight[0] || '0')) / 2;
          const lat = (parseFloat(bottomLeft[1] || '0') + parseFloat(topRight[1] || '0')) / 2;
          return { lat, lng };
        }
      }
    }
    
    // 如果没有精确坐标，直接报错
    throw new Error(`高德地图IP定位API无法获取精确坐标: ${response.data.info}`);
  }

  public async searchNearbyFood(
    coordinates: Coordinates,
    radius: number = 1000,
    keyword: string = '美食',
    types?: string
  ): Promise<Array<any>> {
    if (!this.amapApiKey) {
      throw new Error('未配置高德地图API密钥');
    }

    const url = 'https://restapi.amap.com/v3/place/around';
    const params: Record<string, any> = {
      key: this.amapApiKey,
      location: `${coordinates.lng},${coordinates.lat}`,
      radius: radius,
      output: 'json',
      extensions: 'all',
      page: 1,
      offset: 20,
    };

    // keywords 和 types 二选一必填
    if (keyword) {
      params.keywords = keyword;
    } else if (types) {
      params.types = types;
    } else {
      params.keywords = '美食';
    }

    const response: AxiosResponse<AmapNearbySearchResponse> = await axios.get(url, { params });
    
    if (response.data.status === '1' && response.data.pois) {
      return response.data.pois.map(poi => {
        const poiLocation = {
          lat: parseFloat(poi.location.split(',')[1] || '0'),
          lng: parseFloat(poi.location.split(',')[0] || '0'),
        };
        
        // 使用我们自己的精确距离计算方法
        const calculatedDistance = this.calculateDistance(coordinates, poiLocation);
        
        return {
          id: poi.id,
          name: poi.name,
          address: poi.address,
          location: poiLocation,
          distance: Math.round(calculatedDistance), // 四舍五入到米
          phone: poi.tel || '',
          rating: this.parseRating(poi.biz_ext?.rating),
          price_range: this.parsePriceRange(poi.biz_ext?.cost),
          cuisine_type: this.extractCuisineType(poi.name + ' ' + (poi.type || '') + ' ' + (poi.tag || '')),
          image: poi.photos?.[0]?.url || '',
          tags: typeof poi.tag === 'string' ? poi.tag.split(',') : [],
          type: poi.type,
          typecode: poi.typecode,
        };
      }).sort((a, b) => a.distance - b.distance); // 按距离排序
    } else {
      throw new Error(`高德地图周边搜索API错误: ${response.data.info}`);
    }
  }

  public calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    // 对于短距离，使用高精度平面距离计算
    const latDiff = coord2.lat - coord1.lat;
    const lngDiff = coord2.lng - coord1.lng;
    
    // 计算基础距离
    const latMeters = latDiff * 111320; // 1度纬度约111320米
    const avgLat = (coord1.lat + coord2.lat) / 2;
    const lngMeters = lngDiff * 111320 * Math.cos(this.toRadians(avgLat));
    
    const distance = Math.sqrt(latMeters * latMeters + lngMeters * lngMeters);
    
    // 对于长距离，应用地球曲率修正
    if (distance > 1000) {
      // 使用改进的Haversine公式进行修正
      const R = 6371000; // 地球平均半径（米）
      const lat1 = this.toRadians(coord1.lat);
      const lat2 = this.toRadians(coord2.lat);
      const deltaLat = this.toRadians(coord2.lat - coord1.lat);
      const deltaLng = this.toRadians(coord2.lng - coord1.lng);
      
      const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const haversineDistance = R * c;
      
      // 取两种方法的平均值，提高准确性
      return (distance + haversineDistance) / 2;
    }
    
    return distance;
  }

  /**
   * Haversine公式计算距离（备选方法）
   * @param coord1 
   * @param coord2 
   * @returns number
   */
  private calculateDistanceHaversine(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371000; // 地球半径（米）
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLng = this.toRadians(coord2.lng - coord1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(coord1.lat)) * Math.cos(this.toRadians(coord2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  public parseRating(rating: string | number | undefined): number {
    if (!rating) return 0;
    const num = parseFloat(String(rating));
    return isNaN(num) ? 0 : Math.min(5, Math.max(0, num));
  }

  public parsePriceRange(price: string | undefined): string {
    if (!price) return '价格未知';
    const num = parseFloat(price);
    if (isNaN(num)) return '价格未知';
    return `¥${num.toFixed(0)}`;
  }

  public extractCuisineType(text: string): string {
    return AmapLocationService.CUISINE_TYPES.find(type => text.includes(type)) || '其他';
  }
}
