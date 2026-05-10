# Between: A Relationship Agent

Tauri 2 + React + TypeScript（Vite）桌面应用 + Python FastAPI 后端。

**定位**：关系智能层工具。截图分析聊天内容 → 实时潜台词解读 + 回复建议 → 持续构建用户与联系人的 Persona 画像。

---

## 目录结构

```
src/
  App.tsx                        — 启动检查 + btw-navigate-onboarding CustomEvent 监听
  main.tsx                       — 路由表（/ → App, /onboarding → Onboarding, /overlay → OverlayBubble）
  lib/
    gateway.ts                   — 后端 HTTP 客户端（含 buildRelationship / compressConversation 等）
    captureStore.ts              — 全局截图分析状态 + Persona 更新计数（activeContactId）
    captureRegistry.ts           — Contact alias registry（resolveContactId / Phase A 去重）
    contextAssembler.ts          — Context 预算组装（userPersona / userMemory / contactMemory / contactPersona）
  windows/
    onboarding/Onboarding.tsx    — 四步问卷（简单/复杂模式）→ 并行生成 persona.md + memory.md + form.json
    overlay/
      OverlayBubble.tsx          — Overlay 主入口
      BubbleCollapsed.tsx        — 280×76 胶囊态
      BubbleExpanded.tsx         — 420×520 展开态
      CaptureCard.tsx            — 截图结果卡片（使用 activeContactId 读 persona/memory）
      views/
        HomeView.tsx
        CapturesView.tsx         — 截图历史 + Open Setup 按钮
        ContactDetailView.tsx    — 联系人详情 + 8 步 Persona 更新管线
        ProfileView.tsx          — 用户 Profile（Edit / Delete 按钮）
        SettingsView.tsx
    main/
      Dashboard.tsx              — Hard Rules + Identity 摘要 + 最近截图
      ContactList.tsx            — 联系人列表
      ContactDetail.tsx          — 联系人详情
      UserProfile.tsx            — 用户 persona 展示
      CapturePage.tsx            — 最近截图分析 + 潜台词 + 回复草稿
      Settings.tsx               — 后端健康状态 + 模型列表

src-tauri/src/
  capture/                       — 截图 + 活跃窗口标题（xcap + PowerShell）
  storage/                       — 文件读写命令（含原子替换、meta.json、alias 列表）
  shell/                         — Overlay 控制 + open_onboarding 命令
  lib.rs                         — 系统托盘、全局热键注册、窗口管理

backend/
  config.py                      — 四层模型列表 + 端口配置
  utils.py                       — complete_with_fallback / stream_with_fallback + LLM 日志
  main.py                        — FastAPI 应用 + /health 端点
  routers/
    perception.py                — POST /v1/perception/analyze（视觉 LLM，无状态）
    reasoning.py                 — POST /v1/reasoning/chat（低延迟，无状态）
    learning.py                  — POST /v1/learning/chat（有状态，需 confirm:true）
    intelligence.py              — POST /v1/intelligence/analyze + /pipeline + /compress + /merge + /relationship
  prompts/
    persona/user_builder.md      — Onboarding 表单 → persona.md（已内联到 Onboarding.tsx）
    persona/contact_builder.md   — 对话历史 → 联系人 persona（首次构建）
    persona/merge.md             — 增量 patch（dynamic_only / full 两种模式）
    persona/schema.md            — Persona 五层结构定义
    conversation/subtext.md      — 潜台词解读
    conversation/reply.md        — 回复建议生成（含不回复 / 表情包动态选项规则）
    conversation/updater.md      — 对话历史压缩（Learning 层证据）
    relationship/builder.md      — 联系人关系首次初始化（JSON 输出）
    relationship/updater.md      — 关系状态增量更新
    perception/analyze.md        — 视觉分析 prompt
```

### Storage 文件结构

```
{app_data}/
  user/
    persona.md       — 用户行为模型（五层结构）
    memory.md        — 用户事实性自我记忆（Core Identity / Values / Communication Facts 等）
    form.json        — Onboarding 表单原始数据（用于 Edit Profile 预填）
  contacts/{id}/
    persona.md       — 联系人画像
    memory.md        — 联系人事实性记忆（append-only）
    conversation.md  — 对话历史（按 capture block 累积）
    relationship.json — 关系状态（state / coaching_note 等）
    meta.json        — 联系人元数据（id / display_name / aliases / persona_version / capture_count）
```

---

## 架构：四层治理路由

路由分层基于**治理属性**，而非速度：

| 层 | 端点 | 状态性 | 触发方式 |
|---|---|---|---|
| Perception | `/v1/perception/analyze` | 无状态，幂等 | 热键自动触发 |
| Reasoning | `/v1/reasoning/chat` | 无状态，幂等 | Perception 完成后自动 |
| Intelligence | `/v1/intelligence/*` | 无状态，复合端点 | 前端预组装 context 后调用 |
| Learning | `/v1/learning/chat` | **有状态，写 Storage** | 用户显式确认（confirm:true）|

