/*!
 * 社会文物网 · 开放平台 Node.js SDK
 *
 * 文物资质核验 / 工商核验 / 信用评分 / 被盗（丢失）文物比对 / 材质断代
 * 官网：https://www.shehuiwenwu.com
 * 开放平台：https://open.shehuiwenwu.com
 *
 * 零依赖：仅使用 Node.js 18+ 内置的 fetch / FormData / Blob / fs。
 * 输出为公开信息查询与特征比对结果，不构成鉴定意见。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_BASE = 'https://open.shehuiwenwu.com/api/v1/invoke';
const DEFAULT_TIMEOUT = 60000;

/** 接口调用失败时抛出。code 为平台返回的业务错误码（如 bad_key / insufficient_balance）。 */
class ShehuiwenwuError extends Error {
  constructor(code, message, status, payload) {
    super(message || code || 'request_failed');
    this.name = 'ShehuiwenwuError';
    this.code = code;
    this.status = status;
    this.payload = payload;
  }
}

class Client {
  /**
   * @param {object} opts
   * @param {string} opts.apiKey   开放平台密钥（必填）。请用环境变量注入，不要写死在代码里。
   * @param {string} [opts.baseUrl] 默认 https://open.shehuiwenwu.com/api/v1/invoke
   * @param {number} [opts.timeout] 单次请求超时毫秒数，默认 60000
   * @param {number} [opts.retries] 网络错误重试次数（仅对 5xx / 超时生效），默认 1
   */
  constructor(opts) {
    opts = opts || {};
    if (!opts.apiKey) throw new Error('apiKey 必填：new Client({ apiKey: process.env.RELICS_API_KEY })');
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl || DEFAULT_BASE).replace(/\/+$/, '');
    this.timeout = opts.timeout || DEFAULT_TIMEOUT;
    this.retries = opts.retries == null ? 1 : opts.retries;
  }

  /* ---------------- 底层调用 ---------------- */

  async invoke(name, body, opts) {
    opts = opts || {};
    const url = this.baseUrl + '/' + String(name).replace(/^\/+/, '');
    let attempt = 0;
    for (;;) {
      try {
        return await this._once(url, body, opts);
      } catch (e) {
        // 只重试网络层/上游错误；业务错误（4xx 业务码）不重试，避免重复计费
        const retryable = e instanceof ShehuiwenwuError
          ? (e.status >= 500)
          : true;
        if (!retryable || attempt >= this.retries) throw e;
        attempt++;
        await new Promise(r => setTimeout(r, 400 * attempt));
      }
    }
  }

  async _once(url, body, opts) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeout || this.timeout);
    const headers = { Authorization: 'Bearer ' + this.apiKey };
    let payload;

    try {
      if (opts.multipart) {
        // 图片类接口：以 multipart/form-data 上传文件
        const form = new FormData();
        for (const [k, v] of Object.entries(body)) {
          if (v === undefined || v === null) continue;
          if (k === 'image' && typeof v === 'string') {
            const buf = fs.readFileSync(v);
            form.append('image', new Blob([buf]), path.basename(v));
          } else if (Array.isArray(v)) {
            v.forEach(x => form.append(k + '[]', String(x)));
          } else {
            form.append(k, String(v));
          }
        }
        payload = form; // 不要手动设 Content-Type，运行时需要自己补 boundary
      } else {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body || {});
      }

      const res = await fetch(url, { method: 'POST', headers, body: payload, signal: ctrl.signal });
      const text = await res.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { raw: text }; }

      if (!res.ok) {
        const code = (data && (data.code || data.error)) || 'http_' + res.status;
        const msg = (data && (data.message || data.desc)) || ('HTTP ' + res.status);
        throw new ShehuiwenwuError(code, msg, res.status, data);
      }
      // 平台约定：业务失败也返回 200 + { code: '...' }
      if (data && data.code && data.code !== 'ok' && data.code !== 'success') {
        throw new ShehuiwenwuError(data.code, data.message || data.desc, res.status, data);
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  /* ---------------- 信用 / 资质 ---------------- */

  /** 企业工商核验。@param {{company?:string, uscc?:string, refresh?:number}} p */
  creditBiz(p) { return this.invoke('credit_biz', p); }

  /** 文物资质核验（文物商店 / 文物拍卖经营许可证）。@param {{company?:string, uscc?:string, with_activity?:number}} p */
  creditQual(p) { return this.invoke('credit_qual', p); }

  /** 信用评分。@param {{company?:string, uscc?:string, with_benchmark?:number}} p */
  creditScore(p) { return this.invoke('credit_score', p); }

  /** 企业相关公开信息与出处。@param {{company?:string, uscc?:string, with_references?:number}} p */
  creditNews(p) { return this.invoke('credit_news', p); }

  /* ---------------- 被盗（丢失）文物比对 ---------------- */
  // 通用参数：image（本地文件路径）或 images_base64（图片数组，多图）
  //           text（补充描述）、top_k（返回条数）、threshold（相似度阈值 0~1）
  // local = 本地视觉特征（快、稳）；semantic = 向量语义（更宽容）；hybrid = 混合（推荐）

  /** 国内被盗 / 丢失文物比对 · 本地视觉特征 */
  circCnLocal(p) { return this._circ('circ_cn_local', p); }
  /** 国内比对 · 向量语义 */
  circCnSemantic(p) { return this._circ('circ_cn_semantic', p); }
  /** 国内比对 · 混合（推荐） */
  circCnHybrid(p) { return this._circ('circ_cn_hybrid', p); }

  /** 境外被盗文物比对 · 本地视觉特征 */
  circAbroadLocal(p) { return this._circ('circ_abroad_local', p); }
  /** 境外比对 · 向量语义 */
  circAbroadSemantic(p) { return this._circ('circ_abroad_semantic', p); }
  /** 境外比对 · 混合 */
  circAbroadHybrid(p) { return this._circ('circ_abroad_hybrid', p); }

  /** 境内外联合比对 · 本地视觉特征 */
  circBothLocal(p) { return this._circ('circ_both_local', p); }
  /** 境内外联合比对 · 向量语义 */
  circBothSemantic(p) { return this._circ('circ_both_semantic', p); }
  /** 境内外联合比对 · 混合（推荐） */
  circBothHybrid(p) { return this._circ('circ_both_hybrid', p); }

  /** 出土特征分析 */
  circUnearthed(p) { return this._circ('circ_unearthed', p, 'circ_unearthed'); }
  /** 材质与年代参考分析（输出为参考线索，不是断代结论） */
  circMaterialEra(p) { return this._circ('circ_material_era', p, 'circ_material_era'); }
  /** 综合审核：一次给出多维结果 */
  circFullReview(p) { return this._circ('circ_full_review', p, 'circ_full_review'); }

  /** 图片类接口的统一入口：有 image 走文件上传，否则走 JSON（images_base64）。 */
  _circ(name, p) {
    p = p || {};
    const hasFile = typeof p.image === 'string' && !/^data:/.test(p.image) && fs.existsSync(p.image);
    const body = Object.assign({}, p);
    if (body.topK != null && body.top_k == null) body.top_k = body.topK;
    delete body.topK;
    return this.invoke(name, body, { multipart: hasFile });
  }
}

module.exports = { Client, ShehuiwenwuError, DEFAULT_BASE };
