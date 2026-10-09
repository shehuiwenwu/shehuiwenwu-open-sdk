// 社会文物网开放平台 SDK —— 类型定义
// 官网：https://www.shehuiwenwu.com

export interface ClientOptions {
  /** 开放平台密钥。请用环境变量注入，不要写死在代码里。 */
  apiKey: string;
  /** 默认 https://open.shehuiwenwu.com/api/v1/invoke */
  baseUrl?: string;
  /** 单次请求超时毫秒数，默认 60000 */
  timeout?: number;
  /** 网络错误重试次数（仅 5xx / 超时），默认 1 */
  retries?: number;
}

export interface BizParams { company?: string; uscc?: string; refresh?: number }
export interface QualParams { company?: string; uscc?: string; with_activity?: number }
export interface ScoreParams { company?: string; uscc?: string; with_benchmark?: number }
export interface NewsParams { company?: string; uscc?: string; with_references?: number }

export interface CircParams {
  /** 本地图片路径（走 multipart 上传）*/
  image?: string;
  /** 图片数组，Base64（可多图）*/
  images_base64?: string[];
  /** 补充文字描述 */
  text?: string;
  /** 返回条数 */
  top_k?: number;
  /** 别名，等价于 top_k */
  topK?: number;
  /** 相似度阈值 0~1 */
  threshold?: number;
}

export interface ApiResponse<T = any> { code?: string; message?: string; data: T }

export declare class ShehuiwenwuError extends Error {
  code: string;
  status: number;
  payload: unknown;
}

export declare class Client {
  constructor(opts: ClientOptions);
  invoke<T = any>(name: string, body?: object, opts?: { multipart?: boolean; timeout?: number }): Promise<ApiResponse<T>>;

  creditBiz<T = any>(p: BizParams): Promise<ApiResponse<T>>;
  creditQual<T = any>(p: QualParams): Promise<ApiResponse<T>>;
  creditScore<T = any>(p: ScoreParams): Promise<ApiResponse<T>>;
  creditNews<T = any>(p: NewsParams): Promise<ApiResponse<T>>;

  circCnLocal<T = any>(p: CircParams): Promise<ApiResponse<T>>;
  circCnSemantic<T = any>(p: CircParams): Promise<ApiResponse<T>>;
  circCnHybrid<T = any>(p: CircParams): Promise<ApiResponse<T>>;
  circAbroadLocal<T = any>(p: CircParams): Promise<ApiResponse<T>>;
  circAbroadSemantic<T = any>(p: CircParams): Promise<ApiResponse<T>>;
  circAbroadHybrid<T = any>(p: CircParams): Promise<ApiResponse<T>>;
  circBothLocal<T = any>(p: CircParams): Promise<ApiResponse<T>>;
  circBothSemantic<T = any>(p: CircParams): Promise<ApiResponse<T>>;
  circBothHybrid<T = any>(p: CircParams): Promise<ApiResponse<T>>;
  circUnearthed<T = any>(p: CircParams): Promise<ApiResponse<T>>;
  circMaterialEra<T = any>(p: CircParams): Promise<ApiResponse<T>>;
  circFullReview<T = any>(p: CircParams): Promise<ApiResponse<T>>;
}

export declare const DEFAULT_BASE: string;
