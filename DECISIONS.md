# Vicinity — DECISIONS.md

> 已拍板的技术决策固化清单。**这份文档是 Claude Code 和未来的你的"防越界开关"** —
> 任何想偏离这里决策的提议,必须先在本文件加一条 ADR(Architecture Decision Record),
> 不能默默改代码。
>
> Owner: 项目主
> Last updated: 2026-06-02
> 配套文档:`ARCHITECTURE.md`(怎么搭)、`CLAUDE.md`(怎么写)、本文件(为什么这么定 + 不做什么)

---

## 0. 怎么用这份文档

- **Claude Code 每次开新任务前先扫一遍本文件**(尤其 §3 禁止清单)
- 想引入禁止清单里的东西 → 停下,在 chat 里问项目主,等明确同意
- 拍板新决策 → 在 §6 加 ADR-XXX,不要直接覆盖旧条目
- 撤销/反转决策 → 不删旧 ADR,新增一条 "ADR-YYY: Supersedes ADR-XXX",保留历史

---

## 1. 项目身份(不可变)

| 项 | 值 |
|---|---|
| 项目名 | Vicinity |
| 域名 | 暂不买(V1 用 ngrok 临时链接给笑云看) |
| 阶段 | V1(Phase 1) |
| 时间盒 | 2026-06-02 → 2026-06-10,9 天 30 小时 |
| 目标用户 | 笑云(1 人 design partner)+ 项目主自己 |
| 成功标准 | 笑云愿意把它放进她的客户工作流;月度 LLM/API 成本 < $50 |
| 非目标 | 公开 SaaS、规模化、多租户、付费转化 — 全部 V2+ |

**这一节任何字段要改,必须开 chat 对齐,不允许 Claude Code 自行调整。**

---

## 2. 技术栈(已拍板)

### 2.1 语言与运行时

| 决策 | 值 | 理由摘要(详 ADR) |
|---|---|---|
| 主语言 | **Python 3.12** | 项目主熟、Claude Code 强、LLM 生态原生、本质是数据管道而非 web app(ADR-001) |
| 不用 Java | — | 强项用不上,Spring 心智成本高,LLM 生态二等公民(ADR-001) |
| 不用 TypeScript | — | 从零学的 10-15 小时砸到 prompt 调优更值(ADR-001) |
| 包管理 | **uv** | 比 pip/poetry 快 10-100x,锁文件确定性强(ADR-002) |

### 2.2 Web/UI 层

| 决策 | 值 | 理由 |
|---|---|---|
| UI 框架 | **Streamlit** | V1 是 admin-only 内部工具,1 个用户,Streamlit 把"前端"概念删掉(ADR-003) |
| 不用 FastAPI+Jinja+HTMX | — | V1 没有公开访客,自由度溢价不值 5-8h(ADR-003) |
| 不用 Next.js | — | 见 ADR-001 不用 TS |
| 不写自定义 HTML/CSS | — | Streamlit 默认主题就够,样式不是 V1 价值点 |

### 2.3 数据层

| 决策 | 值 | 理由 |
|---|---|---|
| DB | **Postgres 16**(本机 docker run) | 关系 + JSONB 双修,enrichment 半结构化数据用 JSONB 列 |
| ORM | **SQLAlchemy 2.0**(typed style) | Python 事实标准,Claude Code 熟,迁移生态成熟 |
| 迁移 | **Alembic** | SQLAlchemy 官方搭档,Day 1 起就用,不允许"手改 schema 不写迁移" |
| 数据校验 | **Pydantic v2** | LLM 输出强制结构化校验,等价 TS 的 zod(ADR-004) |
| 不用 SQLModel | — | Pydantic+SQLAlchemy 各司其职,SQLModel 抽象漏出会卡住 |
| 不用 Django ORM | — | Django 整套被 §3 禁止 |

### 2.4 LLM 层

