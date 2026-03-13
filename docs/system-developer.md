# Skills Hub 项目全景文档（二开指南）

> 基于当前仓库实现（v0.2.0），面向二次开发者的完整技术说明。涵盖项目架构、目录结构、前后端接口、构建发布流程及常见扩展场景。

---

## 一、项目概述

**Skills Hub** 是一个基于 **Tauri v2 + React 19** 的跨平台桌面应用，核心价值主张是：

> "Install once, sync everywhere" —— 统一管理 AI 编程工具的 Skill，一次安装，自动同步到 40+ 款 AI 工具。

**解决的核心问题**：各 AI 工具（Cursor、Claude Code、Codex 等）的全局 Skills 目录分散在 `~` 下不同位置，导致：

- 无法统一查看哪些 Skill 已安装、在哪些工具生效
- 跨工具重复安装和版本漂移
- 安装新工具后需要手动重新配置

**核心机制**：将 Skill 内容集中存放在"中心仓库（Central Repo，默认 `~/.skillshub`）"，各工具目录通过 **symlink / junction（Windows）/ copy（降级）** 映射到中心仓库。

---

## 二、技术栈

| 层级 | 技术 | 版本 | 说明 |
|---|---|---|---|
| **桌面框架** | Tauri | v2.9.5 | Rust 后端 + WebView 前端 |
| **前端框架** | React | v19.2.3 | + TypeScript |
| **路由** | react-router-dom | v7.12.0 | |
| **样式** | Tailwind CSS | v4 | CSS variables 主题系统 |
| **国际化** | react-i18next | v16 | 支持 EN / ZH |
| **通知** | sonner | v2 | Toast 通知 |
| **图标** | lucide-react | v0.562 | |
| **构建工具** | Vite | v6 | |
| **Rust 框架** | Tauri | v2 | 命令注册、事件、插件 |
| **数据库** | rusqlite (bundled) | v0.31 | SQLite 嵌入式 |
| **Git 操作** | git2 (vendored-openssl) | v0.19 | libgit2 绑定，优先系统 git CLI |
| **HTTP** | reqwest | v0.12 | GitHub API 搜索 |
| **目录遍历** | walkdir | — | |
| **哈希** | sha2 + hex | — | 目录内容指纹 |
| **错误处理** | anyhow | — | |
| **Windows 链接** | junction | — | Windows Junction 支持 |

---

## 三、项目目录结构

