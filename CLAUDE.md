# CLAUDE.md — Vicinity 项目宪法

> 这份文件是 Claude Code 在本仓库工作时的"宪法"。每次会话开始,默认遵守这里的所有约束。
> 如果某条约束和当前任务冲突,**停下来问用户**,不要自己改约束。

---

## 0. 项目主与协作风格

- **项目主**:AWS SDM,JVM/分布式/搜索引擎背景,Python 熟,full-stack web 不是日常。即将带 AgentCore Evaluations 团队。
- **风格要求**:
  - 跳过基础解释:**不要解释 Java/JVM/GC/分布式/SQL/Linux 基础**
  - **Web 框架、前端、ORM、部署平台**这些 full-stack 概念可以 2-3 行解释,但不要长篇大论
  - 先确认范围再写代码 — 用户给一个模糊需求,先反问/列假设,**不要直接动手**
  - 不堆 emoji、不 cheerleading、不要 "Great question!"
  - 输出结构化:列表 / 表格 / 代码块,不要散文
  - 中文回复(用户 Claude Code 用中文交互)

---

## 1. 技术栈(锁死,不许改)

| 层 | 选型 |
|---|---|
| 语言 | **Python 3.12** |
| Web/UI | **Streamlit 1.40+** |
| LLM | **anthropic SDK + ANTHROPIC_API_KEY 直连**(不走 Bedrock) |
| DB | **Postgres 16**(本机 docker) |
| ORM | **SQLAlchemy 2.0**(同步 API,2.0 风格) |
| 数据校验 | **Pydantic v2** |
| Migration | **Alembic** |
| HTTP | **httpx**(同步+异步) |
| 配置 | **pydantic-settings** |
| 包管理 | **uv** |
| 测试 | **pytest** + **pytest-asyncio** |
| Lint/format | **ruff**(代替 black/flake8/isort) |
| 类型检查 | **mypy**(strict 关键模块) |

### 禁止引入(没有用户书面同意,不准装)

- ❌ Django / Flask / FastAPI(V1 不要任何 web 框架,Streamlit 全包)
- ❌ Celery / RQ / dramatiq(V1 不要任务队列)
- ❌ Redis / memcached(V1 不要缓存层)
- ❌ langchain / llama-index / haystack(直接调 anthropic SDK)
- ❌ pandas(除非真的处理表格数据 — 一般 list[dict] + 列表推导式够)
- ❌ requests(用 httpx)
- ❌ poetry / pip-tools(用 uv)
- ❌ black / flake8 / isort(用 ruff)
- ❌ Docker Compose(只有 postgres + streamlit,`docker run` 两条够)
- ❌ Prisma / Tortoise ORM(用 SQLAlchemy)
- ❌ marshmallow / attrs(用 Pydantic)

**装新依赖必须 PR 描述里写理由 + 替代方案对比。**

---

## 2. 目录结构(创建新文件前对照)

```
vicinity/
├── app/                      # Streamlit 入口 — 只做 UI 和 form,业务逻辑全在 vicinity/ 包里
│   ├── Home.py
│   └── pages/
├── vicinity/                 # 业务包(import 用 from vicinity.xxx)
│   ├── clients/              # 外部 API,每家一文件,纯函数
│   ├── enrichment/           # pipeline + schema
│   ├── ai/                   # prompts + generator
│   ├── db/                   # models + session + queries
│   ├── config.py
│   └── auth.py
├── alembic/
├── tests/                    # 与 vicinity/ 镜像
├── pyproject.toml
└── .env.example
```

**铁律**:
- Streamlit 页面里**只能有 UI 代码**(st.xxx + form 处理)。任何 if/loop/外部调用 → 抽到 `vicinity/` 包对应模块
- 一个 client 一个文件,纯函数,不持有状态
- DB query 全走 `vicinity/db/queries.py`,UI/pipeline 不直接操作 ORM session 之外的 SQL

---

## 3. 代码风格

### Python 通用
- 类型注解强制:函数签名必须有 `def f(x: int) -> str:`
- 用 Python 3.10+ 的新写法:`list[int]` 而不是 `List[int]`,`X | None` 而不是 `Optional[X]`
- 异常:**不要裸 `except:` 或 `except Exception:`** — 抓具体异常,或者 `except Exception as e: log.error(...); raise`
- 不用 `print` debug,用 `logging`(用户 Java 出身,对日志规范敏感)
- f-string 优先,不用 `%` 或 `.format()`
- Pydantic 模型继承 `BaseModel`,字段都要类型注解和默认值