| 决策 | 值 | 理由 |
|---|---|---|
| 模型 | **Claude Sonnet 4.5**(`claude-sonnet-4-5`) | 性价比最优,Opus 太贵,Haiku 写作质量不够 |
| 接入方式 | **Anthropic API key 直连** | V1 简化,不走 Bedrock(ADR-005) |
| SDK | `anthropic` 官方 Python SDK | — |
| 不用 langchain / llama-index | — | 4 张表 + 直接 prompt 调用,框架是负资产(ADR-006) |
| 不用 LangGraph | — | V1 没有多 agent 编排,V2+ 再说 |
| Prompt 版本化 | **每个 prompt 落盘成 .md,带 `prompt_version` 字段写库** | ground truth 留痕,日后对比模型升级效果 |

### 2.5 抓取/外部数据

| 决策 | 值 | 理由 |
|---|---|---|
| HTTP 客户端 | **httpx**(async) | requests 已老,httpx 原生 async + HTTP/2 |
| HTML 解析 | **selectolax** | 比 BeautifulSoup 快 10x,API 够用 |
| JS 渲染抓取 | **Playwright**(只在需要时) | 大多数源用 selectolax 能搞定,playwright 是兜底 |
| 不用 scrapy | — | 杀鸡用牛刀,V1 抓取量 < 1 万次/天 |
| 不用 pandas | — | 数据流就是 list[dict] + Pydantic,pandas 在 V1 是依赖税(ADR-007) |

### 2.6 部署

| 决策 | 值 | 理由 |
|---|---|---|
| V1 运行位置 | **EC2(开发 + 演示)+ Mac(本地 prompt 调优)** | EC2 给笑云通过 ngrok 看 demo,Mac 跑实验快 |
| V2 运行位置 | **Fly.io 或 Railway**(待选) | EC2 长期不划算,V2 切迁移 |
| 不用 Docker Compose 多服务 | — | V1 只有 streamlit + postgres,两条 docker run 够 |
| 不上 K8s/ECS/EKS | — | 单容器够用 5 年,这是 admin 工具不是 SaaS |
| 不买域名 | — | V1 决策,见 §1 |

### 2.7 任务调度

| 决策 | 值 | 理由 |
|---|---|---|
| 后台任务 | **APScheduler**(in-process) | V1 只有"夜间跑 enrichment 批量"这种轻活 |
| 不用 Celery / RQ / dramatiq | — | 需要独立 worker + Redis broker,V1 全是冗余(ADR-008) |
| 不用 Airflow / Prefect | — | DAG 编排需求 V1 没有 |

### 2.8 测试

| 决策 | 值 |
|---|---|
| 测试框架 | **pytest** |
| LLM 调用 mock | `respx`(httpx 的 VCR 模式)+ 真实样本 fixture |
| 覆盖率底线 | enrichment pipeline 关键函数 ≥ 70%,UI 不强求 |

### 2.9 代码质量

| 决策 | 值 |
|---|---|
| 类型检查 | `mypy --strict` 起步,业务层放宽到 `--check-untyped-defs` |
| 格式化 | `ruff format`(替代 black) |
| Lint | `ruff check`(替代 flake8/pylint/isort) |
| pre-commit | 必装,Day 1 就配 |

---

## 3. 禁止引入清单(V1)

> 这些东西在 V1 里**任何理由都不许加**。Claude Code 想加 → 停下问。
> 想破例 → 在 §6 写 ADR,项目主签字才行。

### 3.1 Web 框架

- ❌ Django(全栈过重,V1 不需要 admin/auth/migrations 那一套)
- ❌ Flask(Streamlit 已经覆盖 UI,Flask 没新增价值)
- ❌ FastAPI(V1 没有公开 API 消费者)
- ❌ 自建 HTTP API 服务(Streamlit 自带 HTTP 层)

### 3.2 LLM/AI 框架

- ❌ langchain
- ❌ llama-index
- ❌ LangGraph(V2+ 多 agent 时再评估)
- ❌ semantic-kernel
- ❌ haystack
- ❌ 任何"agent 框架"(V1 prompt + structured output 就够)

