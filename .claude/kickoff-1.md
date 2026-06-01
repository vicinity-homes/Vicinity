# Vicinity — Claude Code 开工任务 #1

> 把这整份文档整体粘到 Claude Code 里(在 `~/code/vicinity` 目录启动后)。
> 它已经能在仓库里读到 `CLAUDE.md` / `ARCHITECTURE.md` / `DECISIONS.md`。

---

## 你是谁、在哪个项目

你是这个仓库的 coding 主力。项目根目录有三份必读文档:

- `CLAUDE.md` — 协作风格、禁止行为、必须停下来问的清单
- `ARCHITECTURE.md` — V1 技术架构(Python + Streamlit + SQLAlchemy + Pydantic + Anthropic API key 直连)
- `DECISIONS.md` — 已拍板决策 + 10 条 ADR + 禁止依赖清单

**开工前先把这三份完整读一遍**,本任务的所有约束以这三份为准,本文档与它们冲突时以它们为准。

---

## 本次任务范围(只做这三件事)

按依赖顺序产出以下文件,不要多做、不要少做:

1. `pyproject.toml` + `uv.lock`(用 `uv` 初始化,见下方约束)
2. `.env.example`
3. `vicinity/db/models.py`(SQLAlchemy 2.0 declarative,4 张表)
4. `vicinity/enrichment/schema.py`(Pydantic v2,业务契约)
5. `alembic.ini` + `alembic/` 目录初始化 + 第一次 migration(把 4 张表建出来)

**不要做**的事:不要写 client(Mapbox/Census/...)、不要写 pipeline、不要写 Streamlit 页面、不要写 prompt、不要写测试以外的业务代码。这些是后续任务。

---

## 硬约束(违反就停下来问)

1. **包管理只用 `uv`**。不要 pip、不要 poetry、不要 pipenv。命令形如 `uv init`、`uv add sqlalchemy`、`uv run alembic ...`。
2. **Python 版本钉 3.12**(`requires-python = ">=3.12,<3.13"`)。
3. **依赖白名单**(本任务允许 add 的,只有这些):
   - `streamlit`
   - `sqlalchemy>=2.0`
   - `psycopg[binary]`(Postgres driver,SQLAlchemy 2.0 推荐用 psycopg3 而不是 psycopg2)
   - `alembic`
   - `pydantic>=2`
   - `pydantic-settings`(读 .env,简洁)
   - `anthropic`
   - `httpx`
   - `python-dotenv` 不要装,统一用 `pydantic-settings`
   - dev 组:`pytest`、`pytest-asyncio`、`ruff`、`mypy`
4. **禁止引入** 任何 `DECISIONS.md §3` 列出的库(Django/Flask/FastAPI/langchain/llama-index/pandas/celery/redis/...)。如有疑问 → 停下问,不要自己拍。
5. **不要硬编码 agent_id=1**。schema 里 `listings.agent_id` 是 FK,Day 1 就建好。
6. **不要把 secret 写进任何 commit 的文件**。`.env.example` 只放 key 名 + 占位说明,不放真值。
7. 所有时间字段统一 `timezone=True`(`TIMESTAMPTZ`)。
8. `id` 字段统一 `uuid`,默认值用 `uuid.uuid4`(SQLAlchemy 层生成,不依赖 DB extension)。
9. **不要装 `pgcrypto` / `uuid-ossp` 这类 Postgres 扩展**,V1 不要 DB 侧依赖。

---

## 文件级要求

### 1) `pyproject.toml`

- `uv init --package vicinity`(或等价命令)生成骨架
- 项目名 `vicinity`,version `0.1.0`,description 写一句话:"Listing landing pages for North America Chinese real estate agents"
- `[tool.ruff]`:line-length 100,target-version py312
- `[tool.mypy]`:strict = true,但允许 `ignore_missing_imports = true`(SQLAlchemy/Streamlit 类型有缺)
- `[tool.pytest.ini_options]`:`asyncio_mode = "auto"`

### 2) `.env.example`

按 `ARCHITECTURE.md §13` 的外部服务清单列全。每行一个 `KEY=` 后面跟简短注释(从哪儿拿)。至少包括:

