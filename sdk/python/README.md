# shehuiwenwu · Python SDK

社会文物网开放平台 Python 客户端。零依赖（仅标准库）。

- 官网：<https://www.shehuiwenwu.com>
- 开放平台：<https://open.shehuiwenwu.com>

## 安装

```bash
pip install shehuiwenwu
```

或直接把 `shehuiwenwu/__init__.py` 拷进你的项目。

## 用法

```python
import os
from shehuiwenwu import Client, ShehuiwenwuError

client = Client(api_key=os.environ["RELICS_API_KEY"])

# 文物资质核验
r = client.credit_qual(company="北京中博国际拍卖有限公司")
print(r["data"]["item"]["qual_status_desc"])

# 被盗（丢失）文物比对（混合模式）
r = client.circ_cn_hybrid(image="./relic.jpg", top_k=5, threshold=0.75)
for it in r["data"].get("items", []):
    print(it)

try:
    client.credit_biz(uscc="91110000100000000X")
except ShehuiwenwuError as e:
    print(e.code, e)   # 如 insufficient_balance
```