### 3.3 基础设施

- ❌ Redis / Memcached(V1 没有缓存需求)
- ❌ Celery / RQ / dramatiq(消息队列)
- ❌ Kafka / RabbitMQ
- ❌ Elasticsearch / OpenSearch(项目主老本行,但 V1 1-2 万条 leads,Postgres FTS 都过剩)
- ❌ Docker Compose 多服务
- ❌ K8s / ECS / EKS / Nomad
- ❌ Terraform(V1 EC2 手工开,5 分钟的事)
- ❌ Nginx(Streamlit + ngrok 直出)

### 3.4 数据库

- ❌ MongoDB / DynamoDB(关系数据用关系库)
- ❌ MySQL(Postgres JSONB 是核心 feature)
- ❌ SQLite(本地开发也用 Postgres,环境一致性优先)
- ❌ 多 DB 实例(V1 单库)

### 3.5 Python 包

- ❌ pandas(数据流用 list[dict] + Pydantic,见 ADR-007)
- ❌ numpy(V1 没有数值计算)
- ❌ requests(用 httpx)
- ❌ BeautifulSoup(用 selectolax)
- ❌ scrapy
- ❌ poetry / pipenv / pip-tools(用 uv)
- ❌ black / isort / flake8 / pylint(用 ruff)
- ❌ SQLModel(见 §2.3)
- ❌ 任何 ORM 之外的"查询构建器"(SQLAlchemy core 是 fallback)

### 3.6 前端/UI

- ❌ React / Vue / Svelte(V1 不写 SPA)
- ❌ 自定义 HTML 模板
- ❌ Tailwind / 其他 CSS 框架
- ❌ i18n 框架(英文 listing + 中文段落硬写在 prompt 里)

### 3.7 业务功能

- ❌ 用户注册/登录系统(账号写死在 secrets.toml)
- ❌ RBAC / 权限矩阵
- ❌ 多租户隔离逻辑(`agent_id` 外键留着,但只有 1 个 agent)
- ❌ Stripe / 付费(Phase 2)
- ❌ MLS 集成(法务 + 数据费,Phase 2+)
- ❌ 移动 App / PWA
- ❌ 实时协作 / WebSocket
- ❌ 短视频 / AI 图片生成(Phase 3)
- ❌ 一键发社交媒体
- ❌ CRM / follow-up 提醒
- ❌ 邮件营销 sequence(Resend 只用来发单封通知)

---

## 4. 已拍板的边界决策(灰区里的"就这么定")

这些不是"禁止",是"V1 里就这么定不要再讨论":

| 项 | 决策 | 理由 |
|---|---|---|
| **agent_id 外键** | Day 1 就建,所有 query 强制 `where agent_id = ?` | V2 切多租户零业务改动 |
| **prompt 版本号** | 每条 LLM 调用写库时记 `prompt_version` | ground truth 留痕,模型升级对比 |
| **schema_version 字段** | Pydantic 顶层模型必带 `schema_version: Literal["v1"]` | 演化时强制反序列化校验 |
| **JSONB 列** | enrichment 结果存 JSONB,不拆细表 | V1 schema 频繁演化,JSONB 是缓冲 |
| **不写迁移就不许改 schema** | Alembic 强制 | 防止"手改一下"积累债 |
| **secrets** | `.env` + `streamlit/secrets.toml`,**永不进 git** | `.gitignore` Day 1 配死 |
| **API key 轮换** | Anthropic / Mapbox / Walk Score 各一份,不复用 | 一个泄露不爆全部 |
| **日志** | `structlog` JSON 输出,落本地文件,不上 CloudWatch/Datadog | V1 1 个用户不需要可观测平台 |
| **错误处理** | LLM 调用失败 → 重试 3 次指数退避 → 最终失败写 `enrichment_errors` 表 | 不静默吞,不疯狂重试 |
| **时区** | 全部存 UTC,Streamlit 渲染时转 `America/Los_Angeles` | 笑云在湾区 |

