# Between: A Relationship Agent

**定位**：关系智能层工具。截图分析聊天内容 → 实时潜台词解读 + 回复建议 → 持续构建用户与联系人的 Persona 画像。

---

## 技术栈

| 层次 | 技术 |
|------|------|
| 桌面壳 | Tauri 2（Rust）|
| Web 端 | React SPA（Vite，端口 3000）|
| 前端 UI | React + TypeScript（Vite，端口 1420）|
| 后端 API | Python FastAPI（端口 8765）|
| LLM 调用 | litellm（统一多模型 fallback）|

---

## 目录结构

```
between_toc/
├── apps/
│   ├── desktop/                   — Tauri 桌面应用
│   │   ├── src/
│   │   │   ├── App.tsx            — 启动检查 + btw-navigate-onboarding 监听
│   │   │   ├── main.tsx           — 路由表（/ /onboarding /overlay）
│   │   │   ├── lib/
│   │   │   │   ├── gateway.ts     — 后端 HTTP 客户端
│   │   │   │   ├── captureStore.ts — 全局截图状态 + Persona 更新计数
│   │   │   │   ├── contactRegistry.ts — Contact alias 去重 registry
│   │   │   │   └── contextAssembler.ts — Context 预算组装
│   │   │   └── windows/
│   │   │       ├── onboarding/    — 四步问卷（简单/复杂模式）
│   │   │       └── overlay/       — 胶囊态 + 展开态 + 联系人/Profile/Settings 视图
│   │   └── src-tauri/src/
│   │       ├── capture/           — 截图 + 活跃窗口标题（xcap + PowerShell）
│   │       ├── storage/           — 文件读写命令（含原子替换、meta.json、alias 列表）
│   │       ├── shell/             — Overlay 控制 + open_onboarding 命令
│   │       └── lib.rs             — 系统托盘、全局热键、窗口管理
│   └── web/                       — React SPA（浏览器端）
│       └── src/
│           ├── App.tsx            — 启动检查（localStorage）
│           ├── main.tsx           — 路由表（/ /onboarding /dashboard /capture /contacts/:id /profile /settings）
│           ├── lib/
│           │   ├── storage.ts     — localStorage 适配层（btw: 前缀，替代 Tauri invoke）
│           │   ├── gateway.ts     — 后端 HTTP 客户端 + uploadImageAsBase64()
│           │   ├── captureStore.ts — 同桌面端（零改动）
│           │   ├── contactRegistry.ts — invoke() 全换 storage.ts
│           │   └── contextAssembler.ts — 同桌面端（零改动）
│           └── pages/
│               ├── Onboarding.tsx — 四步问卷（同桌面端逻辑）
│               ├── Dashboard.tsx  — 首页（Identity 摘要 + 联系人列表 + 上传入口）
│               ├── CaptureUpload.tsx — 上传截图 → 分析 → 潜台词 + 回复建议
│               ├── ContactDetail.tsx — 联系人详情 + 8 步 Persona 管线
│               ├── Profile.tsx    — 用户 Profile（Edit / Delete）
│               └── Settings.tsx   — 后端健康状态
├── backend/
│   ├── config.py                  — 四层模型列表 + 端口配置
│   ├── utils.py                   — complete_with_fallback / stream_with_fallback
│   ├── main.py                    — FastAPI 应用 + /health 端点
│   ├── routers/
│   │   ├── perception.py          — POST /v1/perception/analyze（视觉 LLM，无状态）
│   │   ├── reasoning.py           — POST /v1/reasoning/chat（低延迟，无状态）
│   │   ├── learning.py            — POST /v1/learning/chat（有状态，需 confirm:true）
│   │   └── intelligence.py        — /analyze /pipeline /compress /merge /relationship
│   └── prompts/
│       ├── persona/               — user_builder / contact_builder / merge / schema
│       ├── conversation/          — subtext / reply / updater
│       ├── relationship/          — builder / updater
│       └── perception/            — analyze
└── pnpm-workspace.yaml
```

