# project-btw

Tauri 2 + React + TypeScript（Vite）桌面应用 + Python FastAPI 后端。

**定位**：关系智能层工具。截图分析聊天内容 → 实时潜台词解读 + 回复建议 → 持续构建用户与联系人的 Persona 画像。

---

## 目录结构

```
src/
  App.tsx                        — 启动检查：有 persona → /dashboard，无 → /onboarding
  main.tsx                       — 路由表（所有页面懒加载）
  components/
    NavSidebar.tsx               — 主窗口左侧导航
  lib/
    gateway.ts                   — 后端 HTTP 客户端（治理分层：perception/reasoning/learning）
    captureStore.ts              — 全局截图分析状态 + H3 Persona 更新计数
    contextAssembler.ts          — H2 Context 预算组装（防 context rot）
  windows/
    onboarding/Onboarding.tsx    — 四步问卷 → 生成 user/persona.md → 跳转 /dashboard
    overlay/
      OverlayBubble.tsx          — Overlay 入口：监听热键事件，管理胶囊/展开状态
      BubbleCollapsed.tsx        — 280×76 胶囊态 UI
      BubbleExpanded.tsx         — 420×520 展开态：Subtext + 回复建议 + Persona 更新 Badge
    main/
      Dashboard.tsx              — Hard Rules + Identity 摘要 + 最近截图
      ContactList.tsx            — 联系人列表（读取 contacts/*.md）
      ContactDetail.tsx          — 联系人详情 + 增量 Persona 更新（H3 原子写）
      UserProfile.tsx            — 用户 persona 展示 + 跳转重建
      CapturePage.tsx            — 最近截图分析 + 潜台词 + 回复草稿 + Persona Badge
      Settings.tsx               — 后端健康状态 + 模型列表

src-tauri/src/
  capture/                       — 截图 + 活跃窗口标题（xcap + PowerShell）
  storage/                       — MD 文件读写，含 rename_file（原子替换）
  shell/                         — Overlay 窗口控制，含 resize_overlay
  lib.rs                         — 系统托盘、全局热键注册

backend/
  config.py                      — 三层模型列表 + Context Budget 常量
  utils.py                       — complete_with_fallback / stream_with_fallback + H1 LLM 日志
  main.py                        — FastAPI 应用 + /health 端点
  routers/
    perception.py                — POST /v1/perception/analyze（视觉 LLM，无状态）
    reasoning.py                 — POST /v1/reasoning/chat（低延迟，无状态）
    learning.py                  — POST /v1/learning/chat（有状态，需 confirm:true）
    intelligence.py              — POST /v1/intelligence/analyze + /pipeline（复合端点）
  prompts/
    persona/user_builder.md      — Onboarding 表单 → persona.md
    persona/contact_builder.md   — 对话历史 → 联系人 persona
    persona/merge.md             — 增量 patch（dynamic_only 模式：只更新动态层）
    persona/schema.md            — Persona 五层结构定义
    conversation/subtext.md      — 潜台词解读
    conversation/reply.md        — 回复建议生成
    conversation/updater.md      — 对话历史压缩（Learning 层证据）
    relationship/builder.md      — 联系人关系初始化
    relationship/updater.md      — 关系状态增量更新（Phase 6）
```

---

## 架构：三层治理路由

路由分层基于**治理属性**，而非速度：

| 层 | 端点 | 状态性 | 触发方式 |
|---|---|---|---|
| Perception | `/v1/perception/analyze` | 无状态，幂等 | 热键自动触发 |
| Reasoning | `/v1/reasoning/chat` | 无状态，幂等 | Perception 完成后自动 |
| Learning | `/v1/learning/chat` | **有状态，写 Storage** | 用户显式确认（confirm:true）|

---

## 开发进度

| Phase | 状态 | 内容 |
|-------|------|------|
| Phase 1 | 完成 | Tauri 框架、系统托盘、全局热键、LLM Gateway |
| Phase 2 | 完成 | 截图采集、Overlay 悬浮窗、Vision 分析 |
| Phase 3 | 完成 | Onboarding 四步问卷 + Persona 生成 + 跳转 Dashboard |
| H1 日志 | 完成 | LLM 调用生命周期日志（每次调用记录 model/tokens/latency） |
| H2 Context 预算 | 完成 | contextAssembler.ts，section-level token 预算，防 context rot |
| H3 增量 Patch | 完成 | Persona 更新计数 + 动态层增量写 + 原子替换（tmp→正式文件） |
| Phase 4 路由重构 | 完成 | perception/reasoning/learning 三层路由 + intelligence 复合端点 |
| Phase 4 Overlay | 完成 | 胶囊态（280×76）↔ 展开态（420×520），Subtext + 回复建议 |
| Phase 5 主窗口 UI | 完成 | Dashboard / ContactList / ContactDetail / UserProfile / CapturePage |
| Phase 6 Settings | 完成 | 后端状态检查 + 模型列表展示 |
| Phase 6 关系更新 | 未开始 | relationship/updater.md prompt 已有，UI 触发逻辑待接入 |

---

## 现在可以验证的功能

### 1. 完整 Onboarding 闭环

```bash
cd backend && python main.py   # 端口 8765
npm run tauri dev              # 另一个终端
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

### 4. Persona 增量更新

对同一联系人分析 3 次截图后，`ContactDetail` 页面出现「Update Persona」badge → 点击 → 只更新 Persona 动态层（Communication Style / Emotional Pattern / Relationship Behavior），Hard Rules 和 Identity 保持不变。

### 5. H1 日志验证

截图分析时，backend 控制台应输出：

```
[LLM] endpoint=perception model=gpt-4o tokens_in=1842 tokens_out=95 latency_ms=2341 ok=true
[LLM] endpoint=reasoning model=groq/llama-3.3-70b-versatile tokens_in=620 tokens_out=287 latency_ms=380 ok=true
```

---

## 接下来要做什么

1. **端到端冒烟测试**：按上面验证清单跑一遍，确认 Vite 无报错、Overlay 能正常展开、Intelligence pipeline 返回真实 subtext
2. **Relationship Updater 接入**（Phase 6 尾）：`relationship/updater.md` prompt 已有，在 `ContactDetail` 增加「Update Relationship」触发按钮，接入 Learning 层
3. **对话历史压缩**：`conversation/updater.md` 已有，在 `BubbleExpanded` 或 `ContactDetail` 中累积多次截图证据后调用，防止 per-contact evidence 无限增长
4. **联系人 Persona 初始化**：首次在 `ContactDetail` 打开一个新联系人时，调用 `relationship/builder.md` 自动生成初始 persona（当前是空文件）

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
npm run tauri dev
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
