// 百度地图服务常量定义

export const REGION_KEYWORDS = ['市', '县', '区', '省', '自治区', '特别行政区'];

export const CUISINE_TYPES = [
  '川菜', '粤菜', '湘菜', '鲁菜', '苏菜', '浙菜', '闽菜', '徽菜',
  '日料', '韩料', '西餐', '快餐', '火锅', '烧烤', '甜品', '咖啡',
  '茶饮', '面包', '蛋糕', '小吃', '面食', '米饭', '汤品'
];

export const DEFAULT_SEARCH_OPTIONS = {
  scope: '2',
  page_size: 20,
  page_num: 0,
  coord_type: 3,
  ret_coordtype: 'gcj02ll',
  radius_limit: true,
  output: 'json',
  filter: 'industry_type:cater|sort_name:distance|sort_rule:0',
};

export const DEFAULT_RADIUS = 1000;
export const MAX_RESULTS = 20;