```
skills-hub/
├── .github/
│   └── workflows/
│       ├── ci.yml              # PR / main push CI（前端 lint+build + Rust test）
│       └── release.yml         # Tag v* 触发，构建全平台产物并发 GitHub Release
│
├── docs/
│   ├── README.zh.md            # 中文用户文档
│   ├── system-design.md        # 系统设计（英文）
│   ├── system-design.zh.md     # 系统设计（中文，最权威的设计文档）
│   ├── system-developer.md     # 二开指南（本文件）
│   ├── CHANGELOG.zh.md
│   └── assets/                 # 截图等资源
│
├── scripts/
│   ├── version.mjs             # 版本号同步脚本（package.json ↔ tauri.conf.json）
│   ├── extract-changelog.mjs   # 从 CHANGELOG.md 提取当前版本 Release Notes
│   ├── tauri-icon-desktop.mjs  # 图标生成
│   └── coverage-rust.sh        # Rust 覆盖率脚本
│
├── src/                        # 前端 React 源码
│   ├── main.tsx                # 入口：初始化 i18n，挂载 <App/>
│   ├── App.tsx                 # 单页 Dashboard（约 1700 行，所有业务状态聚合）
│   ├── App.css / index.css     # 全局样式 + CSS design tokens（light/dark）
│   ├── assets/
│   ├── components/
│   │   └── skills/
│   │       ├── types.ts        # 所有 TypeScript 类型定义
│   │       ├── Header.tsx      # 顶部导航（品牌+语言切换+设置+添加按钮）
│   │       ├── FilterBar.tsx   # 搜索 + 排序栏
│   │       ├── SkillCard.tsx   # 单个 Skill 卡片（工具 pills，更新/删除）
│   │       ├── SkillsList.tsx  # Skills 列表容器
│   │       ├── LoadingOverlay.tsx
│   │       └── modals/
│   │           ├── AddSkillModal.tsx   # 添加 Skill（Local/Git 两个 Tab）
│   │           ├── DeleteModal.tsx     # 删除确认
│   │           ├── GitPickModal.tsx    # Git 多 Skill 候选选择
│   │           ├── ImportModal.tsx     # 导入已发现的 Skills（Onboarding）
│   │           ├── LocalPickModal.tsx  # 本地多 Skill 候选选择
│   │           ├── NewToolsModal.tsx   # 新安装工具检测提示
│   │           └── SettingsModal.tsx   # 设置（语言/主题/中心仓库路径）
│   ├── i18n/
│   │   ├── index.ts            # i18next 初始化
│   │   └── resources.ts        # 翻译资源（EN + ZH）
│   └── pages/
│       └── Dashboard.tsx       # Dashboard 页面（当前仅用作路由占位）
│
├── src-tauri/                  # Rust 后端
│   ├── Cargo.toml              # Rust 依赖声明
│   ├── tauri.conf.json         # Tauri 配置（窗口、更新端点、标识符等）
│   ├── capabilities/           # Tauri 权限声明
│   ├── icons/                  # 应用图标（各平台格式）
│   └── src/
│       ├── main.rs             # 桌面端入口（调用 lib.rs）
│       ├── lib.rs              # Tauri Builder：初始化 DB、注册插件、注册 commands
│       ├── commands/
│       │   ├── mod.rs          # 所有 Tauri command 定义（前后端接口层，约 800 行）
│       │   └── tests/
│       │       └── commands.rs
│       └── core/               # 核心业务逻辑
│           ├── mod.rs
│           ├── central_repo.rs # 中心仓库路径管理（确保目录存在）
│           ├── content_hash.rs # SHA-2 目录指纹（忽略 .git/.DS_Store 等）
│           ├── git_fetcher.rs  # Git 拉取（优先系统 git CLI，降级 libgit2）
│           ├── github_search.rs# GitHub 仓库搜索 API
│           ├── installer.rs    # Skill 安装/更新逻辑（local + git）
│           ├── onboarding.rs   # 首次扫描：遍历所有工具目录，聚合候选
│           ├── skill_store.rs  # SQLite CRUD（skills / skill_targets / settings）
│           ├── sync_engine.rs  # 混合同步引擎（symlink→junction→copy 降级）
│           ├── temp_cleanup.rs # Git 临时目录自动清理（24h TTL）
│           ├── cache_cleanup.rs# 缓存清理
│           ├── tool_adapters/
│           │   └── mod.rs      # 40+ 工具的路径适配器（key/name/skills_dir/detect_dir）
│           └── tests/          # 各模块单元测试
│
├── index.html                  # Vite 入口 HTML
├── vite.config.ts              # Vite 配置（React + Tailwind 插件，端口 5173）
├── tsconfig.json               # TypeScript 配置（Project References）
├── eslint.config.js
├── package.json                # npm 脚本 + 前端依赖
├── README.md
├── CHANGELOG.md                # 版本更新日志（Release 时自动提取）
└── LICENSE                     # MIT
```

---

## 四、核心架构设计

### 4.1 分层架构

```
┌─────────────────────────────────────────────┐
│          Frontend（React WebView）            │
│  App.tsx（状态聚合） + components + modals    │
│  i18n（EN/ZH）+ 主题（CSS variables）         │
│  invoke(command, args) ──> Tauri IPC 桥接    │
├─────────────────────────────────────────────┤
│          Commands 层（Rust）                  │
│  spawn_blocking / DTO 转换 / 错误前缀格式化   │
├─────────────────────────────────────────────┤
│          Core 业务层（Rust）                  │
│  installer / sync_engine / onboarding        │
│  git_fetcher / github_search                 │
│  skill_store（SQLite） / tool_adapters        │
├─────────────────────────────────────────────┤
│          文件系统 + 外部服务                  │
│  ~/.skillshub（中心仓库）                     │
│  ~/.cursor/skills 等（工具目录）              │
│  GitHub API / Git 仓库                       │
└─────────────────────────────────────────────┘
```

