export interface DatasetFilters {
  keyword?: string;
  realmCode?: string;
  classCode?: string;
  classDetailCode?: string;
  dataType?: string;
  constructionYear?: string;
  detailCondition?: string;
}

export interface SearchDatasetsInput extends DatasetFilters {
  limit?: number;
  offset?: number;
}

export interface SearchDatasetsResult {
  totalCount: number;
  items: Array<Record<string, unknown>>;
  limit: number;
  offset: number;
}

export interface GuideDatasetsResult {
  counts: {
    manual: number | null;
    guide: number | null;
  };
  datasets: Array<Record<string, unknown>>;
  limit: number;
}

export type GuideDocumentType = "manual" | "guide" | "any";
