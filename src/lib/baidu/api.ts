import axios, { AxiosResponse } from 'axios';
import { 
  BaiduGeocodeResponse, 
  BaiduSuggestionResponse, 
  BaiduSearchResponse,
  SearchOptions 
} from './types';

/**
 * 百度地图API调用封装
 */
export class BaiduApiClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * 地理编码：地址转坐标
   */
  async geocodeAddress(address: string): Promise<BaiduGeocodeResponse> {
    const response: AxiosResponse<BaiduGeocodeResponse> = await axios.get(
      'https://api.map.baidu.com/geocoding/v2/', 
      { 
        params: { 
          address, 
          output: 'json', 
          ak: this.apiKey 
        } 
      }
    );
    return response.data;
  }

  /**
   * 建议搜索
   */
  async searchSuggestion(query: string, region: string, options: SearchOptions = {}): Promise<BaiduSuggestionResponse> {
    const params = {
      query, 
      region,
      city_limit: options.city_limit ? 'true' : 'false',
      ak: this.apiKey,
      output: options.output || 'json',
      ...options,
    };

    const response: AxiosResponse<BaiduSuggestionResponse> = await axios.get(
      'https://api.map.baidu.com/place/v2/suggestion', 
      { params }
    );
    return response.data;
  }

  /**
   * 圆形区域检索
   */
  async searchPlaceInCircle(
    query: string, 
    location: string, 
    radius: number = 1000, 
    options: SearchOptions = {}
  ): Promise<BaiduSearchResponse> {
    const params = {
      query, 
      location,
      radius: radius.toString(),
      ak: this.apiKey,
      output: 'json',
      scope: '2',
      page_size: 20,
      page_num: 0,
      coord_type: 3,
      ret_coordtype: 'gcj02ll',
      radius_limit: options.radius_limit ? 'true' : 'false',
      ...options,
    };

    const response: AxiosResponse<BaiduSearchResponse> = await axios.get(
      'https://api.map.baidu.com/place/v2/search', 
      { params }
    );
    return response.data;
  }
}
