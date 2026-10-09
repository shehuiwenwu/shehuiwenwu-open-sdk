# -*- coding: utf-8 -*-
"""示例：Python 快速开始

运行：RELICS_API_KEY=你的密钥 python3 examples/python-quickstart.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "sdk", "python"))

from shehuiwenwu import Client, ShehuiwenwuError  # noqa: E402

client = Client(api_key=os.environ.get("RELICS_API_KEY", ""))

try:
    r = client.credit_qual(company="北京中博国际拍卖有限公司")
    item = (r.get("data") or {}).get("item") or {}
    print("【文物资质】", item.get("qual_status_desc") or item)
except ShehuiwenwuError as e:
    print("调用失败：", e.code, e)
    if e.code in ("bad_key", "invalid_key"):
        print("请设置环境变量 RELICS_API_KEY（开放平台控制台申请）")