---

## 5. "需要停下来问项目主"的清单

Claude Code 遇到下面任何一种情况,**必须停下来在 chat 里问**,不许自作主张:

1. 想引入 §3 任何一个禁止清单里的东西
2. 想改 4 张核心表的 schema(`agents` / `leads` / `listings` / `neighborhoods`)
3. 想升 prompt 版本号(prompt 内容大改)
4. 想加新的外部 API 依赖(Mapbox / Census / Walk Score / Google Places / Anthropic / Resend 之外)
5. 想改 `pyproject.toml` 的 prod 依赖(dev 依赖随便)
6. 想改 `alembic.ini` / `streamlit/config.toml` / `.env.example` 这类全局配置
7. 想动 §1 的"项目身份"任何字段
8. 想跳过测试 / 跳过类型检查 / 跳过 pre-commit
9. 任何涉及"删数据库表"或"drop column"的迁移

**把"问"当成默认行为,不要把"自动决策"当成默认行为。**

---

## 6. ADR(Architecture Decision Records)

格式:`ADR-NNN: 标题` / Status / Context / Decision / Consequences。
**不删旧 ADR,反转就新增 Supersedes。**

---

### ADR-001: 主语言用 Python 而非 Java/TypeScript

- **Status**: Accepted (2026-06-02)
- **Context**: 项目主 Java 专家(JVM/分布式/搜索引擎),Python 中等(ops/数据),TS 零基础。V1 本质是"数据管道 + LLM 调用 + 薄 UI",不是 web app。时间盒 9 天 30 小时。
- **Decision**: Python 3.12。
- **Rationale**:
  1. Java 强项(GC/虚拟线程/Lucene/共识)在这个项目 0 用武之地
  2. LLM 生态 Python 一等公民,Java/TS 滞后半年到一年
  3. Claude Code 写 Python 明显比 Java 强,符合"AI agent 10x"目标
  4. TS 从零学的 10-15 小时砸到 prompt 调优 ROI 更高
  5. V2 切前端语言时,核心资产(schema / prompt / ground truth)语言无关
- **Consequences**:
  - (+) 时间盒可达成
  - (+) 与 Path-3 长期方向(agent 编排、评估)对齐
  - (−) Java 经验在本项目几乎不增值(可接受 — 这是 R&D 项目不是绩效项目)

### ADR-002: 包管理用 uv 不用 poetry/pip

- **Status**: Accepted
- **Context**: 包管理是新人项目第一道摩擦,Claude Code 也常踩坑。
- **Decision**: uv。
- **Rationale**: 比 pip 快 10-100x,锁文件确定性强,2026 年已经是社区主流方向。
- **Consequences**: 学习成本 ~30 分钟,Claude Code 不熟时会试图用 pip,需要在 CLAUDE.md 强调。

### ADR-003: UI 用 Streamlit 不用 FastAPI+Jinja+HTMX

- **Status**: Accepted
- **Context**: V1 admin-only,1 个用户,只需"看表格、点按钮、看结果"。
- **Decision**: Streamlit。
- **Rationale**: 把"前端"概念从脑子里删掉,30 行能实现"上传 CSV → 跑 enrichment → 看结果"。V2 改公开网站时核心资产不丢。
- **Consequences**:
  - (+) 节省 5-8h
  - (−) 样式自由度低(V1 不需要)
  - (−) V2 公开网站要换栈(已规划,可接受)

### ADR-004: 数据校验用 Pydantic v2

- **Status**: Accepted
- **Context**: LLM 输出必须结构化校验,等价 TS 生态的 zod。
- **Decision**: Pydantic v2(不是 v1)。
- **Rationale**: v2 性能 5-50x,API 已稳定,SQLAlchemy/Streamlit/Anthropic SDK 全兼容。
- **Consequences**: Claude Code 偶尔会生成 v1 风格代码(`@validator` 而非 `@field_validator`),CLAUDE.md 已强调。

