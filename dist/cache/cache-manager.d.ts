export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}
export interface CacheStats {
    entries: number;
    sizeBytes: number;
    expired: number;
}
export interface CacheOptions {
    ttl: number;
}
export declare class CacheManager {
    private cacheDir;
    private memoryCache;
    constructor(cacheDir: string);
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, data: T, options: CacheOptions): Promise<void>;
    clear(): Promise<void>;
    clearPrefix(prefix: string): Promise<void>;
    getStats(): Promise<CacheStats>;
    private isExpired;
    private writeToDisk;
    private readFromDisk;
}
//# sourceMappingURL=cache-manager.d.ts.map