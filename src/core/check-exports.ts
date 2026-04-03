import fs from 'fs/promises';
import path from 'path';

export interface CheckExportsOptions {
  cwd: string;
}

export interface ExportIssue {
  severity: 'error' | 'warning';
  rule: string;
  message: string;
}

export interface CoreModuleInfo {
  name: string;
  relativePath: string;
  exportedInIndex: boolean;
}

export interface CheckExportsResult {
  indexPath: string;
  coreModules: CoreModuleInfo[];
  issues: ExportIssue[];
  warnings: string[];
}

export async function checkExports(options: CheckExportsOptions): Promise<CheckExportsResult> {
  const { cwd } = options;
  const issues: ExportIssue[] = [];
  const warnings: string[] = [];

  const indexPath = path.join(cwd, 'src', 'index.ts');
  let indexContent: string;
  try {
    indexContent = await fs.readFile(indexPath, 'utf-8');
  } catch {
    warnings.push('src/index.ts not found');
    return { indexPath, coreModules: [], issues, warnings };
  }

  // Discover core modules
  const coreDir = path.join(cwd, 'src', 'core');
  let coreFiles: string[] = [];
  try {
    const entries = await fs.readdir(coreDir);
    coreFiles = entries.filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.spec.ts'));
  } catch {
    warnings.push('src/core/ directory not found');
    return { indexPath, coreModules: [], issues, warnings };
  }

  // Parse index.ts for export lines referencing core modules
  const exportPattern = /from\s+['"]\.\/core\/([^'"]+)['"]/g;
  const exportedModules = new Set<string>();
  let match;
  while ((match = exportPattern.exec(indexContent)) !== null) {
    let modName = match[1];
    if (modName.endsWith('.js')) modName = modName.slice(0, -3);
    exportedModules.add(modName);
  }

  const coreModules: CoreModuleInfo[] = [];
  for (const file of coreFiles) {
    const name = file.replace(/\.ts$/, '');
    const exported = exportedModules.has(name);
    coreModules.push({
      name,
      relativePath: `src/core/${file}`,
      exportedInIndex: exported,
    });

    if (!exported) {
      issues.push({
        severity: 'warning',
        rule: 'unexported-module',
        message: `Core module "${name}" is not exported from src/index.ts`,
      });
    }
  }

  // Check for exports referencing non-existent core modules
  const coreModuleNames = new Set(coreFiles.map(f => f.replace(/\.ts$/, '')));
  for (const exported of exportedModules) {
    if (!coreModuleNames.has(exported)) {
      issues.push({
        severity: 'error',
        rule: 'stale-export',
        message: `src/index.ts exports from core/${exported} but that module does not exist`,
      });
    }
  }

  return { indexPath, coreModules, issues, warnings };
}
