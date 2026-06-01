# Vicinity — 技术架构文档 (V1, Python 版)

> **时间线**:6/2(今天)→ 6/10,**9 天,30 小时投入**,预算红线 $200
> **设计原则**:V1 9 天能跑通,V2 加东西不重写
> **目标读者**:你(Java/JVM 专家,Python 熟,前端/web 框架不是日常),以及 Claude Code

阅读约定:Java/JVM/分布式/系统调优默认你专家 → 不解释。**web 框架、前端、ORM、部署平台**这些 full-stack 概念,第一次出现时给 2-3 行说明(`📖 概念`小框)。

---

## 0. 一句话定位

Listing agent 输入地址 → 系统聚合周边数据(学区/通勤/POI/华人友好设施) → Claude 生成中英双语 story → 输出可分享的 listing landing page + lead capture。

目标用户:Phase 1 笑云 + 5 个 KW agent(Atlanta);Phase 2 扩 Houston/Seattle。

---

## 1. 部署拓扑

```
                  Browser (你 / agent / 买家 / 微信内置浏览器)
                              │
                              ▼
                  ┌─────────────────────────┐
                  │  Streamlit App          │
                  │  (Python, 单进程)       │
                  │                         │
                  │  ├─ admin 页面 (你/agent)│
                  │  └─ 公开 listing 页 /l/?slug=xxx
                  └────────────┬────────────┘
                               │
        ┌──────────────────────┼──────────────────────────┐
        ▼                      ▼                          ▼
  外部数据 client          Postgres                  Anthropic API
  (httpx + asyncio)       (SQLAlchemy)              (anthropic SDK,
        │                      ▲                     直连,不走 Bedrock)
        │                      │
        ├─ Mapbox geocode      │
        ├─ Census ACS          │
        ├─ Walk Score          │
        └─ Google Places       │
                               │
                          Resend (lead 邮件,httpx 直接 POST)
```

**单进程、单数据库,无消息队列、无缓存层、无独立后端服务。**

📖 **Streamlit 是什么**:Python 库。你写 `st.dataframe(df)` 它给你渲染表格,`st.button("跑")` 给你按钮 + 回调。**它把"前端"这个概念从你脑子里删掉**。一个 .py 文件 ≈ 一个页面。代价是样式自由度低,只能做 admin/数据工具样的界面 — V1 完全够,V2 要做公开站时换前端。

---

## 2. 技术栈

| 层 | 选型 | 第一次出现的解释 |
|---|---|---|
| 语言 | **Python 3.12** | 你熟,Claude Code 写得好,LLM 生态一等公民 |
| Web/UI | **Streamlit 1.40+** | 见上方📖 |
| LLM | **anthropic SDK + API key 直连** | 不走 Bedrock,省掉 IAM/boto3,一个 `ANTHROPIC_API_KEY` 完事 |
| DB | **Postgres 16** | V1 本机 docker,V2 上 Neon/Supabase |
| ORM | **SQLAlchemy 2.0 (sync)** | 📖 ORM = 对象关系映射,把 SQL 表映射成 Python 类。你写 `session.query(Listing).filter(...)` 它生成 SQL。SQLAlchemy 是 Python 事实标准,异步版有但 V1 不需要 |
| 数据校验 | **Pydantic v2** | 📖 类似 Java Bean Validation + Jackson 合体。定义 schema,运行时校验 + 序列化 JSON。LLM 结构化输出靠它 |
| 迁移 | **Alembic** | 📖 SQLAlchemy 配套的 schema 迁移工具,等价于 Java 的 Flyway/Liquibase。每次改表生成一个 .py migration 文件 |
| HTTP client | **httpx** | requests 的现代替代,支持同步+异步,API 一样 |
| 抓取(可选) | **selectolax**(快 HTML 解析)/ **playwright**(JS 渲染) | V1 主要靠官方 API,这两个备用 |
| 配置 | **pydantic-settings** | 从 `.env` 读环境变量,Pydantic 模型校验 |
| 任务调度 | (V1 不要,手动跑) | V2 再加 APScheduler |
| 包管理 | **uv** | 📖 Rust 写的 Python 包管理器,比 pip/poetry 快 10-100x。`uv add anthropic` 装包,`uv run streamlit run app.py` 起服务 |
| Email | **Resend HTTP API**(httpx 直接 POST) | 不装 SDK,一个函数搞定 |
| 部署 | V1: 本机 + ngrok 给笑云看;V2: Fly.io / Railway | 见 §8 |

