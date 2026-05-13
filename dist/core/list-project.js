import fs from 'fs/promises';
import path from 'path';
import { ConfigError } from '../errors/types.js';
export async function listProject(options) {
    const { cwd } = options;
    const warnings = [];
    // Read package.json
    let pkg = {};
    try {
        const raw = await fs.readFile(path.join(cwd, 'package.json'), 'utf-8');
        pkg = JSON.parse(raw);
    }
    catch {
        warnings.push('Could not read package.json');
    }
    const projectName = pkg.name ?? 'unknown';
    const cliBinName = pkg.bin ? Object.keys(pkg.bin)[0] ?? null : null;
    // Read manifest
    const manifestPath = path.join(cwd, 'skill', 'build', 'manifest.json');
    let manifest;
    try {
        const raw = await fs.readFile(manifestPath, 'utf-8');
        manifest = JSON.parse(raw);
    }
    catch {
        throw new ConfigError('Could not read skill/build/manifest.json', manifestPath);
    }
    // Gather skill info
    const skills = [];
    const declaredFragments = new Set();
    for (const [name, def] of Object.entries(manifest.skills)) {
        for (const frag of def.fragments ?? []) {
            declaredFragments.add(frag);
        }
        let description = null;
        const sourcePath = path.join(cwd, 'skill', def.source);
        try {
            const content = await fs.readFile(sourcePath, 'utf-8');
            const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
            if (fmMatch) {
                const descLine = fmMatch[1].split('\n').find(l => l.startsWith('description:'));
                if (descLine) {
                    description = descLine.slice(descLine.indexOf(':') + 1).trim().replace(/^["']|["']$/g, '');
                }
            }
        }
        catch {
            // Source not readable
        }
        skills.push({
            name,
            source: def.source,
            fragments: def.fragments ?? [],
            description,
        });
    }
    // Discover all fragment files on disk
    const fragmentsDir = path.join(cwd, 'skill', 'fragments');
    const fragmentFiles = await walkFragments(fragmentsDir);
    const allDiskFragments = new Set(fragmentFiles.map(f => f.relativePath));
    // Build fragment info with usage tracking
    const fragments = [];
    for (const fFile of fragmentFiles) {
        const usedBy = skills
            .filter(s => s.fragments.includes(fFile.relativePath))
            .map(s => s.name);
        fragments.push({
            path: fFile.relativePath,
            category: fFile.relativePath.split('/')[0] ?? 'uncategorized',
            usedBy,
            sizeBytes: fFile.sizeBytes,
        });
    }
    // Orphaned fragments: on disk but not declared by any skill
    const orphanedFragments = [...allDiskFragments].filter(f => !declaredFragments.has(f));
    if (orphanedFragments.length > 0) {
        warnings.push(`${orphanedFragments.length} fragment(s) on disk but not declared by any skill`);
    }
    return {
        projectName,
        cliBinName,
        skills,
        fragments,
        targets: manifest.targets ?? [],
        stats: {
            totalSkills: skills.length,
            totalFragments: fragments.length,
            totalTargets: (manifest.targets ?? []).length,
            orphanedFragments,
        },
        warnings,
    };
}
async function walkFragments(dir, base) {
    const results = [];
    const root = base ?? dir;
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                results.push(...await walkFragments(full, root));
            }
            else if (entry.name.endsWith('.md')) {
                const stat = await fs.stat(full);
                results.push({
                    relativePath: path.relative(root, full),
                    sizeBytes: stat.size,
                });
            }
        }
    }
    catch {
        // Directory doesn't exist
    }
    return results;
}
//# sourceMappingURL=list-project.js.map