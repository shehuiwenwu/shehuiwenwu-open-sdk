# 接口详解

- **Base URL**：`https://open.shehuiwenwu.com/api/v1/invoke`
- **方法**：全部为 `POST`
- **认证**：请求头 `Authorization: Bearer <API_KEY>`
- **内容类型**：JSON 类接口用 `application/json`；含本地图片的接口用 `multipart/form-data`

> 所有输出均为**公开信息查询与特征比对结果，不构成鉴定意见**。

## 目录

1. [企业工商核验 `credit_biz`](#credit_biz)
2. [文物资质核验 `credit_qual`](#credit_qual)
3. [信用评分 `credit_score`](#credit_score)
4. [企业公开信息 `credit_news`](#credit_news)
5. [被盗（丢失）文物比对 `circ_*`](#circ)
6. [出土特征 / 材质断代 / 综合审核](#analysis)
7. [错误码](#errors)

---

## 1. credit_biz —— 企业工商核验 <a id="credit_biz"></a>

**入参**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `company` | string | 二选一 | 企业名称 |
| `uscc` | string | 二选一 | 统一社会信用代码（比名称更准）|
| `refresh` | int | 否 | 传 `1` 强制刷新快照（可能产生额外费用）|

**主要返回字段**：`data.item.name` / `uscc` / `reg_status` / `company_type` / `legal` /
`capital` / `paid_capital` / `start_date` / `industry` / `address` / `region` / `risks` / `tags` / `snapshot_date`

---

## 2. credit_qual —— 文物资质核验 <a id="credit_qual"></a>

文物商店 / 文物拍卖企业的**经营许可证**核验。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `company` | string | 二选一 | 企业名称 |
| `uscc` | string | 二选一 | 统一社会信用代码 |
| `with_activity` | int | 否 | 传 `1` 附带经营动态 |

**主要返回字段**：`data.item.qual_valid` / `qual_status` / `qual_status_desc` / `biz_type` /
`license_num` / `serial_num`

---

## 3. credit_score —— 信用评分 <a id="credit_score"></a>

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `company` / `uscc` | string | 二选一 | 同前 |
| `with_benchmark` | int | 否 | 传 `1` 附带同业对标 |

---

## 4. credit_news —— 企业公开信息 <a id="credit_news"></a>

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `company` / `uscc` | string | 二选一 | 同前 |
| `with_references` | int | 否 | 传 `1` 附带出处链接 |

---

## 5. 被盗（丢失）文物比对 `circ_*` <a id="circ"></a>

**九个接口**，按「比对范围 × 比对模式」组合：

| 范围 | local（本地视觉特征）| semantic（向量语义）| hybrid（混合·推荐）|
|---|---|---|---|
| 国内 | `circ_cn_local` | `circ_cn_semantic` | `circ_cn_hybrid` |
| 境外 | `circ_abroad_local` | `circ_abroad_semantic` | `circ_abroad_hybrid` |
| 境内外 | `circ_both_local` | `circ_both_semantic` | `circ_both_hybrid` |

**模式怎么选**

- `local` —— 快、稳，**适合大批量初筛**（先跑一遍，命中可疑的再用别的模式复核）
- `semantic` —— 更宽容，**拍摄角度/光线差异大**时更有效
- `hybrid` —— 兼顾两者，**单张精查推荐**

**入参**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `image` | file | 二选一 | 图片文件（multipart 上传）|
| `images_base64` | string[] | 二选一 | 图片 Base64 数组（**支持多图**，多角度一起比对准确率更高）|
| `text` | string | 否 | 补充文字描述（器型、纹饰、款识等）|
| `top_k` | int | 否 | 返回条数 |
| `threshold` | float | 否 | 相似度阈值 0~1（仅 semantic / hybrid 支持）|

---

## 6. 出土特征 / 材质断代 / 综合审核 <a id="analysis"></a>

| 接口 | 用途 | 入参 |
|---|---|---|
| `circ_unearthed` | 出土特征分析 | `image` / `images_base64` / `text` |
| `circ_material_era` | 材质与年代**参考**分析 | 同上 |
| `circ_full_review` | 综合审核（一次给出多维结果）| 同上 |

> `circ_material_era` 输出的是**参考线索**（可能范围 + 判断依据），**不是断代结论**。

---

## 7. 错误码 <a id="errors"></a>

| code | HTTP | 说明 | 处理建议 |
|---|---|---|---|
| `bad_key` | 401 | 密钥缺失、错误或已停用 | 检查 `Authorization` 头格式与密钥状态 |
| `insufficient_balance` | 402 | 余额不足 | 到开放平台充值 |
| `invalid_param` | 400 | 参数缺失或格式错误 | 核对参数名与类型 |
| `rate_limited` | 429 | 请求过于频繁 | 退避重试 |
| `upstream_error` | 502 | 上游数据源异常 | 可重试 |

> ⚠️ **实测提示**：401 场景下接口实际返回的是 **`bad_key`**，
> 而平台内部文档曾写作 `invalid_key` —— 本 SDK 两个码都当 401 处理。

**业务失败时也可能返回 HTTP 200 + `{ "code": "..." }`**，请以 `code` 字段为准，不要只看 HTTP 状态码。

## 计费补充

- 按次计费；建议在业务侧对**同一 `uscc`** / **同一图片**做本地缓存，避免重复计费
- `refresh=1`、多次图片比对会各自计入
