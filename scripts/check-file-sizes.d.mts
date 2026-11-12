export interface FileSizeViolation {
  file: string;
  fileName: string;
  lines: number;
  limit: number;
  excess: number;
}

export interface ScanFileSizesResult {
  scannedCount: number;
  violations: FileSizeViolation[];
  passed: boolean;
}

export interface ScanFileSizesOptions {
  targetDir: string;
  maxLines?: number;
  extensions?: string[];
  exclude?: string[];
}

export function countFileLines(filePath: string): number;

export function scanFileSizes(options: ScanFileSizesOptions): ScanFileSizesResult;