### Storage 文件结构

桌面端存储在 Tauri app data 目录；Web 端存储在 `localStorage`（键名加 `btw:` 前缀）。

```
user/
  persona.md       — 用户行为模型（五层结构）
  memory.md        — 用户事实性自我记忆
  form.json        — Onboarding 表单原始数据（Edit Profile 预填用）
contacts/{id}/
  persona.md       — 联系人画像
  memory.md        — 联系人事实性记忆（append-only）
  conversation.md  — 对话历史（按 capture block 累积）
  relationship.json — 关系状态（state / coaching_note 等）
  meta.json        — 联系人元数据（id / display_name / aliases / persona_version / capture_count）
```

---

## 架构：四层治理路由

| 层 | 端点 | 状态性 | 触发方式 |
|---|---|---|---|
| Perception | `/v1/perception/analyze` | 无状态，幂等 | 桌面端：热键；Web 端：手动上传 |
| Reasoning | `/v1/reasoning/chat` | 无状态，幂等 | Perception 完成后自动 |
| Intelligence | `/v1/intelligence/*` | 无状态，复合端点 | 前端预组装 context 后调用 |
| Learning | `/v1/learning/chat` | **有状态，写 Storage** | 用户显式确认（confirm:true）|

---

## 开发进度

| Phase | 状态 | 内容 |
|-------|------|------|
| Phase 1 | 完成 | Tauri 框架、系统托盘、全局热键、LLM Gateway |
| Phase 2 | 完成 | 截图采集（Perception Layer）、Overlay 悬浮窗、Vision 分析 |
| Phase 3 | 完成 | Onboarding 四步问卷 + Persona 生成 |
| Phase 4 | 完成 | 四层路由重构 + Intelligence 复合端点 + Overlay 胶囊/展开态 |
| Phase 5 | 完成 | 主窗口 UI（Dashboard / ContactList / ContactDetail / UserProfile / CapturePage）|
| Phase 6 | 完成 | Settings 界面 + 后端健康状态 + 模型列表 |
| Phase 7 | 完成 | Contact 去重（alias registry）+ 8 步 Persona 管线 + user/memory.md + Onboarding 重构 + ProfileView Edit/Delete |
| Phase 8 | 完成 | Web 端（pnpm monorepo + localStorage 适配层 + 全功能 React SPA）|

---

## 安装与启动

```bash
# 安装所有依赖（根目录）
pnpm install

# Python 后端
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env            # 填入真实 API key
```

### 桌面端（Tauri）

```bash
# 终端 1
cd backend && python main.py

# 终端 2
pnpm --filter btw-desktop tauri dev
```

首次启动（无 `user/persona.md`）→ 自动进入 Onboarding 四步问卷。之后按 **Ctrl+Shift+B** 触发截图分析。

### Web 端

```bash
# 终端 1
cd backend && python main.py

# 终端 2
pnpm --filter btw-web dev
# → http://localhost:3000
```

首次访问（localStorage 无数据）→ 自动跳转 `/onboarding`。完成后进入 `/dashboard`，点击「上传截图」开始分析。

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm --filter btw-desktop tauri dev` | 桌面应用开发模式 |
| `pnpm --filter btw-desktop tauri build` | 打包桌面安装包 |
| `pnpm --filter btw-web dev` | Web 端开发模式（localhost:3000）|
| `cd backend && python main.py` | 启动 Python 后端（端口 8765）|
| `cd apps/desktop/src-tauri && cargo check` | 检查 Rust 编译 |

---

## License

Copyright (c) 2026 IronDumpling. All rights reserved.

本项目采用 **Source-Available** 许可证。源码可查阅，但未经版权所有者书面授权，禁止使用、复制、修改、分发或部署。

授权合作请联系：irondumpling010@gmail.com

详见 [LICENSE](./LICENSE)。