### SQLAlchemy 2.0 风格
```python
# ✅ 正确(2.0 风格)
from sqlalchemy import select
result = session.execute(select(Listing).where(Listing.agent_id == agent_id))
listings = result.scalars().all()

# ❌ 错误(1.x 旧风格)
listings = session.query(Listing).filter_by(agent_id=agent_id).all()
```

### Pydantic v2 风格
```python
# ✅ v2
class Foo(BaseModel):
    name: str
    age: int = 0
    model_config = {"frozen": True}

# ❌ v1(class Config:、@validator)— 全部用 v2 的 model_config 和 @field_validator
```

### asyncio
- 只在 `vicinity/enrichment/pipeline.py` 内部用 async/await
- 外层调用一律 `asyncio.run(pipeline.run(...))`,Streamlit 不直接跑 async
- `asyncio.gather(..., return_exceptions=True)` 永远配 — 不要让一个失败炸全部
- httpx async client 必须 `async with`,不要漏关

---

## 4. 必踩陷阱(每条都来自现实事故)

- ✅ httpx 默认**无 timeout** — 所有外部调用 `httpx.AsyncClient(timeout=10.0)`
- ✅ `asyncio.gather(...)` 不加 `return_exceptions=True` 一个失败全炸
- ✅ Streamlit 主线程同步,不能 `await` — 用 `asyncio.run()` 包一下
- ✅ Streamlit `st.session_state` 跨 rerun 持久,但跨用户不持久
- ✅ Streamlit 每次交互整个脚本重跑 — 重计算昂贵的东西用 `@st.cache_data` 或 `@st.cache_resource`
- ✅ SQLAlchemy session 必须 `with Session() as s:` 或显式 close,泄露会卡死连接池
- ✅ Pydantic v2 序列化用 `.model_dump()` 不是 v1 的 `.dict()`
- ✅ Anthropic API 调用失败要重试(429/500/timeout),用 tenacity 或手写指数回退
- ✅ 外部 API key 永远从 `vicinity/config.py` 读,不要散落在 client 里
- ✅ enrichment_runs 表每次 pipeline run 必写,不管成败

---

## 5. Git / PR 规范

- 一个功能一个分支:`feat/enrichment-pipeline`、`fix/walkscore-timeout`
- commit message 用英文 + conventional commits:`feat: add census client`、`fix(pipeline): handle gather exceptions`
- PR 描述模板:
  ```
  ## 改了什么
  ## 为什么
  ## 怎么验证
  ## 引入新依赖?(列出 + 理由)
  ## 改了 schema?(列出 + 是否生成 migration)
  ```

---

## 6. 测试

- 关键路径必须有 test:enrichment pipeline、AI generator、所有 client 的 happy path
- client tests 用 `respx` 或 `httpx` mock,**不要真的打外部 API**
- AI 调用测试 mock anthropic client,断言"调用了 messages.create + 参数对"
- DB tests 用 in-memory sqlite 或一次性 postgres schema
- `pytest -x` 一票否决,CI 跑全套

---

## 7. 配置 / 环境变量

所有配置走 `vicinity/config.py`:

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    anthropic_api_key: str
    database_url: str = "postgresql://localhost:5432/vicinity"
    mapbox_token: str
    census_api_key: str | None = None  # public, optional
    walkscore_key: str
    google_places_key: str
    resend_key: str

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

