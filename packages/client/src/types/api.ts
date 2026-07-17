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
