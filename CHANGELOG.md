# Vicinity 更新日志 / Changelog

记录每次主要的产品功能和体验更新。最新的在最上面。
This file tracks user-facing product updates. Newest first.

---

## 2026-06-11 — 房源上传体验大升级

**填写更轻松**
- 每个字段加了红色 ⭐ Required / 灰色 Optional 标签 — 一眼看出哪些必填(只有 5 项:地址、价格、卧室、卫生间、至少一个视频),其它都可以晚点补
- 卧室、卫生间、房屋风格(Craftsman / Colonial / Modern…)改成下拉菜单,不用纠结格式
- 占地面积拆成"数字 + 单位(acres / sqft)"两栏

**自动保存**
- 删掉了"Save changes"按钮 — 改完字段它自己就存,右上角小徽章会显示 `Saving… → ✓ Saved`
- 点 Publish 时自动把没存完的强制存掉再发布,不会再出现"全填了还说缺字段"
- 关 tab 时还有未保存的会弹浏览器警告,防止丢失

**报错信息说人话**
- 发布失败时列出具体缺什么(如"价格"、"至少一个 ready 视频"),而不是英文字段名

---

## 2026-06-11 — 移动端 + Listing 浏览体验

**视频流体验对齐**
- `/v/[slug]` 单 listing 页的右侧操作栏(Schools / Nearby / Area / Sound)和 `/browse` 完全一致
- Contact 按钮不再卡住,所有页面统一用同一个联系表单
- 分享按钮改成直接复制链接,去掉了多余的弹窗

**移动端修复**
- 编辑页字段不再重叠
- 上传视频时标题自动清理(去掉文件名后缀)

---

## 2026-06-10 — 浏览体验 + Dashboard 升级

**TikTok 风格视频流上线**
- `/browse` 页改成上下滑动的视频流,体验对标短视频 demo
- 每个 listing 自带 Schools / Nearby / Area 切换,点一下就能看周边
- 左右滑动切换 b-roll(社区视频)
- 静音点一下就解锁,新增 `/browse` 顶栏的 Sound 静音开关

**Dashboard 改进**
- Listings 列表加了封面图、统计数据、可一键复制的公开 URL
- 移动端加了汉堡导航
- 新增分析功能:漏斗可视化 + 顶部 listing 排行榜
- 社交文案生成新增 Email tab

**经纪人个人主页**
- 新增 `/a/[agentSlug]` 经纪人主页,可单独分享

**导航统一**
- 全站点 Logo 都回首页;`/browse` 顶部的"View full listing"重复入口移除
- 移动端右上角 Back + Logo 成对显示

---

## 2026-06-10 — 登录认证升级

**密码登录**
- 邮箱+密码登录/注册上线(原来的 magic link 仍可用)
- 加了"忘记密码"流程,通过邮箱验证码(6-10 位)重置

**首页和登录页视觉重做**
- Landing 页对齐 demo:Pexels 真房产视频做 hero、双 CTA 按钮、How it works 三步流程
- 登录/注册页面统一 ink + gold 配色,iOS Safari 上不再白底白字

---

## 2026-06-09 — AI 文案 + 数据分析(Phase 6)

**AI 房源描述生成**
- 编辑房源时新增"✨ Generate description"按钮 — 一键生成英文房源文案
- 内置速率限制保护(防滥用)
- 同样的能力也覆盖到社交平台文案生成

**数据分析面板**
- Dashboard 新增分析:每个房源的浏览数、视频完播率、leads 来源
- 总览页有所有 listing 的汇总数据

---

## 2026-06-09 — Leads 系统(Phase 5)

**联系表单全流程打通**
- 公开页的 Contact 按钮 → 表单 → 自动写入 leads 表
- 新 lead 进来时,经纪人立刻收到邮件通知(Resend 发送)
- Dashboard 新增 `/dashboard/leads` 列表,实时更新
- 点进 lead 详情页可一键 mailto 回复
- 防重复提交 + zod 校验所有输入

---

## 2026-06-09 — 房源管理(Phase 4)

**新建 listing**
- 用 Google Places 自动补全地址,自动提取 city / neighborhood / state
- 一个房源可以传多个视频,拖拽排序
- 任选其中一个视频做封面

**社区(Community)概念**
- 房源可以归属于一个共享社区,共享学校 / 周边视频
- 经纪人可以在 `/dashboard/communities` 管理社区视频(school / poi / neighborhood 三类)

**生命周期管理**
- Draft → Publish 发布开关
- Archive 归档,可恢复;dashboard 有"显示已归档"切换

---

## 2026-06-09 — 公开浏览(Phase 3)

**TikTok 风格视频流第一版**
- 公开 listing 页 `/v/[slug]` 上线 — 视频自动播、划走切下一个
- 右侧 ActionRail 操作栏:点赞、分享、联系、Schools、Nearby、Area
- 视频用 HLS 流式播放,延迟低
- 分享到社交时自动生成 Open Graph + Twitter Card 卡片
- 全程埋点:页面浏览、卡片浏览、视频完播

---

## 2026-06-09 — Phase 1-2:基础架构上线

- 用户注册 / 登录 / RLS 权限隔离
- 视频上传到 Cloudflare Stream,后台异步转码
- Realtime 推送(基于 Supabase)
- 第一版 dashboard 框架

---

## 模板:每次 release 写什么

每次 push 到 main 后,在最顶上加一段:

```
## YYYY-MM-DD — 一句话标题(中文)

**主题 1**
- 用户能感知的变化(不写代码细节)

**主题 2**
- ...
```

不写技术 detail(不写文件名、不写库名、不写架构),只写"用户打开网站会看到 / 用到什么不一样"。