settings = Settings()  # import 时校验
```

`.env.example` 永远和 `Settings` 字段同步。

---

## 8. AI Prompt 规范

- 所有 prompt 在 `vicinity/ai/prompts.py`,版本化:`PROMPT_LISTING_STORY_V1`
- prompt 字符串用 `textwrap.dedent` + 三引号,缩进对齐
- prompt 里需要插值的变量用 `{var}` + `.format(**kwargs)`,**不要 f-string**(避免 prompt 里的 `{}` 被当成变量)
- 任何 prompt 改动 → 升版本号 V2,**不要原地改 V1** — `generated_content.prompt_version` 是 ground truth 数据集的关键
- LLM 输出要结构化:让 Claude 返回 JSON,Pydantic 校验,失败一次重试一次

---

## 9. 数据库 Migration

- 任何 schema 改动 → `alembic revision --autogenerate -m "add xxx column"`
- 生成的 migration **必须人工 review**(autogenerate 不完美,尤其是 enum、index、constraint)
- 跑前先 `alembic upgrade head --sql` 看 SQL,确认没炸生产数据
- migration 不可逆的 → PR 里明确标注

---

## 10. 性能 / 成本红线

- Phase 1 月度 API 总成本 < $50
- Anthropic 单次调用 max_tokens ≤ 2000,prompt + 输出 token 估好
- 任一 listing enrichment 端到端 ≤ 60 秒(Mapbox/Census/WalkScore/Places 总和 + 1 次 Claude)
- 超时一律 10s,Anthropic 单调用 30s

---

## 11. 安全

- API key 永远只出现在:`.env`(本机)、Fly.io secrets(部署)、`vicinity/config.py` 读取
- **绝不**把 key 写进代码、committed config、prompt 字符串
- Streamlit `secrets.toml` 别 commit,加 `.gitignore`
- 公开 listing 页(`/l/?slug=xxx`)不渲染任何 agent 私有数据(电话/邮箱)
- lead 表单做基本校验:邮箱格式、长度上限,不接受 HTML
- SQLAlchemy 用参数化查询(默认就是),**不要拼字符串 SQL**

---

## 12. 沟通风格(对用户)

- 用户问"这个怎么做",**先列 2-3 个方案 + 取舍**,再问选哪个,**不要直接 dump 代码**
- 改超过 3 个文件前,**先列改动清单等用户点头**
- 不确定就说"不确定",不要编造 API 行为或库特性
- 引用文档前先用 web/官方源验证,不要凭记忆 — 库版本会变

---

## 13. 当用户说这些时

| 用户说 | 你做 |
|---|---|
| "随便写一下" / "你看着办" | 仍然先列 1-2 个方案,**不要默认直接写**(用户严格 SDM,jump-the-gun 会被 push back) |
| "改一下 X" | 先 grep 找 X 在哪些文件,列影响范围,等确认 |
| "测试一下" | 跑 `pytest`,把失败 trace 完整贴出,不要只贴"x failed" |
| "部署" | 列步骤 + 风险点,等确认再执行 |
| "为什么 X 不工作" | 走系统调试:复现 → 二分 → 看日志 → 提假设 → 验证。**不要瞎猜然后改代码** |

---

## 14. 必须停下来问用户的情况(不要自作主张)

- 改数据库 schema(加表/改列/删列)
- 升 prompt 版本(影响所有历史数据解读)
- 装新生产依赖(违反 §1 禁止清单)
- 改 `pyproject.toml` / `alembic.ini` / `.env.example` / `CLAUDE.md` / `ARCHITECTURE.md` / `DECISIONS.md`
- 删除任何文件
- 改 git 远程或 force push

---

## 15. 反模式(Claude Code 最爱犯,提前堵)

- ❌ "我加个 Redis 缓存吧" → V1 不许碰
- ❌ "我把这个改成 langchain" → 直接 anthropic SDK
- ❌ "装个 lodash 风格的工具库" → 标准库够
- ❌ "把 Streamlit 换成 FastAPI 这样更灵活" → V1 不换
- ❌ "我顺便重构一下这个文件" → 不要顺便,聚焦当前任务
- ❌ "为了健壮性加重试装饰器吧" → 只在外部 IO 加,不要给纯函数加
- ❌ "把同步改成异步吧" → 只有 enrichment pipeline 内部异步,Streamlit 层一律同步

---

## 16. 自检 checklist(每次提交前)

- [ ] `ruff check .` 通过
- [ ] `mypy vicinity/` 通过(关键模块)
- [ ] `pytest` 通过
- [ ] 没引入禁止依赖
- [ ] 没硬编码 API key
- [ ] 没写裸 except
- [ ] 改了 schema → 生成了 migration
- [ ] 改了 prompt → 升了版本号
- [ ] 改了 `.env` 字段 → 同步更新 `.env.example` 和 `Settings`