### ADR-005: LLM 走 Anthropic API key 不走 Bedrock

- **Status**: Accepted (Supersedes 之前架构稿里的 Bedrock 路线)
- **Context**: 之前考虑走 AWS Bedrock(因为项目主 AWS 背景),但 V1 没有 IAM/合规需求。
- **Decision**: `anthropic` SDK + `ANTHROPIC_API_KEY` 直连。
- **Rationale**: 不用配 IAM、不用 boto3、错误信息更直观、模型新版上线更快。
- **Consequences**: V2 真要切 Bedrock,只换 client 初始化一行,业务零改动。

### ADR-006: 不用 langchain / llama-index

- **Status**: Accepted
- **Context**: 框架 vs 直调 SDK 的老问题。
- **Decision**: 直接 `anthropic.messages.create(...)` + Pydantic 结构化输出。
- **Rationale**:
  1. V1 prompt 调用模式简单(单轮 / 短上下文 / 结构化输出)
  2. langchain 抽象漏出多,debug LLM 问题时反而成障碍
  3. 项目主 Path-3 目标是"理解 agent 内部",框架黑盒化反方向
- **Consequences**: V2 真需要多 agent 编排时,**直接上 LangGraph 而非 langchain**(LangGraph 抽象更克制)。

### ADR-007: 不用 pandas

- **Status**: Accepted
- **Context**: 数据科学背景的人写 Python 习惯性 `import pandas as pd`。
- **Decision**: 数据流用 `list[dict]` 或 `list[PydanticModel]`。
- **Rationale**:
  1. V1 数据量 1-2 万条,纯 Python 处理无瓶颈
  2. pandas 200MB 依赖 + 启动慢
  3. Pydantic 校验 + 类型提示已经够用
  4. CSV 摄取/导出用 stdlib `csv` 模块
- **Consequences**: V2 真需要群体分析(如全 zip 聚合)时再加,届时单文件孤立用,不污染主流程。

### ADR-008: 后台任务用 APScheduler 不用 Celery

- **Status**: Accepted
- **Context**: V1 后台任务只有"夜间批量跑 enrichment""定时刷 Walk Score"这类轻活。
- **Decision**: APScheduler in-process。
- **Rationale**: Celery 需要独立 worker + Redis broker + 部署复杂度,V1 单进程就够。
- **Consequences**: V2 任务量 100x 时切 Celery / Temporal,届时 enrichment 函数本身不动,只换调度层。

### ADR-009: 时间盒 9 天 30 小时(2026-06-02 → 2026-06-10)

- **Status**: Accepted
- **Context**: 项目主全职 AWS SDM,V1 只能用业余时间。
- **Decision**: 时间盒强约束,任何超出范围的功能 → 砍 / 推 V2。
- **Consequences**: 任何"再加个 X 就好了"的诱惑 → 默认拒绝,必须有 ADR 才能扩。

### ADR-010: V1 不买域名

- **Status**: Accepted
- **Context**: 笑云演示用,1 个用户。
- **Decision**: ngrok 临时链接 + EC2 公网 IP。
- **Rationale**: 域名 + DNS + HTTPS 证书 = 2-3h 摩擦,且选名字会陷进"完美主义陷阱"(已经在 chat 里证明过)。V1 验证完了再买。
- **Consequences**: 笑云可能问"为啥是 ngrok 链接" → 一句话解释:V1 验证阶段。

---

## 7. 决策回顾节奏

- **每个 phase 结束**(V1 完成 / V1.5 完成):重看本文件,把"V1 不做"逐条评估是否要解锁
- **遇到 §5 任何一项**:停下,在 chat 对齐,有结论就开新 ADR
- **跨 session 找不到决策依据**:先 `grep` 本文件,再问

---

**铁律:这份文件是项目的"宪法",代码可以改,DECISIONS 不能默默改。**
