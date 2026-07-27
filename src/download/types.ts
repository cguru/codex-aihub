export interface DatasetFile {
  fileId: number;
  name: string;
  path: string;
  sizeBytes: number;
}

export interface DatasetFileInventory {
  datasetId: number;
  datasetName: string | null;
  datasetUrl: string;
  files: DatasetFile[];
}

export interface DatasetFilePage extends DatasetFileInventory {
  totalCount: number;
  totalSizeBytes: number;
  limit: number;
  offset: number;
}

export interface DatasetDownloadAccessResult {
  datasetId: number;
  datasetName: string | null;
  datasetUrl: string;
  approved: true;
  probeFile: DatasetFile;
}

export interface CheckDownloadCapacityInput {
  datasetId: number;
  fileIds?: number[] | undefined;
  destination: string;
}

export interface DownloadCapacityResult {
  datasetId: number;
  datasetName: string | null;
  datasetUrl: string;
  scope: "all" | "selected";
  fileCount: number;
  totalFileCount: number;
  downloadBytes: number;
  minimumFreeBytes: number;
  recommendedFreeBytes: number;
  availableBytes: number;
  minimumShortfallBytes: number;
  recommendedShortfallBytes: number;
  minimumFits: boolean;
  recommendedFits: boolean;
  destination: string;
  destinationExists: boolean;
  filesystemPath: string;
}

export interface DownloadDatasetFilesInput {
  datasetId: number;
  fileIds: number[];
  destination: string;
}

export interface DownloadDatasetFilesResult {
  datasetId: number;
  datasetName: string | null;
  datasetUrl: string;
  destination: string;
  selectedFiles: DatasetFile[];
  expectedBytes: number;
  downloadedBytes: number;
  extractedFiles: string[];
  extractedFileCount: number;
}
