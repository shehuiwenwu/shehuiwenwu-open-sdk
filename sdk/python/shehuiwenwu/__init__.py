# -*- coding: utf-8 -*-
"""
社会文物网 · 开放平台 Python SDK

文物资质核验 / 工商核验 / 信用评分 / 被盗（丢失）文物比对 / 材质断代
官网：https://www.shehuiwenwu.com
开放平台：https://open.shehuiwenwu.com

零依赖：仅使用标准库（urllib / json / uuid）。
输出为公开信息查询与特征比对结果，不构成鉴定意见。
"""
import base64
import json
import mimetypes
import os
import urllib.error
import urllib.request
import uuid

__version__ = "1.0.0"

DEFAULT_BASE = "https://open.shehuiwenwu.com/api/v1/invoke"
DEFAULT_TIMEOUT = 60


class ShehuiwenwuError(Exception):
    """接口调用失败。code 为平台业务错误码，如 bad_key / insufficient_balance。"""

    def __init__(self, code, message=None, status=None, payload=None):
        super().__init__(message or code or "request_failed")
        self.code = code
        self.status = status
        self.payload = payload


class Client:
    """社会文物网开放平台客户端。

    :param api_key: 开放平台密钥。请用环境变量注入，不要写死在代码里。
    :param base_url: 默认 https://open.shehuiwenwu.com/api/v1/invoke
    :param timeout: 单次请求超时秒数，默认 60
    """

    def __init__(self, api_key, base_url=DEFAULT_BASE, timeout=DEFAULT_TIMEOUT):
        if not api_key:
            raise ValueError("api_key 必填：Client(api_key=os.environ['RELICS_API_KEY'])")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    # ---------------- 底层调用 ----------------

    def invoke(self, name, body=None):
        url = "%s/%s" % (self.base_url, str(name).lstrip("/"))
        body = dict(body or {})

        # 有本地图片文件 -> multipart/form-data
        image = body.get("image")
        if isinstance(image, str) and not image.startswith("data:") and os.path.isfile(image):
            data, ctype = _encode_multipart(body)
        else:
            data = json.dumps(body).encode("utf-8")
            ctype = "application/json"

        req = urllib.request.Request(url, data=data, method="POST")
        req.add_header("Authorization", "Bearer " + self.api_key)
        req.add_header("Content-Type", ctype)
        req.add_header("User-Agent", "shehuiwenwu-python/" + __version__)

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                raw = resp.read().decode("utf-8", "replace")
                payload = json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", "replace")
            try:
                payload = json.loads(raw) if raw else {}
            except ValueError:
                payload = {"raw": raw}
            code = payload.get("code") or payload.get("error") or ("http_%s" % e.code)
            raise ShehuiwenwuError(code, payload.get("message") or payload.get("desc"), e.code, payload)

        # 平台约定：业务失败也返回 200 + {"code": "..."}
        code = payload.get("code")
        if code and code not in ("ok", "success"):
            raise ShehuiwenwuError(code, payload.get("message") or payload.get("desc"), 200, payload)
        return payload

    # ---------------- 信用 / 资质 ----------------

    def credit_biz(self, company=None, uscc=None, refresh=None):
        """企业工商核验。"""
        return self.invoke("credit_biz", _drop(company=company, uscc=uscc, refresh=refresh))

    def credit_qual(self, company=None, uscc=None, with_activity=None):
        """文物资质核验（文物商店 / 文物拍卖经营许可证）。"""
        return self.invoke("credit_qual", _drop(company=company, uscc=uscc, with_activity=with_activity))

    def credit_score(self, company=None, uscc=None, with_benchmark=None):
        """信用评分。"""
        return self.invoke("credit_score", _drop(company=company, uscc=uscc, with_benchmark=with_benchmark))

    def credit_news(self, company=None, uscc=None, with_references=None):
        """企业相关公开信息与出处。"""
        return self.invoke("credit_news", _drop(company=company, uscc=uscc, with_references=with_references))

    # ---------------- 被盗（丢失）文物比对 ----------------
    # local = 本地视觉特征（快、稳）；semantic = 向量语义（更宽容）；hybrid = 混合（推荐）

    def circ_cn_local(self, **kw): return self.invoke("circ_cn_local", _circ(kw))
    def circ_cn_semantic(self, **kw): return self.invoke("circ_cn_semantic", _circ(kw))
    def circ_cn_hybrid(self, **kw): return self.invoke("circ_cn_hybrid", _circ(kw))
    def circ_abroad_local(self, **kw): return self.invoke("circ_abroad_local", _circ(kw))
    def circ_abroad_semantic(self, **kw): return self.invoke("circ_abroad_semantic", _circ(kw))
    def circ_abroad_hybrid(self, **kw): return self.invoke("circ_abroad_hybrid", _circ(kw))
    def circ_both_local(self, **kw): return self.invoke("circ_both_local", _circ(kw))
    def circ_both_semantic(self, **kw): return self.invoke("circ_both_semantic", _circ(kw))
    def circ_both_hybrid(self, **kw): return self.invoke("circ_both_hybrid", _circ(kw))
    def circ_unearthed(self, **kw): return self.invoke("circ_unearthed", _circ(kw))
    def circ_material_era(self, **kw): return self.invoke("circ_material_era", _circ(kw))
    def circ_full_review(self, **kw): return self.invoke("circ_full_review", _circ(kw))


# ---------------- 内部工具 ----------------

def _drop(**kw):
    return {k: v for k, v in kw.items() if v is not None}


def _circ(kw):
    out = _drop(**kw)
    if "topK" in out and "top_k" not in out:
        out["top_k"] = out.pop("topK")
    return out


def _encode_multipart(fields):
    """把含本地图片路径的字段编码成 multipart/form-data（标准库实现）。"""
    boundary = "----shehuiwenwu" + uuid.uuid4().hex
    parts = []
    for key, value in fields.items():
        if value is None:
            continue
        if key == "image" and isinstance(value, str) and os.path.isfile(value):
            ctype = mimetypes.guess_type(value)[0] or "application/octet-stream"
            with open(value, "rb") as f:
                content = f.read()
            parts.append(("--%s\r\n" % boundary).encode())
            parts.append(('Content-Disposition: form-data; name="image"; filename="%s"\r\n' % os.path.basename(value)).encode())
            parts.append(("Content-Type: %s\r\n\r\n" % ctype).encode())
            parts.append(content)
            parts.append(b"\r\n")
        else:
            if isinstance(value, (list, tuple)):
                for v in value:
                    parts.append(("--%s\r\n" % boundary).encode())
                    parts.append(('Content-Disposition: form-data; name="%s[]"\r\n\r\n' % key).encode())
                    parts.append(str(v).encode("utf-8"))
                    parts.append(b"\r\n")
            else:
                parts.append(("--%s\r\n" % boundary).encode())
                parts.append(('Content-Disposition: form-data; name="%s"\r\n\r\n' % key).encode())
                parts.append(str(value).encode("utf-8"))
                parts.append(b"\r\n")
    parts.append(("--%s--\r\n" % boundary).encode())
    return b"".join(parts), "multipart/form-data; boundary=" + boundary
