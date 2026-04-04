### Renaming a skill project

When the project, skill, or CLI needs a new name, update all touchpoints in one pass to avoid stale references. The rename affects three identity layers:

| Layer | Old example | New example |
|-------|-------------|-------------|
| npm package name | `presentation-creator` | `tech-demo-director` |
| CLI binary name | `presentation-util` | `demo-director` |
| Skill name + managed marker | `presentation-creator` | `tech-demo-director` |

### Rename checklist (in order)

1. **Skill source directory and file**
   ```bash
   mv skill/skills/<old>/ skill/skills/<new>/
   mv skill/skills/<new>/<old>.md skill/skills/<new>/<new>.md
   ```

2. **Skill source frontmatter** -- update `name:` and H1 title in the renamed .md

3. **Manifest** (`skill/build/manifest.json`) -- rename the skill key and `source` path

4. **Compiler marker** (`skill/build/compile.mjs`) -- update the `MANAGED_BY` constant

5. **Local installer** (`install-local.sh`) -- update `PROJECT_NAME`, `CLI_BIN_NAME`, `MANAGED_MARKER`, `SKILLS` array

6. **Bootstrap installer** (`install.sh`) -- update the default `PACKAGE_NAME`, then copy to `site/install.sh`

7. **Package metadata** (`package.json`) -- update `name`, `bin` key, and `description`

8. **CLI metadata** (`src/cli/index.ts`) -- update `.name()` and `.description()` calls

9. **README** -- update title, CLI references, project layout, npx examples, install URLs

10. **Landing page** (`site/index.html`) -- update title, CLI references, install commands, GitHub link

11. **GitHub Actions secrets** -- if the npm package name changed, verify `AGENT_NPM_TOKEN` still works for the new package scope

12. **Any docs** referencing the old name (translation-map, lessons-learned, etc.)

13. **Regenerate everything:**
    ```bash
    rm -rf compiled
    npm install          # regenerates package-lock.json
    npm run build        # rebuilds TypeScript CLI
    npm run compile      # regenerates compiled/ under new paths
    ```

### Verification

After renaming, run this sweep to confirm no stale references remain:

```bash
grep -r "<old-name>" --include="*.md" --include="*.json" --include="*.mjs" --include="*.ts" --include="*.sh" --include="*.html" --include="*.yml" .
```

The grep should return zero results (excluding node_modules and dist).
