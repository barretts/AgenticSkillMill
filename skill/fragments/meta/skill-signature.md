### Cross-Artifact Skill Signature

When updating or creating a skill, embed a deterministic signature in each externally searchable artifact so operators can query everything produced by that specific skill across systems.

Derive the signature per skill name:

- Compute `sha256("<skill-name>")`
- Use the first 8 lowercase hex characters
- Format as `skill-sig: <sig8>`

For a given skill name, the value is permanently static across all versions.

Example:

- `sha256("3pp-skill")` -> `ad61853a...`
- signature value: `skill-sig: ad61853a`

### Artifact Embedding Rules

- **Commit message body**: append a git trailer after a blank line: `Skill-Sig: <sig8>`
- **PR markdown doc**: append `<sub>skill-sig: <sig8></sub>` after the `## Notes` section
- **GUS HTML details**: append `<p style="font-size:0.8em;color:#888">skill-sig: <sig8></p>` before closing `</body></html>`

### Searchability Targets

- Git: `git log --grep="skill-sig: <sig8>"`
- GitHub: search for `"skill-sig: <sig8>"`
- GUS SOQL: `WHERE Details__c LIKE '%skill-sig: <sig8>%'`