---

## 开发进度

| Phase | 状态 | 内容 |
|-------|------|------|
| Phase 1 | 完成 | Tauri 框架、系统托盘、全局热键、LLM Gateway |
| Phase 2 | 完成 | 截图采集（Perception Layer）、Overlay 悬浮窗、Vision 分析 |
| Phase 3 | 完成 | Onboarding 四步问卷 + Persona 生成 + 跳转 Dashboard |
| Phase 4 | 完成 | 三层路由重构 + Intelligence 复合端点 + Overlay 胶囊/展开态 |
| Phase 5 | 完成 | 主窗口 UI（Dashboard / ContactList / ContactDetail / UserProfile / CapturePage）|
| Phase 6 | 完成 | Settings 界面（后端健康状态 + 模型列表）|
| Phase 7 | 完成 | Contact 去重（alias registry）+ 8 步 Persona 管线 + user/memory.md + Onboarding 重构（简单/复杂模式）+ ProfileView Edit/Delete + 回复动态选项（不回复/表情包）|

---

## 现在可以验证的功能

### 1. 完整 Onboarding 闭环

```bash
cd backend && python main.py   # 端口 8765
cd src-tauri && npm run tauri dev              # 另一个终端
```

首次启动（无 `user/persona.md`）→ 自动进入四步问卷 → 填完提交 → 生成 persona → 跳转 `/dashboard`。

### 2. 后端健康检查

```bash
curl http://127.0.0.1:8765/health
```

预期返回：

```json
{
  "status": "ok",
  "perception_models": ["gpt-4o", "claude-3-5-sonnet-20241022"],
  "reasoning_models": ["groq/llama-3.3-70b-versatile", "gpt-4o-mini"],
  "learning_models": ["gpt-4.1", "gpt-4o-mini", ...]
}
```

Settings 页面会展示相同信息。

### 3. 截图分析（Overlay 流程）

1. 打开任意聊天应用
2. 按 **Ctrl+Shift+B**
3. Overlay 胶囊（280×76）出现，显示 `Analyzing…`
4. 分析完成后胶囊变为 `Done`，点击展开（420×520）
5. 展开界面显示：提取的消息 / 潜台词解读 / 回复建议草稿

### 4. Persona 增量更新（8 步管线）

对同一联系人分析足够多次截图后，`ContactDetailView` 出现「Update Persona」选项 → 点击 → 执行 8 步管线：
1. 读取 `conversation.md` → truncate 到 3000 token
2. `/v1/intelligence/compress` → CompressedEvidence JSON
3. `memory_updates` append 到 `memory.md`
4. 备份 `persona.md` → `versions/persona_v{N}.md`
5. `/v1/intelligence/merge`（首次 `full` 模式，后续 `dynamic_only`）
6. 原子写 `persona.tmp.md` → rename → `persona.md`
7. Prune `conversation.md`（保留最近 10 个 capture block）
8. 更新 `meta.json`（persona_version++, capture_count=0）+ 关系状态更新

### 5. LLM 日志验证

截图分析时，backend 控制台应输出：

```
[LLM] endpoint=perception model=gpt-4o tokens_in=1842 tokens_out=95 latency_ms=2341 ok=true
[LLM] endpoint=reasoning model=groq/llama-3.3-70b-versatile tokens_in=620 tokens_out=287 latency_ms=380 ok=true
```

---

## 接下来要做什么

### 可选改进：Contact Identification Phase B 细化
Phase A（alias registry）已完成，同一联系人的 OCR 名字变体自动合并。潜在后续：
- 跨平台 alias 智能合并（当前同平台自动合并，跨平台仍需手动确认）
- Alias 冲突解决 UI（当两个名字无法自动判断是否同一人时）

### 可选改进：Relationship 状态展示
- `relationship.json` 已由 8 步管线维护，但 UI 侧尚未在 ContactDetailView 中展示 coaching_note
- 关系阶段可在联系人详情页作为摘要显示

### 可选改进：Onboarding 复杂模式体验优化
- 复杂模式下生成时增加提取进度提示
- 支持多段材料分批粘贴

---

## 安装与启动

```bash
# 前端依赖
npm install

# Python 后端
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env            # 填入真实 API key
```

启动：

```bash
# 终端 1
cd backend && python main.py

# 终端 2
cd src-tauri && npm run tauri dev
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run tauri dev` | 完整桌面应用开发模式 |
| `npm run tauri build` | 打包安装包 |
| `cd backend && python main.py` | 启动 Python 后端 |
| `cd src-tauri && cargo check` | 检查 Rust 编译 |

## 推荐 IDE

VS Code + [Tauri 插件](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

---

## License

Copyright (c) 2026 IronDumpling. All rights reserved.

本项目采用 **Source-Available** 许可证。源码可查阅，但未经版权所有者书面授权，禁止使用、复制、修改、分发或部署。

授权合作请联系：irondumpling010@gmail.com

详见 [LICENSE](./LICENSE)。
