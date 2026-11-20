export interface NamingViolation {
  rule: string;
  path: string;
  message: string;
}

export interface ScanNamingOptions {
  rootDir?: string;
}

export interface ScanNamingResult {
  scannedFiles: number;
  scannedBarrels: number;
  violations: NamingViolation[];
  passed: boolean;
}

export function scanNamingConventions(
  options?: ScanNamingOptions,
): ScanNamingResult;