**禁止引入清单(V1):** Django、Flask、FastAPI、Celery、Redis、Kafka、Docker Compose 多服务、langchain、llama-index。理由见 CLAUDE.md。

---

## 3. 代码组织

```
vicinity/
├── app/
│   ├── Home.py                    # Streamlit 入口(默认页 = listing 列表)
│   └── pages/                     # Streamlit 自动按文件名生成侧边栏
│       ├── 1_New_Listing.py       # 创建 listing
│       ├── 2_Listing_Detail.py    # 详情/重跑 enrichment/编辑文案
│       ├── 3_Leads.py             # lead 列表
│       └── 4_Public.py            # 公开 listing 页(?slug=xxx)
│
├── vicinity/                      # 业务代码包(Streamlit 脚本只做 UI)
│   ├── clients/                   # 外部 API client(每个一文件,纯函数)
│   │   ├── mapbox.py
│   │   ├── census.py
│   │   ├── walkscore.py
│   │   ├── google_places.py
│   │   ├── claude.py              # Anthropic 调用统一入口
│   │   └── resend.py
│   ├── enrichment/
│   │   ├── pipeline.py            # 编排所有 client → NeighborhoodData
│   │   └── schema.py              # Pydantic 定义 NeighborhoodData
│   ├── ai/
│   │   ├── prompts.py             # 所有 prompt 集中,版本化(PROMPT_V1)
│   │   └── generator.py           # generate_listing_story(data) → text
│   ├── db/
│   │   ├── models.py              # SQLAlchemy 表定义
│   │   ├── session.py             # engine + SessionLocal
│   │   └── queries.py             # 封装查询,UI 不直接拿 ORM 对象
│   ├── config.py                  # pydantic-settings,读 .env
│   └── auth.py                    # V1 简单:Streamlit secrets 写死密码
│
├── alembic/                       # 数据库迁移
│   ├── versions/
│   └── env.py
│
├── tests/
├── .env.example
├── pyproject.toml                 # uv 管理的依赖
├── CLAUDE.md                      # Claude Code 项目宪法
├── DECISIONS.md                   # 明确不做清单
└── README.md
```

---

## 4. 数据模型(V1 schema,4 张表)

> Pydantic schema 在 `vicinity/enrichment/schema.py` 定义业务契约;
> SQLAlchemy 在 `vicinity/db/models.py` 定义表;两者同步。

### `agents`
```
id              uuid pk
email           text unique
name            text
phone           text
avatar_url      text
brokerage       text
created_at      timestamptz
```
> V1 单 agent(笑云一人),但 schema 按多 agent 建,**不要硬编码 agent_id=1**。

### `listings`
```
id                  uuid pk
agent_id            uuid fk → agents.id          -- ★ Day 1 就建,所有 query 带 where agent_id=?
slug                text unique                  -- 用于 /l/?slug=xxx
address             text
lat, lng            double precision
status              text  -- draft | published
raw_input           jsonb                        -- 原始输入(地址或 redfin 链接)
neighborhood_data   jsonb                        -- enrichment 输出(含 schema_version)
generated_content   jsonb                        -- Claude 生成内容(含 prompt_version)
created_at, updated_at
```

### `leads`
```
id           uuid pk
listing_id   uuid fk → listings.id
name         text
email        text
phone        text
message      text
source       text  -- qr | link | direct | wechat
created_at   timestamptz
```

### `enrichment_runs` ★ 关键,别省
```
id              uuid pk
listing_id      uuid fk → listings.id
started_at      timestamptz
finished_at     timestamptz
status          text  -- running | success | partial | failed
error           text
trace_id        text                    -- 串起所有 log
raw_responses   jsonb                   -- 每个 provider 的原始返回
```
> 没这张表,V1 调试会死。每次 pipeline run 必写。

### Schema 兼容前进策略
`neighborhood_data` 和 `generated_content` 都塞 `schema_version` 字段(V1 写 `"v1"`)。V2 加新字段直接升 `v2`,老数据按 `v1` 解析。**这就是把 LLM 输出当 ground truth 数据集存档的接缝**(对应你 AgentCore 本职)。

