// 与后端 API契约文档 对齐的响应类型（手写，非自动生成——后续可考虑OpenAPI codegen统一维护）
export interface CategoryNode {
  id: string;
  name: string;
  sort: number;
  children: CategoryNode[];
}

export interface ProductListItem {
  id: string;
  name: string;
  priceOriginalCents: number;
  priceCents: number;
  hasActiveDiscount: boolean;
  images: string[];
}

export interface ProductSpec {
  id: string;
  name: string;
  priceOriginalCents: number;
  priceAfterCents: number;
  available: number;
}

export interface ProductDetail {
  id: string;
  name: string;
  description: string;
  priceOriginalCents: number;
  priceCents: number;
  hasActiveDiscount: boolean;
  images: string[];
  categoryId: string;
  specs: ProductSpec[];
}

export interface Banner {
  id: string;
  copyZh?: string;
  copyEn?: string;
  imageUrl: string;
  link?: string;
}

export interface RecommendationItem {
  productId: string;
  name: string;
  images: string[];
  priceAfterCents: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** §5.11 客服/帮助：FAQ（服务端已按 locale 回退，返回单一语言值） */
export interface Faq {
  id: string;
  question: string;
  answer: string;
  sort: number;
}

/** §5.11：客服联系方式，来自后台「平台基础信息」platform_settings */
export interface SupportContact {
  shopName: string;
  logoUrl: string | null;
  contact: Record<string, unknown> & { note?: string };
}

/** §6.6 行35：公告/活动（服务端已按 locale 回退） */
export interface Announcement {
  id: string;
  content: string;
  publishedAt?: string | null;
  enabled: boolean;
}

/** §5.14 / §6.7：用户反馈 */
export interface Feedback {
  id: string;
  userId: string | null;
  contact: string | null;
  type: "inquiry" | "complaint" | "suggestion";
  orderId: string | null;
  content: string;
  reply: string | null;
  status: "pending" | "processing" | "replied" | "closed";
  createdAt: string;
  repliedAt?: string | null;
}

/** §6.3 行25：运费模板（金额一律为整数分，D19） */
export interface ShippingTemplate {
  id: string;
  nameZh: string;
  nameEn: string;
  firstWeightCents: number;
  firstWeightKg: string;
  extraWeightCents: number;
  freeShippingThresholdCents: number | null;
  isDefault: boolean;
  enabled: boolean;
}

export interface ShippingBinding {
  id: string;
  templateId: string;
  scope: "product" | "category";
  productId: string | null;
  categoryId: string | null;
}
