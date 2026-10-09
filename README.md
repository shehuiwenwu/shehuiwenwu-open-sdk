# 社会文物网 · 开放平台 SDK

> **文物资质核验 · 工商核验 · 信用评分 · 被盗（丢失）文物比对 · 材质断代**
> 官网：[社会文物网](https://www.shehuiwenwu.com) ｜ 开放平台：[open.shehuiwenwu.com](https://open.shehuiwenwu.com) ｜ 接口文档：[docs/api.md](docs/api.md)

面向文物经营、鉴定、拍卖、收藏与风控场景的开放接口。本仓库提供 **Node.js / Python** 官方 SDK 与可直接运行的示例。

## 能力一览

| 接口 | 用途 |
|---|---|
| `credit_biz` | 企业工商核验（登记状态、法定代表人、注册资本、风险标签…）|
| `credit_qual` | **文物资质核验**（文物商店 / 文物拍卖经营许可证、编号、有效期）|
| `credit_score` | 信用评分（五维模型，支持同业对标）|
| `credit_news` | 企业相关公开信息与出处 |
| `circ_cn_*` | **国内被盗 / 丢失文物比对**（本地视觉特征 / 向量语义 / 混合）|
| `circ_abroad_*` | 境外被盗文物比对 |
| `circ_both_*` | 境内外联合比对 |
| `circ_unearthed` | 出土特征分析 |
| `circ_material_era` | 材质与年代参考分析 |
| `circ_full_review` | 综合审核（一次性给出多维结果）|

> 数据来源为公开名录、工商登记快照与官方公开被盗（丢失）文物数据；
> **所有输出均为参考信息，不构成鉴定意见**。

## 安装

**Node.js（≥ 18，零依赖）**
```bash
npm install shehuiwenwu
```

**Python（≥ 3.8，零依赖）**
```bash
pip install shehuiwenwu
```

> 也可以直接拷贝 `sdk/node/index.js` 或 `sdk/python/shehuiwenwu/__init__.py` 到你的项目里 —— 两者都不依赖任何第三方库。

## 快速开始

**Node.js**
```js
const { Client } = require('shehuiwenwu');

const client = new Client({ apiKey: process.env.RELICS_API_KEY });

// 1) 查一家文物拍卖企业的资质
const qual = await client.creditQual({ company: '北京中博国际拍卖有限公司' });
console.log(qual.data.item.qual_status_desc);

// 2) 拿一张器物图去比对国内被盗（丢失）文物库
const cmp = await client.circCnHybrid({ image: './relic.jpg', topK: 5 });
console.log(cmp.data.items);
```

**Python**
```python
from shehuiwenwu import Client

client = Client(api_key="YOUR_API_KEY")

print(client.credit_qual(company="北京中博国际拍卖有限公司")["data"]["item"]["qual_status_desc"])
print(client.circ_cn_hybrid(image="./relic.jpg", top_k=5)["data"]["items"])
```

**curl**
```bash
curl -X POST "https://open.shehuiwenwu.com/api/v1/invoke/credit_qual" \
  -H "Authorization: Bearer $RELICS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"company":"北京中博国际拍卖有限公司"}'
```

## 认证

所有接口使用同一个密钥，放在请求头：

```
Authorization: Bearer <API_KEY>
```

密钥在 [开放平台](https://open.shehuiwenwu.com) 控制台申请，接口按次计费，可先充值小额试用。

**⚠️ 切勿把密钥提交进 Git 仓库或写进前端代码。** 请用环境变量注入。

## 目录结构

```
sdk/node/         Node.js SDK
sdk/python/       Python SDK
examples/         可直接运行的示例（Node / Python / curl）
docs/api.md       接口详解（参数、返回、错误码）
```

## 计费与限额

- 按次计费，余额不足返回 `insufficient_balance`
- 图片类接口支持 `image`（文件上传）或 `images_base64`（Base64，多图）
- 建议在业务侧对同一 `uscc` / 同一图片做本地缓存，避免重复计费

## 错误码

| code | HTTP | 说明 |
|---|---|---|
| `bad_key` | 401 | 密钥缺失、错误或已停用 |
| `insufficient_balance` | 402 | 余额不足 |
| `invalid_param` | 400 | 参数缺失或格式错误 |
| `rate_limited` | 429 | 请求过于频繁 |
| `upstream_error` | 502 | 上游数据源异常，可重试 |

完整错误码见 [docs/api.md](docs/api.md)。

## 合规声明

- 本 SDK 提供的是**公开信息查询与特征比对**能力，输出**不构成鉴定意见**，不作为交易、担保或司法用途的唯一依据。
- 比对结果命中仅表示**特征相似**，需由专业人员进一步核实；请勿据此直接作出处置决定。
- 请遵守《中华人民共和国文物保护法》及相关法规，不得将本服务用于非法目的。

## 许可证

[MIT](LICENSE)