---

## 5. Enrichment Pipeline

**V1 做法**:Streamlit 按钮触发,串行 + 部分并行,全做完写库,前端转圈等。

```
trigger: app/pages/2_Listing_Detail.py 上的"Run Enrichment"按钮
  │
  ▼
vicinity.enrichment.pipeline.run(listing_id)
  │
  ▼
[1] geocode (Mapbox)                          → lat, lng, zip
  │
  ▼
[2] 并行执行(asyncio.gather + return_exceptions=True)
    ├── Census ACS         → 人口/收入/教育/族裔
    ├── Walk Score         → walk/transit/bike score
    └── Google Places      → 学校/超市/餐馆/亚洲超市/中文学校
  │
  ▼
[3] Claude 生成文案(依赖前面结果)
    → headline / neighborhood_story / schools / commute / chinese_community
  │
  ▼
[4] 写 listings.neighborhood_data + generated_content
  │
  ▼
[5] 写 enrichment_runs(全程 raw response 留痕)
```

📖 **asyncio 是什么**:Python 的协程并发模型。`async def` 定义协程,`await` 挂起等待 IO,`asyncio.gather()` 并发跑多个。对你来说约等于 Java 的 CompletableFuture / 虚拟线程的简化版,但语法上要在函数前加 `async`,调用要 `await`。Streamlit 主线程是同步的,在 pipeline 函数内部用 `asyncio.run(...)` 跑并发块即可。

### 必踩陷阱
- ✅ 每次 run 必须写 `enrichment_runs`(含每个 provider 的 raw response)
- ✅ 任一 provider 失败 → 写 `null + error` 继续,不挂整个 pipeline
- ✅ 全程一个 `trace_id` 串 log
- ✅ `asyncio.gather(..., return_exceptions=True)`,**不要让一个失败炸掉整个 gather**
- ✅ 所有外部调用 timeout = 10s,httpx 默认无 timeout 是个坑

---

## 6. AI 层(最影响 V2 扩展性)

`vicinity/ai/generator.py` 暴露:

```python
def generate_listing_story(data: NeighborhoodData) -> GeneratedContent: ...
```

调 Claude Sonnet 4.5(via Anthropic API key 直连),prompt 模板写在 `vicinity/ai/prompts.py`,版本化。

### 输出结构化(写进 DB)

```python
class GeneratedContent(BaseModel):
    prompt_version: Literal["v1"] = "v1"
    model: str  # "claude-sonnet-4-5-20250929"
    sections: dict  # headline / neighborhood_story / schools / commute / chinese_community
    generated_at: datetime
    token_usage: dict  # {input, output, total}
```

### Anthropic SDK 调用(就是这么短)

```python
from anthropic import Anthropic
client = Anthropic()  # 自动读 ANTHROPIC_API_KEY 环境变量

resp = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=2000,
    messages=[{"role": "user", "content": prompt}],
)
text = resp.content[0].text
usage = {"input": resp.usage.input_tokens, "output": resp.usage.output_tokens}
```

### V2 红利(都不重写 V1)
| V2 需求 | 直接收益 |
|---|---|
| A/B test 不同 prompt | 加 `PROMPT_V2`,按 listing_id 分流,存同字段 |
| 换模型对比 | 直接读 `token_usage` + 用户反馈 |
| **评测 pipeline(AgentCore 本职)** | 历史 `generated_content` + `enrichment_runs` 即 ground truth,零数据补采 |
| 多语言 | sections 已按段落拆,加 `locale` 维度 |
| Agent 个性化 | base prompt + agent_overrides,调用接口不变 |

---

## 7. 认证 / 多租户

- **V1**:不做正经 auth。Streamlit `secrets.toml` 写死密码,你和笑云用同一个登录。公开 listing 页(`/l/?slug=xxx`)无需登录。
- **关键约束**:`agent_id` 外键 Day 1 就建,所有 query `where agent_id = ?`。即使 V1 只有 1 个 agent。
- **V2**:换正式 auth(Authlib/Auth0/magic link 都行),只换"怎么拿到 agent_id",业务零改动。

---

## 8. 开发与部署

### 开发(Mac)

