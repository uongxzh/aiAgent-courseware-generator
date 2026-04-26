# aiAgent 一键生成课件智能体

一款面向教师的智能课件生成工具。粘贴授课讲义，AI 自动提取知识点、生成精美课件与语音讲解稿。无需复杂操作，一键即得专业课件。

**在线体验**: https://uongxzh.github.io/aiAgent-courseware-generator/

---

## 界面预览

![智能课件生成器界面](./screenshot_form.png)

---

## 功能特性

- **智能讲义解析**
  - 自动识别 Markdown 标题、编号章节、列表要点、粗体重点等多种格式
  - 支持自然段落智能分段，无标题也能自动分割知识点

- **双引擎生成**
  - **本地引擎**：无需任何 API Key，系统内置解析引擎直接从讲义中提取结构生成课件
  - **AI 增强引擎**：填入 DeepSeek API Key 后，AI 深度优化课件结构与讲解词

- **多样化课件页面**
  - **封面页**：精美渐变背景，展示课程主题、班级、时长
  - **目录页**：自动摘录讲义知识点，一目了然
  - **内容页**：每个知识点独立成页，要点清晰、排版优美
  - **总结页**：自动生成课堂总结与课后任务

- **讲解备注**
  - 每个页面自动生成口语化讲解词
  - 支持一键播放完整语音讲解（浏览器原生 TTS）

- **实时编辑**
  - 预览课件时可实时修改标题、内容、讲解词
  - 缩略图导航条快速切换页面

- **导出与打印**
  - 导出独立 HTML 课件（含打印样式）
  - 支持浏览器直接打印课件

---

## 快速开始

### 环境要求

- Node.js ≥ 18
- npm 或 yarn

### 本地运行

```bash
# 1. 进入项目目录
cd app

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 打开浏览器访问 http://localhost:3000
```

### 构建部署

```bash
cd app
npm run build
```

构建产物位于 `app/dist/` 目录，可部署到任意静态托管服务。

---

## 使用指南

1. **输入讲义**
   - 在文本框中粘贴授课讲义或备课笔记
   - 支持 Markdown 格式：`# 标题`、`**粗体**、`1. 列表项`、`- 要点`
   - 系统会自动识别讲义结构并提取主题

2. **填写信息**（可选）
   - 课件主题、授课班级、授课时长
   - DeepSeek API Key（可选，填入后启用 AI 增强）

3. **一键生成**
   - 点击「一键生成课件」按钮
   - 等待解析与排版完成

4. **预览与编辑**
   - 左右箭头切换页面
   - 点击「编辑内容」可实时修改
   - 点击「播放完整讲解」试听语音讲解

5. **导出使用**
   - 「导出 HTML」下载独立课件文件
   - 「打印」直接打印纸质课件

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 7 |
| 样式方案 | Tailwind CSS v3 + shadcn/ui |
| UI 组件 | 40+ shadcn/ui 组件（Button, Card, Dialog, Form 等）|
| 语音合成 | 浏览器原生 Web Speech API |
| AI 接口 | DeepSeek API (chat completions) |
| 图标库 | Lucide React |

---

## 项目结构

```
├── app/                          # 项目源代码
│   ├── src/
│   │   ├── App.tsx               # 主应用（表单/生成/预览三视图）
│   │   ├── main.tsx              # 应用入口
│   │   ├── hooks/
│   │   │   ├── useCourseware.ts  # 核心：课件生成逻辑（本地 + AI双引擎）
│   │   │   └── useSpeech.ts      # 语音合成播放控制
│   │   ├── lib/
│   │   │   └── contentParser.ts  # 讲义内容解析器
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript 类型定义
│   │   └── components/ui/        # shadcn/ui 组件库
│   ├── index.html                # HTML 入口
│   ├── vite.config.ts            # Vite 配置
│   ├── tailwind.config.js        # Tailwind 主题配置
│   └── package.json
└── screenshot_form.png           # 项目截图
```

---

## 核心模块说明

### useCourseware.ts
课件生成的核心 Hook，提供两种生成模式：
- **本地模式**：调用 `contentParser.ts` 解析讲义，通过规则匹配提取标题、列表、段落，自动生成封面、目录、内容页、总结页
- **AI 模式**：将讲义托管给 DeepSeek API，要求 AI 严格基于原文生成 JSON 格式课件

### contentParser.ts
智能讲义解析器，支持多种标题格式识别：
- Markdown 标题（`#`, `##`）
- 中文编号（`一、`, `二、`）
- 数字编号（`1.`, `2.`）
- 粗体标题（`**标题**`）
- 常见标题关键词（`教学目标`, `重点难点`, `小结` 等）

### useSpeech.ts
基于浏览器 `SpeechSynthesisUtterance` 实现的语音播放控制器，支持播放/暂停/停止，自动选择中文语音。

---

## 部署

本项目已配置 GitHub Pages 部署，访问地址：

https://uongxzh.github.io/aiAgent-courseware-generator/

如需部署到其他平台（Vercel / Netlify / Cloudflare Pages），直接将 `app/dist/` 目录上传即可。

---

## 免责声明

- 本工具仅辅助教师快速生成课件素材，生成内容请结合实际教学需求进行审核调整
- 使用 DeepSeek API 时，API Key 仅存储于浏览器本地，不会上传至任何服务器