### 4.2 数据存储

**SQLite 数据库**（路径：`app_data_dir()/skills_hub.db`）包含 4 张表：

```
skills（托管的 Skill 元数据）
  id, name, source_type(local|git), source_ref, source_revision,
  central_path(UNIQUE), content_hash, created_at, updated_at, ...

skill_targets（Skill 在各工具中的同步映射）
  id, skill_id(FK), tool, target_path,
  mode(auto|symlink|junction|copy), status, last_error, synced_at

settings（key/value 配置）
  central_repo_path, installed_tools_v1, onboarding_completed

discovered_skills（已发现但未导入的 Skills，预留）
  id, tool, found_path, name_guess, fingerprint, found_at, imported_skill_id(FK)
```

### 4.3 同步策略

**优先级**（`sync_engine.rs`）：

1. **symlink**（Unix 软链接）
2. **junction**（Windows，`junction` crate）
3. **copy**（递归目录复制，降级兜底）

**特例**：Cursor 强制使用 copy（不支持 symlink skills 目录）。

**幂等性**：若目标路径已经是指向同一 source 的链接，则直接视为已同步，不重复操作。

---

## 五、前后端接口契约（Tauri Commands）

前端通过 `invoke(commandName, args)` 调用，所有耗时操作在 Rust 侧 `spawn_blocking`：

| Command | 参数 | 返回 | 说明 |
|---|---|---|---|
| `get_central_repo_path` | — | `string` | 获取中心仓库路径 |
| `set_central_repo_path` | `path` | `string` | 设置并迁移中心仓库 |
| `get_tool_status` | — | `{tools, installed, newly_installed}` | 检测工具安装状态 |
| `get_onboarding_plan` | — | `OnboardingPlan` | 扫描所有工具已有 Skills |
| `get_managed_skills` | — | `ManagedSkill[]` | 获取托管列表 |
| `install_local` | `sourcePath, name?` | `InstallResultDto` | 从本地路径安装单个 Skill |
| `list_local_skills_cmd` | `sourcePath` | `LocalSkillCandidate[]` | 列举本地目录中的候选 Skills |
| `install_local_selection` | `sourcePath, subpath, name?` | `InstallResultDto` | 安装本地指定子路径 |
| `install_git` | `repoUrl, name?` | `InstallResultDto` | 从 Git URL 安装 Skill |
| `list_git_skills_cmd` | `repoUrl` | `GitSkillCandidate[]` | 列举 Git 仓库中的候选 Skills |
| `install_git_selection` | `repoUrl, subpath, name?` | `InstallResultDto` | 安装 Git 仓库指定子路径 |
| `import_existing_skill` | `sourcePath, name?` | `InstallResultDto` | 导入已有 Skill（等价 install_local）|
| `sync_skill_to_tool` | `sourcePath, skillId, tool, name, overwrite?` | `{mode_used, target_path}` | 同步到某工具 |
| `unsync_skill_from_tool` | `skillId, tool` | `void` | 取消某工具同步 |
| `update_managed_skill` | `skillId` | `UpdateResultDto` | 从源更新 Skill |
| `delete_managed_skill` | `skillId` | `void` | 删除 Skill（清理映射+中心目录） |
| `search_github` | `query, limit?` | `RepoSummary[]` | GitHub 仓库搜索（前端入口暂 disabled）|

**错误前缀约定**（前端根据前缀做差异化提示）：

| 前缀 | 含义 |
|---|---|
| `MULTI_SKILLS\|...` | 仓库含多个 Skill，需走候选选择流程 |
| `TARGET_EXISTS\|<path>` | 目标目录已存在，非破坏性操作停止 |
| `TOOL_NOT_INSTALLED\|<tool>` | 工具未安装 |