```
你的 Mac
├── ~/code/vicinity (git repo,主开发位置)
├── Claude Code (cd 到目录里启动,用 ANTHROPIC_API_KEY)
├── docker: postgres 16 (本地数据库)
├── uv run streamlit run app/Home.py  → localhost:8501
└── 浏览器(看效果 + Hermes 对话)
                │ git push/pull
                ▼
            GitHub: vicinity-homes/Vicinity
```

### 部署(给笑云试用)

V1 三种选项,按"省力 → 正规"排:

| 方式 | 说明 | 推荐场景 |
|---|---|---|
| **ngrok 暴露本机** | `ngrok http 8501` → 一个 https URL,Mac 醒着就能访问 | 笑云试用前 2-3 天,即开即用 |
| **Fly.io free tier** | 一个 Dockerfile + `fly launch`,带 Postgres | 笑云稳定试用 1-2 周,$0-5/月 |
| **Railway / Render** | 类似 Fly,UI 更傻瓜 | 同上 |

📖 **Vercel 不在表里 — 它原生支持 Node/Next.js,Python 部署能搞但反人类**。Streamlit 直接 docker 化扔 Fly 是最顺的路。

**source of truth = Mac local repo + GitHub。** EC2 只读不写。

---

## 9. 工具分工

| 工具 | 角色 | 用途 |
|---|---|---|
| **Hermes (EC2, Opus)** | 架构师/编排者 | 每日 plan、阶段 review、skill 沉淀、PR review、debug 疑难、商业决策 |
| **Claude Code (Mac, Sonnet 4.5, API key)** | 日常 coding 主力 | 写代码、跑长任务、迭代 feature |
| 第三个工具 | ❌ 不加 | 避免分心 |

---

## 10. 域名 / 品牌

- V1 **不买域名**,用 ngrok 临时 URL 或 Fly.io 默认 `vicinity.fly.dev`
- 仓库:`github.com/vicinity-homes/Vicinity`(已建)
- Phase 2 有付费用户再考虑 `vicinity.app` / `vicinity.homes`(< $50/年)

---

## 11. V1 → V2 演进路径(都不重写 V1)

| V2 扩展 | V1 已留接缝 |
|---|---|
| 多 agent / brokerage 团队 | `agent_id` 隔离 → 加 `organizations` 表 |
| MLS 集成 | enrichment 是从地址出发的纯函数 → 加 MLS webhook 调同 `pipeline.run()` |
| 真异步 / 批量 | `pipeline.run()` 是独立函数 → 同步触发换 Celery/RQ + 同函数 |
| 多语言 | `sections` 已分段 → 加 `locale`,schema_version 升 v2 |
| 个性化 prompt | `prompts.py` 单 PROMPT_V1 → 拆 base + overrides |
| **评测体系(AgentCore 本行)** | `generated_content` + `enrichment_runs` 全量留痕 → 直接接 LLM-as-judge |
| 缓存 | Census/WalkScore 同 zip 重复调 → 加 Redis,`lib/clients/*` 装饰器,业务无感 |
| 公开网站(取代 admin Streamlit) | 数据层 + AI 层都是纯 Python 函数 → 换 FastAPI + Next.js,核心资产不动 |

---

## 12. V1 明确不做(完整版进 DECISIONS.md)

- ❌ 独立后端 API 服务(Streamlit 自带 HTTP 层)
- ❌ Redis / 缓存层
- ❌ 消息队列 / Celery
- ❌ langchain / llama-index(直接调 anthropic SDK)
- ❌ RBAC / 权限矩阵
- ❌ Stripe 付费(Phase 2)
- ❌ MLS 集成
- ❌ 移动 App
- ❌ 实时协作
- ❌ 自建正经 auth(密码够)
- ❌ i18n 框架(英文 listing + 中文段落写死在 prompt)
- ❌ 短视频 / AI 图片生成(Phase 3)
- ❌ social media 一键发布
- ❌ CRM / follow-up
- ❌ 用户注册系统(账号 hardcode)
- ❌ 自定义前端(V1 不写 HTML/CSS,Streamlit 默认主题)
- ❌ Docker Compose 多服务(只有 streamlit + postgres,docker run 两条命令搞定)

---

## 13. 外部 API 清单(Day 1-2 注册)

