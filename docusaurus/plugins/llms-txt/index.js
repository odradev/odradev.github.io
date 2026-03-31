// plugins/llms-txt/index.js
const path = require('path');
const fs = require('fs');

// Simple recursive file finder — no glob dependency needed
function findFiles(dir, extensions, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) continue; // skip partials
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(fullPath, extensions, results);
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

// Strip leading numeric prefix: "12-native-token.md" → "native-token"
function stripPrefix(segment) {
  return segment.replace(/^\d+-/, '');
}

// Read _category_.json from a directory, returns { label, position, description } or null
function readCategory(dir) {
  const catPath = path.join(dir, '_category_.json');
  if (!fs.existsSync(catPath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(catPath, 'utf8'));
    return {
      label: data.label || path.basename(dir),
      position: data.position ?? 999,
      description: data.link?.description || '',
    };
  } catch {
    return null;
  }
}

// Build a link line for a single markdown file
function buildLink(file, docsDir, siteUrl) {
  const relative = path.relative(docsDir, file);
  const urlPath = relative
    .replace(/\\/g, '/')
    .replace(/\.mdx?$/, '')
    .replace(/\/index$/, '')
    .split('/')
    .map(stripPrefix)
    .join('/');

  const fullUrl = `${siteUrl}/docs/${urlPath}`;

  const content = fs.readFileSync(file, 'utf8');
  const frontmatterTitle = content.match(/^title:\s*['"]?(.+?)['"]?\s*$/m);
  const headingTitle = content.match(/^#\s+(.+)$/m);
  const pageTitle = frontmatterTitle?.[1] ?? headingTitle?.[1] ?? urlPath;

  return `- [${pageTitle}](${fullUrl})`;
}

module.exports = function llmsTxtPlugin(context, options) {
  return {
    name: 'llms-txt-plugin',
    async postBuild({ siteConfig, outDir }) {
      const { title, url, tagline } = siteConfig;
      const docsDir = path.join(context.siteDir, options.docsDir || 'docs');

      console.log(`Generating llms.txt for ${title} at ${url}`);

      // Collect top-level files (not inside a subdirectory)
      const topLevelFiles = findFiles(docsDir, ['.md', '.mdx']).filter(
        (f) => path.dirname(f) === docsDir
      );

      // Collect sections from subdirectories
      const sections = [];
      for (const entry of fs.readdirSync(docsDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
        const subDir = path.join(docsDir, entry.name);
        const category = readCategory(subDir);
        const files = findFiles(subDir, ['.md', '.mdx']);
        if (files.length === 0) continue;

        sections.push({
          label: category?.label || entry.name,
          position: category?.position ?? 999,
          description: category?.description || '',
          files,
        });
      }

      // Sort sections by position
      sections.sort((a, b) => a.position - b.position);

      // Build output
      let output = `# ${title}\n\n> ${tagline || ''}\n`;

      // Top-level files (if any)
      if (topLevelFiles.length > 0) {
        output += '\n';
        for (const file of topLevelFiles) {
          output += buildLink(file, docsDir, url) + '\n';
        }
      }

      // Sections
      for (const section of sections) {
        output += `\n## ${section.label}\n`;
        if (section.description) {
          output += `\n> ${section.description}\n`;
        }
        output += '\n';
        for (const file of section.files) {
          output += buildLink(file, docsDir, url) + '\n';
        }
      }

      const outputFileName = options.outputFile || 'llms.txt';
      const staticDir = path.join(context.siteDir, 'static');

      // Write to static/ (persists in repo) and outDir (current build output)
      fs.writeFileSync(path.join(staticDir, outputFileName), output);
      fs.writeFileSync(path.join(outDir, outputFileName), output);

      const totalFiles = topLevelFiles.length + sections.reduce((sum, s) => sum + s.files.length, 0);
      console.log(`✅ ${outputFileName} generated in static/ with ${totalFiles} pages in ${sections.length} sections`);
    },
  };
};
