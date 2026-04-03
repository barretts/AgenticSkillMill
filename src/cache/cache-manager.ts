import fs from 'fs/promises';
import path from 'path';
import { CacheError } from '../errors/types.js';

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

export class CacheManager {
  private cacheDir: string;
  private memoryCache: Map<string, CacheEntry<unknown>>;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    this.memoryCache = new Map();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const memEntry = this.memoryCache.get(key);
      if (memEntry) {
        if (!this.isExpired(memEntry)) {
          return memEntry.data as T;
        }
        this.memoryCache.delete(key);
      }

      const diskEntry = await this.readFromDisk<T>(key);
      if (diskEntry && !this.isExpired(diskEntry)) {
        this.memoryCache.set(key, diskEntry);
        return diskEntry.data;
      }

      return null;
    } catch (error) {
      throw new CacheError(
        `Failed to retrieve key: ${key}`,
        'read',
        error instanceof Error ? error : undefined,
      );
    }
  }

  async set<T>(key: string, data: T, options: CacheOptions): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: options.ttl,
      };

      this.memoryCache.set(key, entry);
      await this.writeToDisk(key, entry);
    } catch (error) {
      throw new CacheError(
        `Failed to set key: ${key}`,
        'write',
        error instanceof Error ? error : undefined,
      );
    }
  }

  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();

      const exists = await fs
        .access(this.cacheDir)
        .then(() => true)
        .catch(() => false);

      if (exists) {
        const files = await fs.readdir(this.cacheDir);
        for (const file of files) {
          await fs.unlink(path.join(this.cacheDir, file));
        }
      }
    } catch (error) {
      throw new CacheError(
        'Failed to clear cache',
        'clear',
        error instanceof Error ? error : undefined,
      );
    }
  }

  async clearPrefix(prefix: string): Promise<void> {
    try {
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(prefix)) {
          this.memoryCache.delete(key);
        }
      }

      const exists = await fs
        .access(this.cacheDir)
        .then(() => true)
        .catch(() => false);

      if (exists) {
        const files = await fs.readdir(this.cacheDir);
        for (const file of files) {
          if (file.startsWith(prefix.replace(/:/g, '_'))) {
            await fs.unlink(path.join(this.cacheDir, file));
          }
        }
      }
    } catch (error) {
      throw new CacheError(
        `Failed to clear prefix: ${prefix}`,
        'clear',
        error instanceof Error ? error : undefined,
      );
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      let entries = 0;
      let expired = 0;
      let sizeBytes = 0;

      for (const entry of this.memoryCache.values()) {
        entries++;
        sizeBytes += JSON.stringify(entry).length;
        if (this.isExpired(entry)) {
          expired++;
        }
      }

      const exists = await fs
        .access(this.cacheDir)
        .then(() => true)
        .catch(() => false);

      if (exists) {
        const files = await fs.readdir(this.cacheDir);
        for (const file of files) {
          const filePath = path.join(this.cacheDir, file);
          const stats = await fs.stat(filePath);
          sizeBytes += stats.size;
        }
      }

      return { entries, sizeBytes, expired };
    } catch (error) {
      throw new CacheError(
        'Failed to get cache stats',
        'read',
        error instanceof Error ? error : undefined,
      );
    }
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    const ageSeconds = (Date.now() - entry.timestamp) / 1000;
    return ageSeconds > entry.ttl;
  }

  private async writeToDisk<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });

    const filename = key.replace(/[:/]/g, '_') + '.json';
    const filePath = path.join(this.cacheDir, filename);

    await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
  }

  private async readFromDisk<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const filename = key.replace(/[:/]/g, '_') + '.json';
      const filePath = path.join(this.cacheDir, filename);

      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}