---

## 六、开发环境搭建

### 前提条件

```bash
# Node.js 20+
node -v   # >= 20

# Rust stable
rustup update stable
rustup default stable

# Tauri 系统依赖（按平台）
# macOS: Xcode Command Line Tools
xcode-select --install

# Linux（Ubuntu/Debian）
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

### 启动开发模式

```bash
# 克隆项目
git clone https://github.com/qufei1993/skills-hub.git
cd skills-hub

# 安装前端依赖
npm install

# 启动 Tauri 开发模式（同时启动 Vite dev server + Tauri 窗口）
npm run tauri:dev
```

开发模式下：

- 前端 Vite 服务跑在 `localhost:5173`，支持热更新（HMR）
- Rust 代码改动后需要重新编译（约 10-60s 首次，后续增量较快）
- 可在 Tauri 窗口打开 DevTools（右键 → Inspect）

### 仅开发前端（无 Tauri 环境）

```bash
npm run dev
# 浏览器访问 http://localhost:5173
# 注意：非 Tauri 环境下 invoke() 不生效，UI 会跳过后端调用
```

---

## 七、构建与发布

### 本地构建

```bash
# 检查代码质量
npm run check     # lint + build + cargo fmt + clippy + test

# 构建前端
npm run build

# 构建全平台（当前平台）
npm run tauri:build

# 平台专项构建
npm run tauri:build:mac:dmg              # macOS Intel DMG
npm run tauri:build:mac:universal:dmg   # macOS Universal（Intel + Apple Silicon）
npm run tauri:build:win:msi             # Windows MSI
npm run tauri:build:win:exe             # Windows NSIS .exe
npm run tauri:build:win:all             # Windows MSI + NSIS
npm run tauri:build:linux:deb           # Linux .deb
npm run tauri:build:linux:appimage      # Linux AppImage
npm run tauri:build:linux:all           # Linux deb + AppImage
```

### 版本号管理

项目有专用版本同步脚本，确保 `package.json` 和 `src-tauri/tauri.conf.json` 版本一致：

```bash
npm run version:check     # 检查两处版本是否一致
npm run version:set       # 设置新版本号
npm run version:sync      # 同步版本号
```

版本号规范：遵循 [Semantic Versioning](https://semver.org/)。

### CI/CD 自动化发布（GitHub Actions）

**触发条件**：推送形如 `v0.2.1` 的 Tag

```bash
git tag v0.2.1
git push origin v0.2.1
```

**Release 流程**（`.github/workflows/release.yml`）：

```
1. 构建矩阵并行执行：
   ├── macOS Intel (x86_64-apple-darwin)        → .app + .dmg
   ├── macOS Apple Silicon (aarch64-apple-darwin) → .app + .dmg
   ├── Windows x64                               → NSIS .exe
   └── Windows ARM64                             → NSIS .exe