| 服务 | 用途 | 免费额度 | 注册 |
|---|---|---|---|
| Mapbox | geocode | 10万次/月 | mapbox.com/signup |
| Census ACS | 人口/收入/族裔 | 无限(public) | 不用注册 |
| Walk Score | walk/transit/bike | 5000/天 | walkscore.com/professional |
| Google Places | POI / 学校 | $200 credit | console.cloud.google.com |
| **Anthropic** | Claude Sonnet 4.5 | 按量,Phase 1 估 < $30/月 | console.anthropic.com |
| Resend | 邮件 | 3000封/月 | resend.com |
| Fly.io(Phase 1.5) | 部署 | $0-5/月 | fly.io(GitHub login) |

**Phase 1 月度成本预估:< $50。**

---

## 14. 核心契约(Pydantic schema 草稿)

`vicinity/enrichment/schema.py`:

```python
from pydantic import BaseModel
from typing import Literal

class GeoData(BaseModel):
    address: str
    lat: float
    lng: float
    zip: str
    city: str
    state: str

class Demographics(BaseModel):  # Census
    population: int | None = None
    median_income: int | None = None
    median_age: float | None = None
    asian_pct: float | None = None
    chinese_pct: float | None = None
    college_degree_pct: float | None = None

class Scores(BaseModel):  # Walk Score
    walk: int | None = None
    transit: int | None = None
    bike: int | None = None

class Poi(BaseModel):
    name: str
    address: str
    distance_m: float
    rating: float | None = None

class Pois(BaseModel):
    schools: list[Poi] = []
    grocery: list[Poi] = []
    asian_grocery: list[Poi] = []
    restaurants: list[Poi] = []
    chinese_schools: list[Poi] = []

class NeighborhoodData(BaseModel):
    schema_version: Literal["v1"] = "v1"
    geo: GeoData
    demographics: Demographics
    scores: Scores
    pois: Pois
    errors: dict[str, str] = {}  # provider → error msg
```

---

## 15. 9 天 30 小时排期(6/2 → 6/10)

| 日 | 日期 | 投入 | 产物 | 关键里程碑 |
|---|---|---|---|---|
| D1 | 6/2 周二 | 4h | repo init, uv 项目, postgres docker, .env, Hello Streamlit, agents/listings 表 | `streamlit run` 跑起来,DB 能写 |
| D2 | 6/3 周三 | 4h | clients/mapbox + census + walkscore + google_places(每个一个 .py + 一个 test) | 4 个 client 单独跑通 |
| D3 | 6/4 周四 | 3h | enrichment/pipeline.py(asyncio.gather 编排) + enrichment_runs 表 | 输入地址 → 拿到完整 NeighborhoodData |
| D4 | 6/5 周五 | 3h | clients/claude.py + ai/prompts.py V1 + ai/generator.py | 输入 NeighborhoodData → 拿到完整 GeneratedContent |
| D5 | 6/6 周六 | 5h | Streamlit 全套页面:Home / New Listing / Listing Detail / Leads | 端到端跑通:输地址 → 看到 listing |
| D6 | 6/7 周日 | 4h | 公开 listing 页 + lead capture 表单 + Resend 通知 | 给笑云发链接能看 |
| D7 | 6/8 周一 | 3h | prompt 调优:用笑云现有 listing 跑 5-10 个,人工评分 | 文案质量过笑云那关 |
| D8 | 6/9 周二 | 2h | Fly.io 部署 + 笑云试用账号 | 笑云能从手机访问 |
| D9 | 6/10 周三 | 2h | 笑云 demo + 收反馈 + 决定 Phase 2 | demo 完成 |
| | | **30h** | | |

每天结束:Hermes review + skill 沉淀。

---

## 16. Day 1 开干前需要的产物(按依赖顺序)

1. **`CLAUDE.md`** — 项目宪法,锚定 Claude Code 协作风格(下一份就出)
2. **`DECISIONS.md`** — §12 完整版
3. **`pyproject.toml`** + **`.env.example`** — uv 项目骨架 + 环境变量清单
4. **`vicinity/db/models.py`** — SQLAlchemy 表定义
5. **`vicinity/enrichment/schema.py`** — Pydantic 契约

下一份:**`CLAUDE.md`**。
