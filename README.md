# 光曜塑肤 PWA

面向 iPhone 主屏幕安装的本地优先经营管理应用，包含首页、预约、登记和收支四个板块。

线上地址：https://1578947291.github.io/guangyaoskin/

## 技术栈

- React + TypeScript + Vite
- Dexie / IndexedDB 本地持久化
- 原生 Service Worker 离线缓存
- Lucide React 图标

所有业务数据默认只保存在当前浏览器和设备中，不上传服务器。收支页面提供完整 JSON 备份和覆盖恢复功能。

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run preview
```

生产环境必须通过 HTTPS 部署，Service Worker 和主屏幕安装才能正常工作。构建产物位于 `dist/`，可部署到任意静态托管服务。

## iPhone 安装

1. 使用 Safari 打开部署后的 HTTPS 地址。
2. 点击 Safari 的共享按钮。
3. 选择“添加到主屏幕”。

## 数据说明

- 清理 Safari 网站数据会删除 IndexedDB 数据。
- 更换手机或浏览器前，应在收支页面生成 JSON 备份。
- 恢复备份会覆盖当前设备中的预约、顾客和收支数据。