2. macOS：导入 Apple 证书到 Keychain → Tauri 构建并签名 .app → 生成 .dmg
3. Windows：安装 Strawberry Perl（OpenSSL 构建依赖）→ Tauri 构建 NSIS
4. 合并签名信息，生成 updater.json（含 macOS Intel/ARM64 签名）
5. 从 CHANGELOG.md 提取当前版本 Release Notes
6. 用 softprops/action-gh-release@v2 发布 GitHub Release
```

**所需 GitHub Secrets**（在仓库 Settings → Secrets 配置）：

| Secret | 说明 |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | Tauri Minisign 私钥（base64 编码自动识别）|
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 私钥密码 |
| `APPLE_CERTIFICATE` | Apple 开发者证书（base64）|
| `APPLE_CERTIFICATE_PASSWORD` | 证书密码 |
| `APPLE_SIGNING_IDENTITY` | 签名身份（Developer ID Application: ...）|
| `APPLE_ID` | Apple ID |
| `APPLE_PASSWORD` | App 专用密码（公证用）|
| `APPLE_TEAM_ID` | Apple 开发者 Team ID |

**自动更新机制**：应用内置 `@tauri-apps/plugin-updater`，更新端点为：

```
https://github.com/qufei1993/skills-hub/releases/latest/download/updater.json
```

发布 Release 后，用户打开应用时会自动检测并提示更新。

---

## 八、添加新 AI 工具（最常见的二开需求）

只需在一个文件中添加一条记录，**无需改动其他任何文件**：

**文件**：`src-tauri/src/core/tool_adapters/mod.rs`

```rust
// 在 default_tool_adapters() 函数的 vec![] 中添加：
ToolAdapter {
    key: "your_tool".to_string(),
    display_name: "Your Tool".to_string(),
    relative_skills_dir: ".your_tool/skills".to_string(),
    relative_detect_dir: ".your_tool".to_string(),
    force_copy: false,  // 若该工具不支持 symlink，设为 true（如 Cursor）
},
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `key` | `String` | 工具唯一标识（snake_case），用于数据库和前端逻辑 |
| `display_name` | `String` | 界面上显示的名称 |
| `relative_skills_dir` | `String` | 相对于用户主目录 `~` 的 Skills 目录路径 |
| `relative_detect_dir` | `String` | 用于判断工具是否已安装的目录（存在即视为已安装）|
| `force_copy` | `bool` | 是否强制使用 copy 模式（跳过 symlink/junction 尝试）|

---

## 九、前端二开关键位置

### 9.1 新增翻译文本

**文件**：`src/i18n/resources.ts`

```typescript
// 在 en.translation 和 zh.translation 中同时添加：
export const resources = {
  en: { translation: {
    "your_new_key": "Your English text",
  }},
  zh: { translation: {
    "your_new_key": "你的中文文本",
  }},
}
```

组件中使用：

```typescript
const { t } = useTranslation();
<span>{t("your_new_key")}</span>
```

### 9.2 新增 Modal 弹窗

参考 `src/components/skills/modals/DeleteModal.tsx` 的结构：

```typescript
// 1. 在 modals/ 下创建 YourModal.tsx
// 2. 在 App.tsx 中添加 state 控制显示/隐藏
const [showYourModal, setShowYourModal] = useState(false);

// 3. 在 JSX 中条件渲染
{showYourModal && (
  <YourModal onClose={() => setShowYourModal(false)} />
)}
```

### 9.3 新增 TypeScript 类型

所有前后端共享的数据类型统一在 `src/components/skills/types.ts` 中定义，新增接口返回类型在此文件扩展。

### 9.4 调用新的 Tauri Command

```typescript
import { invoke } from "@tauri-apps/api/core";

const result = await invoke<YourReturnType>("your_command_name", {
  paramOne: "value",
  paramTwo: 42,
});
```

---

## 十、后端二开关键位置

### 10.1 新增 Tauri Command

**步骤一**：在 `src-tauri/src/commands/mod.rs` 中添加函数：

```rust
#[tauri::command]
pub async fn your_new_command(
    app: AppHandle,
    param_one: String,
) -> Result<String, String> {
    let result = tokio::task::spawn_blocking(move || {
        your_core_function(&param_one)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e: anyhow::Error| e.to_string())?;

    Ok(result)
}
```

**步骤二**：在 `src-tauri/src/lib.rs` 中注册：

```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        // 已有 commands...
        commands::your_new_command,  // 新增
    ])
```

### 10.2 新增核心业务模块

在 `src-tauri/src/core/` 下新建文件：

```rust
// src-tauri/src/core/your_module.rs
use anyhow::Result;

pub fn your_function(input: &str) -> Result<String> {
    Ok(format!("processed: {}", input))
}
```

在 `src-tauri/src/core/mod.rs` 中声明：

```rust
pub mod your_module;
```

### 10.3 访问数据库

```rust
use crate::core::skill_store::SkillStore;

// 通过 app.state() 获取注入的 store 实例
let store = app.state::<Arc<Mutex<SkillStore>>>();
let store = store.lock().unwrap();

// 查询所有 Skills
let skills = store.list_skills()?;

// 插入/更新（参考 skill_store.rs 中已有方法）
store.upsert_skill(&skill_record)?;
```

