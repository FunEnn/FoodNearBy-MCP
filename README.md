# @foodnearby/mcp-server

基于 Model Context Protocol (MCP) 的美食搜索服务，使用百度地图和高德地图API进行位置服务，帮助用户查找当前位置附近的美食餐厅。

## 🍽️ 功能特性

### 核心功能
- **🗺️ 地图POI搜索** - 通过百度地图、高德地图API获取真实商家信息
- **📱 地图服务** - 集成百度地图、高德地图API进行位置服务
- **📍 智能定位** - 支持地址、坐标、当前位置等多种定位方式

### 搜索功能
- 按菜系类型筛选（川菜、粤菜、日料、西餐等）
- 按价格区间筛选（便宜、中等、昂贵）
- 按配送距离排序
- 按评分排序

### 数据功能
- 真实商家信息获取
- 评分和评论数据
- 营业时间和联系方式
- 商家分类和标签

## 🚀 快速开始

### 环境要求
- Node.js >= 18

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/FunEnn/FoodNearBy-MCP.git
cd FoodNearBy-MCP
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env
```

编辑 `.env` 文件，填入你的API密钥：
```env
# 百度地图API（用于地理编码和位置服务）
BAIDU_MAP_API_KEY=your_baidu_map_api_key

# 高德地图API（备用位置服务）
GAODE_MAP_API_KEY=your_gaode_map_api_key

# 服务端口
PORT=3000
```

4. **编译TypeScript**
```bash
npm run build
```

5. **启动服务**
```bash
npm start
```

或开发模式：
```bash
npm run dev
```

或编译并运行：
```bash
npm run dev:run
```

## 🛠️ API 工具

### 1. 地图POI搜索
```javascript
search_map_poi({
  location: "北京市朝阳区三里屯",
  radius: 1000,
  keyword: "美食",
  cuisine_type: "川菜",
  price_range: "中等",
  map_platforms: ["baidu", "amap"]
})
```

## 📋 使用示例

### 基本搜索
```javascript
// 搜索附近美食
search_map_poi({
  location: "上海市黄浦区南京路",
  radius: 500,
  keyword: "美食"
})
```

### 高级搜索
```javascript
// 搜索特定菜系
search_map_poi({
  location: "广州市天河区",
  keyword: "粤菜",
  cuisine_type: "粤菜",
  price_range: "中等"
})
```

### 坐标搜索
```javascript
// 使用坐标搜索
search_map_poi({
  location: "39.9042,116.4074",
  radius: 2000,
  keyword: "火锅"
})
```

### 当前位置搜索
```javascript
// 当前位置搜索
search_map_poi({
  location: "当前位置",
  keyword: "咖啡",
  price_range: "便宜"
})
```

## 🔑 API密钥获取

### 百度地图API
1. 访问 [百度地图开放平台](https://lbsyun.baidu.com/)
### 高德地图API
1. 访问 [高德开放平台](https://lbs.amap.com/)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！