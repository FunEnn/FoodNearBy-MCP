// 百度地图API相关类型定义

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BaiduGeocodeResponse {
  status: number;
  message: string;
  result?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface BaiduSuggestionItem {
  name: string;
  location: { lat: number; lng: number };
  uid: string;
  province: string;
  city: string;
  district: string;
  town: string;
  town_code: string;
  business: string;
  cityid: number;
  tag: string;
  address: string;
  children?: Array<{ uid: string; name: string; show_name: string }>;
}

export interface BaiduSuggestionResponse {
  status: number;
  message: string;
  result?: BaiduSuggestionItem[];
}

export interface BaiduSearchResultItem {
  name: string;
  location: { lat: string; lng: string };
  address: string;
  province: string;
  city: string;
  area: string;
  street_id: string;
  detail: number;
  uid: string;
  photo?: { photo_reference: string; photo_url: string };
}

export interface BaiduSearchResponse {
  status: number;
  message: string;
  result?: {
    Q: string;
    total: number;
    page_size: number;
    page_num: number;
    results: BaiduSearchResultItem[];
  };
}

export interface FoodSearchResult {
  name: string;
  address: string;
  location: Coordinates;
  rating: number;
  phone: string;
  opening_hours: string;
  price_range: string;
  cuisine_type: string;
  tags: string[];
  distance?: number;
}

export interface SearchOptions {
  city_limit?: boolean;
  output?: string;
  scope?: string;
  page_size?: number;
  page_num?: number;
  coord_type?: number;
  ret_coordtype?: string;
  radius_limit?: boolean;
  filter?: string;
  [key: string]: any;
}