---

## 十一、当前未完成功能（后续增强方向）

这些是系统设计中规划但当前版本未完全落地的功能，是二开的优质切入点：

| 功能 | 当前状态 | 二开建议 |
|---|---|---|
| **GitHub 搜索 UI** | 后端 `search_github` 已实现，前端 Tab 为 `disabled` | 启用前端入口，接入搜索结果列表，支持一键安装 |
| **扫描结果落库** | `discovered_skills` 表已建，扫描结果仅存内存 | 将 Onboarding plan 持久化到 DB，支持"忽略/标记"功能 |
| **Onboarding gating** | `settings.onboarding_completed` 接口存在但未用作门控 | 首次启动弹引导，后续不再自动显示 discovered banner |
| **24h 自动更新** | 设置界面有占位文案，但定时任务未落地 | 用后台线程实现定时检查并触发更新 |
| **维护入口** | 无 | 提供"清理失效 targets / 修复 broken link / 重新同步所有 copy targets"功能 |
| **版本并存** | 不支持 `name@cursor` 多版本 | 需要 UI + 命名规范 + DB schema 改动 |
| **云同步** | 仅本机文件系统 + SQLite | 可考虑接入 iCloud / OneDrive / Git 远程同步 |

---

## 十二、常用开发命令速查

```bash
# 开发
npm run tauri:dev              # 启动 Tauri 开发模式（推荐）
npm run dev                    # 仅启动前端 Vite（无 Tauri 窗口）

# 代码检查
npm run lint                   # ESLint 前端检查
npm run build                  # 前端 TypeScript 编译 + Vite 构建
cd src-tauri && cargo fmt      # Rust 格式化
cd src-tauri && cargo clippy   # Rust lint（-D warnings）
cd src-tauri && cargo test     # Rust 单元测试
npm run check                  # 以上所有检查合并执行

# 版本管理
npm run version:check          # 检查 package.json 与 tauri.conf.json 版本一致性
npm run version:set            # 设置新版本号
npm run version:sync           # 同步版本号

# 构建产物
npm run tauri:build                       # 当前平台默认构建
npm run tauri:build:mac:universal:dmg     # macOS Universal DMG
npm run tauri:build:win:all               # Windows MSI + NSIS
npm run tauri:build:linux:all             # Linux deb + AppImage

# 发布（触发 GitHub Actions CI/CD）
git tag v0.x.x && git push origin v0.x.x
```

---

## 十三、常见问题

**macOS 提示"已损坏"或"无法验证开发者"**：

```bash
xattr -cr "/Applications/Skills Hub.app"
```

**为何 Cursor 同步总是 copy 模式**：Cursor 不支持 symlink 形式的 skills 目录，`force_copy: true` 是硬编码的设计决策。

**`TARGET_EXISTS|...` 错误含义**：目标路径已存在，默认非破坏性操作不覆盖。需要用户手动删除冲突目录，或在代码层面传入 `overwrite: true`。

**Git 克隆失败（TLS/网络问题）**：后端会启发式识别 TLS/鉴权/DNS/超时等错误并给出提示。建议用户配置系统代理，因为 Skills Hub 优先使用系统 `git` CLI（继承本机网络/证书配置）。

**中心仓库默认位置**：`~/.skillshub`，可在设置中修改，对应 DB 中 `settings.central_repo_path` 键值。

**数据库文件位置**：

- macOS：`~/Library/Application Support/com.qufei1993.skillshub/skills_hub.db`
- Windows：`%APPDATA%\com.qufei1993.skillshub\skills_hub.db`
- Linux：`~/.local/share/com.qufei1993.skillshub/skills_hub.db`

**Git 缓存临时目录位置**：Tauri `app_cache_dir()` 下，命名格式 `skills-hub-git-<uuid>`，应用启动后台清理超过 24h 的目录。
