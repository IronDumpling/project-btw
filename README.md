# project-btw

Tauri 2 + React + TypeScript 桌面端（Vite）+ Python FastAPI 后端。架构与阶段说明见仓库外的计划文档。

## 目录结构

| 目录 | 职责 |
|------|------|
| `src/` | UI Layer — React/TypeScript 前端 |
| `src-tauri/src/capture/` | Capture Layer — 截图、获取活跃窗口标题 |
| `src-tauri/src/storage/` | Storage Layer — 读写应用数据目录下的 MD 文件 |
| `src-tauri/src/shell/` | App Shell — overlay 窗口控制命令 |
| `src-tauri/src/lib.rs` | App Shell 入口 — 系统托盘、全局快捷键 |
| `backend/` | Intelligence Layer + LLM Gateway — Python FastAPI |
| `backend/routers/chat.py` | LLM Gateway — fast / capable 模型路由 |
| `backend/prompts/` | Prompt 模板（Phase 4 使用） |

## 环境要求

- **Node.js**（建议 20+）与 **npm**
- **Rust**（`rustup` 默认 `stable-x86_64-pc-windows-msvc`）
- **Windows**：已安装 **Visual Studio Build Tools**，勾选工作负载「使用 C++ 的桌面开发」
- **Python**（建议 3.11+）

## 安装依赖

```bash
# 前端
npm install

# Python 后端
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
# source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # 然后填入真实 API key
```

---

## Phase 1 验证清单（当前已完成）

### 1. Rust 编译

```bash
cd src-tauri && cargo check
```

预期：退出码 0，无链接错误。

### 2. 桌面应用启动

```bash
npm run tauri dev
```

预期：
- Vite 开发服务器启动，主窗口标题为 **project-btw**，页面正常渲染
- 任务栏通知区出现系统托盘图标，右键菜单含 **Show App / Toggle Overlay / Quit**
- 按 **Ctrl+Shift+B** 可显示/隐藏 Overlay 窗口

### 3. LLM Gateway 启动

```bash
cd backend && python main.py
```

预期：终端打印以下内容后持续运行：

```
INFO  project-btw LLM Gateway starting
INFO    fast    -> groq/llama-3.3-70b-versatile
INFO    capable -> deepseek/deepseek-chat
INFO    listening on http://127.0.0.1:8765
```

### 4. Gateway 健康检查

```bash
curl http://127.0.0.1:8765/health
```

预期：

```json
{"status": "ok", "fast_model": "groq/llama-3.3-70b-versatile", "capable_model": "deepseek/deepseek-chat"}
```

### 5. 真实 LLM 调用（需在 `backend/.env` 填入真实 key）

```bash
curl -X POST http://127.0.0.1:8765/v1/chat/fast \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hello"}]}'
```

预期：返回包含 `content` 字段的 JSON，无 `error` 字段。

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 仅在浏览器跑 Vite（无 Tauri 原生能力） |
| `npm run tauri dev` | 完整桌面应用开发模式 |
| `npm run tauri build` | 打包桌面安装包 |
| `cd backend && python main.py` | 启动 LLM Gateway（开发模式） |
| `cd src-tauri && cargo check` | 检查 Rust 编译 |

## 推荐 IDE

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
