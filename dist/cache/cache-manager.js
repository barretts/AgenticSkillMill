import fs from 'fs/promises';
import path from 'path';
import { CacheError } from '../errors/types.js';
export class CacheManager {
    cacheDir;
    memoryCache;
    constructor(cacheDir) {
        this.cacheDir = cacheDir;
        this.memoryCache = new Map();
    }
    async get(key) {
        try {
            const memEntry = this.memoryCache.get(key);
            if (memEntry) {
                if (!this.isExpired(memEntry)) {
                    return memEntry.data;
                }
                this.memoryCache.delete(key);
            }
            const diskEntry = await this.readFromDisk(key);
            if (diskEntry && !this.isExpired(diskEntry)) {
                this.memoryCache.set(key, diskEntry);
                return diskEntry.data;
            }
            return null;
        }
        catch (error) {
            throw new CacheError(`Failed to retrieve key: ${key}`, 'read', error instanceof Error ? error : undefined);
        }
    }
    async set(key, data, options) {
        try {
            const entry = {
                data,
                timestamp: Date.now(),
                ttl: options.ttl,
            };
            this.memoryCache.set(key, entry);
            await this.writeToDisk(key, entry);
        }
        catch (error) {
            throw new CacheError(`Failed to set key: ${key}`, 'write', error instanceof Error ? error : undefined);
        }
    }
    async clear() {
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
        }
        catch (error) {
            throw new CacheError('Failed to clear cache', 'clear', error instanceof Error ? error : undefined);
        }
    }
    async clearPrefix(prefix) {
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
        }
        catch (error) {
            throw new CacheError(`Failed to clear prefix: ${prefix}`, 'clear', error instanceof Error ? error : undefined);
        }
    }
    async getStats() {
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
        }
        catch (error) {
            throw new CacheError('Failed to get cache stats', 'read', error instanceof Error ? error : undefined);
        }
    }
    isExpired(entry) {
        const ageSeconds = (Date.now() - entry.timestamp) / 1000;
        return ageSeconds > entry.ttl;
    }
    async writeToDisk(key, entry) {
        await fs.mkdir(this.cacheDir, { recursive: true });
        const filename = key.replace(/[:/]/g, '_') + '.json';
        const filePath = path.join(this.cacheDir, filename);
        await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
    }
    async readFromDisk(key) {
        try {
            const filename = key.replace(/[:/]/g, '_') + '.json';
            const filePath = path.join(this.cacheDir, filename);
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            return null;
        }
    }
}
//# sourceMappingURL=cache-manager.js.map