```
# Postgres
DATABASE_URL=postgresql+psycopg://vicinity:vicinity@localhost:5432/vicinity

# Anthropic (https://console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-...

# Mapbox (https://account.mapbox.com)
MAPBOX_TOKEN=

# Census ACS (https://api.census.gov/data/key_signup.html, free)
CENSUS_API_KEY=

# Walk Score (https://www.walkscore.com/professional/api-sign-up.php)
WALKSCORE_API_KEY=

# Google Places (https://console.cloud.google.com)
GOOGLE_PLACES_API_KEY=

# Resend (https://resend.com)
RESEND_API_KEY=

# Streamlit admin password (V1 共享密码)
ADMIN_PASSWORD=changeme
```

外加一份 `vicinity/config.py` 用 `pydantic-settings` 把上面这些读进来,字段名小写 + `BaseSettings`。这份小文件可以一并出。

### 3) `vicinity/db/models.py`

SQLAlchemy 2.0 风格(`DeclarativeBase` + `Mapped[...] / mapped_column(...)`),不要用旧式 `Column`。

四张表严格按 `ARCHITECTURE.md §4`:

- `agents`(id, email unique, name, phone, avatar_url, brokerage, created_at)
- `listings`(id, agent_id FK, slug unique, address, lat, lng, status, raw_input JSONB, neighborhood_data JSONB, generated_content JSONB, created_at, updated_at)
- `leads`(id, listing_id FK, name, email, phone, message, source, created_at)
- `enrichment_runs`(id, listing_id FK, started_at, finished_at, status, error, trace_id, raw_responses JSONB)

要求:
- `JSONB` 用 `from sqlalchemy.dialects.postgresql import JSONB`
- 关系双向:`Agent.listings = relationship(...)`、`Listing.agent`、`Listing.leads`、`Listing.runs`
- `status` 用 `Literal` 注释 + `String` 列(不要上 enum 类型,V1 留弹性)
- 写一个 `Base = declarative_base()` 等价物
- 文件头 docstring 注明:"Schema source of truth = ARCHITECTURE.md §4. Changing this file = ADR required (see DECISIONS.md §5)."

### 4) `vicinity/enrichment/schema.py`

Pydantic v2,完全照搬 `ARCHITECTURE.md §14` 的草稿(`GeoData / Demographics / Scores / Poi / Pois / NeighborhoodData`),并补一个 `GeneratedContent`(参考 §6)。

- 所有 model 加 `model_config = ConfigDict(frozen=True)`(契约不可变)
- `NeighborhoodData.schema_version: Literal["v1"] = "v1"`
- `GeneratedContent.prompt_version: Literal["v1"] = "v1"`
- 文件头 docstring:"Business contracts. Bumping schema_version / prompt_version = ADR required."

### 5) Alembic 初始化

- `uv run alembic init alembic`
- 改 `alembic/env.py`:从 `vicinity.config.settings.database_url` 读连接串;从 `vicinity.db.models.Base.metadata` 读 target_metadata
- 生成第一次 migration:`uv run alembic revision --autogenerate -m "init: agents, listings, leads, enrichment_runs"`
- 不要在本任务里跑 `alembic upgrade head`(我会自己跑,确认 migration SQL 看起来对再 apply)

---

## 交付前自检

跑通这几条,跑不通就修到通:

```bash
uv sync
uv run ruff check .
uv run mypy vicinity
uv run python -c "from vicinity.db import models; from vicinity.enrichment import schema; print('ok')"
```

`alembic` 那一步不需要本地连真 Postgres 才能 generate(autogenerate 需要连 DB,如果你本地没 docker postgres,就先 `docker run --rm -d -p 5432:5432 -e POSTGRES_PASSWORD=vicinity -e POSTGRES_USER=vicinity -e POSTGRES_DB=vicinity postgres:16` 起一个,做完后停掉)。

---

## 交付时回答这 4 个问题

代码写完后,在最后一条消息里回答:

1. 哪些地方你做了 `ARCHITECTURE.md` / `DECISIONS.md` 没明确的判断?(列出来,我会决定要不要补 ADR)
2. 有没有触发"必须停下来问"清单的情况?(`DECISIONS.md §5`)
3. `pyproject.toml` 最终装了哪些依赖?(列全,我对照白名单)
4. `alembic revision --autogenerate` 出来的 SQL 有没有看着不对的地方?(列出 CREATE TABLE 顺序、外键、索引)

---

## 风格提醒(`CLAUDE.md` 已写,这里再点一次)

- 我是 AWS SDM,Java/JVM/分布式专家,Python 熟,full-stack 概念偶尔需要解释
- 不要堆 emoji,不要 "Great question!",不要无意义复述
- 决策类问题先停下问,不要自己拍
- 输出代码时少加 `# This is a comment that says obvious thing`,有用的注释才写

开工。
