# project-btw

Tauri 2 + React + TypeScript 桌面端（Vite）。架构与阶段说明见仓库外的计划文档。

## 环境要求（Phase 1）

- **Node.js**（建议 20+）与 **npm**
- **Rust**（`rustup` 默认 `stable-x86_64-pc-windows-msvc`）
- **Windows**：已安装 **Visual Studio Build Tools**，并勾选工作负载 **「使用 C++ 的桌面开发」**（或等效 MSVC 工具链），否则 `cargo` 链接阶段会失败  
  - 勿依赖本机私有的 `.cargo/config.toml`（若曾用 LLVM `lld-link` 凑合，在装好 MSVC 后应删除该文件，使用默认 `link.exe`）

## 安装依赖

```bash
npm install
```

## Phase 1 结束时如何验证「一切可以运行」

按顺序做下面几步；**全部通过**即表示 Phase 1 中 **Tauri 壳 + Rust 后端编译 + 前端能随应用启动** 已就绪。

### 1. Rust 侧能完整编译

```bash
cd src-tauri
cargo check
cd ..
```

- 预期：命令以 **0 退出**，无 `link.exe` / `msvcrt.lib` 等链接错误。

### 2. 桌面应用能启动（开发模式）

在项目根目录执行：

```bash
npm run tauri dev
```

- 预期：
  - 自动拉起 **Vite**（前端）与 **Tauri** 主窗口；
  - 主窗口标题为 **project-btw**，页面能正常渲染（无白屏、控制台无致命报错）。

### 3. 系统托盘与全局快捷键

应用运行后：

- **系统托盘**：任务栏通知区域出现应用图标；右键菜单应包含 **Show App**、**Toggle Overlay**、**Quit**（文案以实际菜单为准）。
- **全局快捷键**：按 **Ctrl+Shift+B**，应能 **显示/隐藏** Overlay 窗口（若首次为创建窗口，随后应可切换）。

### 4. （可选）Storage 相关命令

前端或调试时若已调用 Tauri 的 `read_file` / `write_file` / `get_data_dir` 等，应能读写 **应用数据目录** 下的相对路径（如 `user/persona.md`、`contacts/...`）。未接 UI 时本步可跳过。

---

### Phase 1 尚未包含的部分

- **Python + FastAPI + LiteLLM** 网关尚未接入时，**无法**通过本 README 验证「调用大模型」；该条属于计划中 Phase 1 的 **LLM Gateway** 子项，需单独实现后再加验证步骤。

## 常用命令


| 命令                    | 说明                        |
| --------------------- | ------------------------- |
| `npm run dev`         | 仅浏览器中跑 Vite（无 Tauri 原生能力） |
| `npm run tauri dev`   | 完整桌面应用开发模式                |
| `npm run build`       | 构建前端静态资源                  |
| `npm run tauri build` | 打包桌面安装包                   |


## 推荐 IDE

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

