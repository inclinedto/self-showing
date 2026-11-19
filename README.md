# ZJS 小站

线上地址：<https://www.zhangjinshuai.buzz>

一个中文的个人付费小站：几个好用的 AI 小工具，加上一个可以匿名说心里话的社区。免费用户每天有固定额度，开通会员额度更高。

## 功能

| 模块 | 路径 | 说明 |
| --- | --- | --- |
| 表格提取 | `/tools/extract` | PDF / 图片里的表格一键变成可编辑表格，导出 Excel / CSV / JSON（视觉模型） |
| 文档问答 | `/tools/ask` | 上传 PDF / Word / TXT 提问，回答标注页码出处并自动核查 |
| AI 小助手 | `/tools/chat` | 通用对话：写作、翻译、答疑；对话记录只存在用户浏览器里 |
| 格式转换 | `/tools/convert` | 图片转换压缩、图片转 PDF、PDF 转图片、PDF 合并 / 拆分；纯浏览器处理，免费不限次 |
| 树洞 | `/treehole` | 匿名发帖（随机昵称）、心情标签、抱抱、匿名评论、举报（3 人举报自动隐藏） |
| 提问箱 | `/box` | 匿名向站长提问，回答后（提问者允许时）公开展示 |
| 会员 | `/pricing` | 爱发电在线支付 + 兑换码，会员天数可叠加 |
| 账户 | `/account` | 会员状态、今日用量、订单、我的树洞 / 提问、修改密码 |
| 管理后台 | `/admin` | 数据概览、回答提问、内容审核、用户管理、订单、生成兑换码 |

隐私设计：社区里不展示用户名；同一条树洞下评论者昵称固定，不同树洞之间无法关联；文件尽量在浏览器本地处理，服务器不保存文件和对话。

## 上线前需要补的配置

现在所有付费相关配置都是空的，网站可以正常打开，缺什么就自动降级：

| 缺少 | 表现 |
| --- | --- |
| 数据库 `DATABASE_URL` | 登录、社区、会员显示“即将开放”；AI 工具以演示模式开放给游客；格式转换正常 |
| AI 密钥 `AI_API_KEY` | AI 工具返回示例数据（演示模式），不产生费用 |
| 套餐价格 / 爱发电配置 | 会员页显示“价格待定”，只能用兑换码开通 |

### 1. 数据库（Vercel + Neon，免费额度够用）

Vercel 项目 → Storage → Create Database → Neon Postgres → 连接到本项目。会自动注入 `DATABASE_URL`，重新部署即可。表结构在首次请求时自动创建（`src/lib/server/migrations.ts`）。

### 2. AI 模型

默认用阿里云百炼（通义千问）的 OpenAI 兼容接口，填 `AI_API_KEY` 即可。也可以换成任何 OpenAI 兼容服务，改 `AI_BASE_URL`、`AI_TEXT_MODEL`、`AI_VISION_MODEL`。

### 3. 管理员

设置 `ADMIN_USERNAMES=你的用户名`，然后用这个用户名注册，右上角菜单会出现“管理后台”。

### 4. 会员价格和爱发电

1. 在爱发电创建 3 个方案（月 / 季 / 年），记下每个方案的 `plan_id`。
2. 打开 `src/resources/plans.ts`，给每个套餐填 `price`（元）和 `afdianPlanId`；额度在同一个文件的 `FREE_QUOTAS` / `MEMBER_QUOTAS`。
3. 在 <https://afdian.com/dashboard/dev> 获取 `user_id` 和 API Token，填到 `AFDIAN_USER_ID`、`AFDIAN_TOKEN`。
4. 同一页面的 Webhook 地址填 `https://www.zhangjinshuai.buzz/api/pay/afdian`（设置了 `AFDIAN_WEBHOOK_KEY` 的话加上 `?key=你的暗号`）。

支付流程：用户在会员页下单 → 跳转爱发电付款 → 爱发电回调 Webhook → 服务器用签名接口重新查询订单确认已支付 → 自动开通。回调丢失时，用户可以点“我已支付”主动查询；管理后台也能手动标记。

价格和方案 ID 都确定后，`/api/auth/me` 的 `status.payments` 会变成 `true`，会员页出现购买按钮。

### 5. 其他

- `INVITE_CODE`：内测期间要求注册填邀请码，留空表示开放注册。
- `BLOCKED_WORDS`：额外的屏蔽词（英文逗号分隔）。内置规则会拦截联系方式、链接、广告和违法词；提到轻生等内容不会拦截，而是给发帖人显示心理援助热线。
- 全部变量见 `.env.example`。

## 本地开发

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

本地不填 `DATABASE_URL` 时自动使用内置的 PGlite（嵌入式 Postgres），数据存在 `.data/pglite/`，不需要安装数据库。

| 命令 | 作用 |
| --- | --- |
| `npm run dev` / `npm run build` | 开发 / 生产构建（会先把 pdf.js 的 worker 和字符映射表复制到 `public/pdfjs/`） |
| `npm test` | 单元测试（内容审核、昵称、页码解析、爱发电签名、密码、套餐、检索、表格） |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | Biome 代码检查 |

## 目录

```
src/
  app/                页面与 API 路由（Next.js App Router）
    api/auth          注册、登录、退出、改密码
    api/treehole      树洞、评论、抱抱
    api/box           提问箱
    api/pay           下单、爱发电 Webhook、订单查询、兑换码
    api/admin         管理后台接口
  components/         界面组件（shell 外框、session 登录态、community 社区、tools 工具、billing 会员）
  lib/                前后端共用的纯函数（审核、昵称、格式转换、检索……）
  lib/server/         只在服务器运行：数据库、鉴权、额度、爱发电、AI
  resources/          站点信息、套餐与额度、图标、主题
tests/                单元测试
```

技术栈：Next.js 16、React 19、[Once UI](https://once-ui.com)（MIT）、Postgres（postgres.js / PGlite）、pdf.js、pdf-lib。

## 注意

- **Vercel 免费版（Hobby）不允许商用**，开始收费后需要升级到 Pro。
- 域名没有 ICP 备案时，不能使用国内服务器 / 国内 CDN 加速，Vercel（境外）可以正常访问，但国内部分地区速度一般。
- 用户协议 `/terms` 和隐私政策 `/privacy` 是通用模板，正式收费前建议按实际情况再核对一遍。
