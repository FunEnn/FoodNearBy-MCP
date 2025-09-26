# foodnearby-mcp

基于 MCP 的美食搜索服务，使用高德地图API进行位置服务，帮助用户查找当前位置附近的美食餐厅。

## 🍽️ 功能特性

### 核心功能
- **🗺️ 地图POI搜索** - 通过高德地图API获取真实商家信息
- **📱 地图服务** - 集成高德地图API进行位置服务
- **📍 智能定位** - 支持地址、坐标、当前位置等多种定位方式
- **🌐 当前位置检测** - 自动通过IP定位获取用户当前位置，无需手动输入

### 搜索功能
- 按菜系类型筛选（川菜、粤菜、日料、西餐等）
- 按价格筛选（显示具体价格如¥45、¥145等）
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

### 方式1：作为MCP服务使用

1. **全局安装**
```bash
npm install -g foodnearby-mcp
```

2. **配置Cursor MCP服务**
在 `~/.cursor/mcp.json` 文件中添加配置：
```json
{
  "mcpServers": {
    "foodnearby-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "foodnearby-mcp"
      ],
      "env": {
        "AMAP_API_KEY": "your_amap_api_key"
      }
    }
  }
}
```
### 方式2：本地开发使用

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

# 高德地图API（用于地理编码和位置服务）
AMAP_API_KEY=your_amap_api_key

```

4. **构建**
```bash
npm run build
```

5. **启动服务**
```bash
npm start
```

## 🛠️ MCP工具使用

### search_map_poi - 地图POI搜索

**功能**: 通过高德地图API搜索附近的美食商家POI信息

**参数**:
- `location` (必需): 搜索位置，可以是地址、坐标或"当前位置"。使用"当前位置"将自动获取用户当前位置并搜索周边美食
- `radius` (可选): 搜索半径（米），默认1000米，建议范围：500-5000米
- `keyword` (可选): 餐饮搜索关键词，如：美食、餐厅、火锅、川菜、日料、西餐、烧烤、甜品等，默认"美食"
- `cuisine_type` (可选): 菜系类型筛选（如：川菜、粤菜、湘菜、日料、韩料、西餐、火锅、烧烤、甜品等）
- `price_range` (可选): 价格区间筛选：便宜、中等、昂贵（注意：实际返回的是具体价格如¥45、¥145等）
- `map_platforms` (可选): 地图平台选择：amap（高德地图），默认"amap"
- `poi_type` (可选): 高德地图餐饮POI类型（如：050000=餐饮服务，050100=中餐厅，050101=火锅，050102=烧烤）
- `city_limit` (可选): 是否仅返回指定城市数据（仅高德地图有效），默认false

**当前位置功能说明**：
- 当 `location` 参数设置为 `"当前位置"` 或 `"current location"` 时，服务会自动通过高德地图IP定位API获取用户当前位置
- 然后基于当前位置搜索指定半径内的美食商家
- 无需用户手动输入坐标或地址，提供更便捷的搜索体验

## 🔑 API密钥获取

### 高德地图API
1. 访问 [高德开放平台](https://lbs.amap.com/)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！