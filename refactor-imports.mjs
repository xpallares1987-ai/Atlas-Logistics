import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

function walk(dir) {
  let results = [];
  const list = readdirSync(dir);
  list.forEach(file => {
    const fullPath = join(dir, file);
    if (fullPath.includes('node_modules') || fullPath.includes('.next') || fullPath.includes('dist') || fullPath.includes('build')) return;
    const stat = statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const packagesDir = 'C:/Users/xpall/Source/Atlas-Logistics/packages';
const files = walk(packagesDir);

let modifiedCount = 0;

files.forEach(file => {
  let content = readFileSync(file, 'utf8');
  let originalContent = content;

  const sharedRegexes = [
    /from\s+['"][^'"]*(?:packages\/shared|src\/shared|shared\/src|services)\/(db|types|config|logistics-schemas|logistics|broadcast-service|dom|i18n|crypto|cache-service|analysis-cache|xml-utils|index)['"]/g,
  ];

  for (let r of sharedRegexes) {
    content = content.replace(r, (match, moduleName) => {
      if (match.includes('@atlas/shared')) return match;
      return `from '@atlas/shared'`;
    });
  }

  content = content.replace(/from\s+['"]@torre\/shared['"]/g, "from '@atlas/shared'");

  const uiRegexes = [
    /import\s+['"][^'"]*(?:packages\/ui|src\/ui-shared|ui\/src)\/(assets|styles)\/(theme|shared-theme|tokens)\.css['"]/g,
  ];

  for (let r of uiRegexes) {
    content = content.replace(r, (match, folder, file) => {
       if (match.includes('@atlas/ui')) return match;
       return `import '@atlas/ui/src/${folder}/${file}.css'`;
    });
  }

  if (content !== originalContent) {
    writeFileSync(file, content, 'utf8');
    console.log(`Updated imports in: ${file}`);
    modifiedCount++;
  }
});

console.log(`Refactor completed. ${modifiedCount} files updated.`);
