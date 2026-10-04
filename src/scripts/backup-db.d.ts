export declare const SCRIPT_DIR: string;
export declare const ROOT_DIR: string;
export declare const BACKUP_DIR: string;
export declare const DB_PATH: string;
export declare const MAX_BACKUPS: number;

export declare function isWithinDirectory(parentDir: string, candidatePath: string): boolean;
export declare function resolveWithinRoot(inputPath: string, label: string): string;
export declare function resolveWithinDirectory(parentDir: string, candidatePath: string, label: string): string;
export declare function getSafeDbPath(): string;
export declare function getSafeBackupDir(): string;
export declare function ensureBackupDir(): Promise<void>;
export declare function pruneOldBackups(): Promise<string[]>;
export declare function backup(): Promise<string>;
