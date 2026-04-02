### Designing fragments

Fragments are reusable knowledge blocks stored in `skill/fragments/<category>/`. They are included in skill sources via include markers (`\{\{include:path\}\}`) and resolved at compile time.

**When to create a fragment:**
- The knowledge applies to 2+ skills (or likely will in the future)
- The content is self-contained and makes sense without its parent skill
- Updating the knowledge in one place should propagate everywhere

**When NOT to create a fragment:**
- The content is specific to exactly one skill and unlikely to be reused
- The content requires context from the surrounding skill to make sense
- The content is a single sentence or table row (too small to justify the indirection)

### Fragment categories

| Category | What goes here | Examples |
|----------|---------------|---------|
| `common/` | Rules and formats shared across all skills | Output format, guidelines, anti-patterns |
| `domain/` | Deep domain knowledge specific to the project's subject area | Pacing tables, narrative patterns, voice guides |
| `meta/` | Knowledge about the skill system itself | Architecture, patterns, workflows |

### Creating a fragment

1. **Create the file** at `skill/fragments/<category>/<name>.md`
   - No YAML frontmatter -- fragments are pure content
   - Write in the same imperative style as the parent skill
   - Use markdown headers starting at `###` (they'll be nested inside the skill's `##` sections)

2. **Include it in the skill source** with an include marker: `\{\{include:<category>/<name>.md\}\}`

3. **Declare it in manifest.json** under the skill's `fragments` array -- the compiler cross-validates these declarations against actual includes and errors on mismatches

### Fragment rules

- **One level of includes only.** Fragments cannot include other fragments. This is enforced by the compiler.
- **No frontmatter.** Fragments are content blocks, not standalone documents.
- **Match the parent skill's voice.** If the skill uses imperative mood ("Do X"), the fragment should too.
- **Fragments are inlined verbatim.** The compiler replaces include markers with the fragment content, trimming trailing whitespace. No wrapping, no indentation changes.
- **Keep fragments focused.** A fragment about pacing shouldn't also cover narrative patterns. If they're separate concepts, they're separate fragments.
