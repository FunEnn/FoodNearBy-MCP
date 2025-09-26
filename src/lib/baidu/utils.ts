import { Coordinates } from './types';
import { CUISINE_TYPES, REGION_KEYWORDS } from './constants';

// 工具函数集合

/**
 * 计算两点间距离（米）
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371000; // 地球半径（米）
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(coord1.lat)) * Math.cos(toRadians(coord2.lat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 角度转弧度
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * 去重结果
 */
export function removeDuplicateResults<T extends { name: string; address: string; location: Coordinates }>(results: T[]): T[] {
  const seen = new Set<string>();
  return results.filter(result => {
    const key = `${result.name}|${result.address}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 解析评分
 */
export function parseRating(rating: string | number | undefined): number {
  if (!rating) return 0;
  const num = parseFloat(String(rating));
  return isNaN(num) ? 0 : Math.min(5, Math.max(0, num));
}

/**
 * 解析价格范围
 */
export function parsePriceRange(price: string | undefined): string {
  if (!price) return '中等';
  const num = parseFloat(price);
  if (isNaN(num)) return '中等';
  if (num < 30) return '便宜';
  if (num > 100) return '昂贵';
  return '中等';
}

/**
 * 提取菜系类型
 */
export function extractCuisineType(text: string): string {
  return CUISINE_TYPES.find(type => text.includes(type)) || '其他';
}

/**
 * 判断是否为区域搜索
 */
export function isRegionSearch(location: string): boolean {
  return REGION_KEYWORDS.some(keyword => location.includes(keyword));
}