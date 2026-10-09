#!/bin/bash
# 示例：不写代码，直接用 curl 调
# 用法：export RELICS_API_KEY=你的密钥 && bash examples/curl.sh

BASE="https://open.shehuiwenwu.com/api/v1/invoke"

echo "== 文物资质核验 =="
curl -s -X POST "$BASE/credit_qual" \
  -H "Authorization: Bearer $RELICS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"company":"北京中博国际拍卖有限公司"}'

echo -e "\n\n== 信用评分（含同业对标）=="
curl -s -X POST "$BASE/credit_score" \
  -H "Authorization: Bearer $RELICS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"company":"北京保利国际拍卖有限公司","with_benchmark":1}'
