# lecheng-service-admin

乐城服务的 Vue 3 Web 管理后台，基于若依管理界面提供系统管理与运维入口。

## 项目简介

基于 RuoYi-Vue3 3.9.1，包含登录、注册、用户与角色授权、部门、岗位、菜单、字典、参数、通知，以及日志、在线用户、缓存和服务器监控等页面源码。通过 Axios 调用 `lecheng-service-backend` 的接口，并使用动态路由和权限指令控制访问。

当前首页为空白容器，部分导航已精简；具体可访问页面由后端菜单数据及账号权限决定。新增“乐城运营”页面，支持医院、项目、药械、资讯及医生资料的发布和下架，并可回复客服留言、处理预约咨询申请与反馈。定时任务、代码生成等保留页面的后端模块当前停用。

## 技术栈

- Vue 3.5、JavaScript、Vite 6
- Element Plus、Vue Router 4、Pinia 3
- Axios、Sass、ECharts、Quill
- SVG 图标、自动导入与构建压缩插件

当前业务源码使用 JavaScript，并非 TypeScript 项目。

## 关联仓库

| 项目 | 说明 | GitHub |
| --- | --- | --- |
| lecheng-service-backend | 后端服务与权限基础框架 | [lecheng-service-backend](https://github.com/jiangyi3265/lecheng-service-backend) |
| lecheng-service-admin | Web 管理后台 | [lecheng-service-admin](https://github.com/jiangyi3265/lecheng-service-admin) |
| lecheng-service | UniApp 用户端 / 微信小程序 / H5 | [lecheng-service](https://github.com/jiangyi3265/lecheng-service) |

三个仓库同属乐城服务项目。乐城运营数据通过后端接口同步到小程序；预约记录是咨询申请，不是医院号源。订单和支付尚未实现。用户端保留原有仓库名称和地址。

## 快速启动

准备 Node.js 20.19+ 或 22.12+ 和 npm，先按后端 README 启动 API 服务：

```bash
npm ci
cp .env.development.example .env.development
npm run dev
```

PowerShell 使用 `Copy-Item .env.development.example .env.development`。已有本地配置时复用原文件。Vite 默认监听端口 `80`，`/dev-api` 代理到 `http://localhost:8080`；端口受限时可执行 `npm run dev -- --port 5173`。以终端实际输出地址为准。

配置项 `VITE_APP_TITLE`、`VITE_APP_ENV`、`VITE_APP_BASE_API` 控制标题、环境和 API 前缀。所有 `VITE_*` 值都会进入前端包，不要放入密码、Token 或私钥。

```bash
cp .env.production.example .env.production
npm run build:prod
npm run preview
```

生产输出位于 `dist/`，部署服务器需要将 `/prod-api` 转发到后端，同时为 History 路由配置回退。预发布命令为 `npm run build:stage`，需先复制 `.env.staging.example` 并为 `/stage-api` 配置反向代理。`preview` 仅用于检查构建结果，不提供生产反向代理服务。

登录使用后端自行初始化的账号和密码。已去掉预填演示密码；“记住账号”仅保存用户名，旧密码 Cookie 会清理，不保存可逆密码。

## 项目结构

```text
src/api/          后端接口调用
src/views/        登录、系统管理、监控及工具页面
src/layout/       布局、导航、标签页
src/router/       路由配置
src/store/        Pinia 用户与权限状态
src/components/   表单、上传、字典及其他公共组件
src/directive/    权限等指令
src/utils/        请求、认证、下载等工具
src/assets/       样式、图标与图片
public/           公共静态资源
vite/             构建插件
```

## 安全与开源说明

实际 `.env.*`、依赖、构建目录与 IDE 文件不上传，仅公开无凭据示例。移除了客户端内置 RSA 私钥和保存密码的逻辑；保留的加密工具只接受调用方提供的公钥。保留若依原始 `LICENSE` 和版权声明。

## 简历描述示例

基于 Vue 3、Element Plus 和 Pinia 整理乐城服务管理后台，衔接若依认证、动态路由及系统管理接口，完成环境配置规范化，并将登录记忆功能调整为仅保存账号以避免浏览器持久化密码。
