import fs from 'fs';
import path from 'path';

function walk(dir: string, callback: (path: string) => void) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) walk(file, callback);
    else callback(file);
  });
}

walk('apps/atlas-scm/src', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Replace @atlas/ui -> @/components
    // Replace @atlas/dashboard -> @/modules/dashboard
    // etc.
    content = content.replace(/@atlas\/ui\/src/g, '@/components');
    content = content.replace(/@atlas\/ui/g, '@/components');
    content = content.replace(/@atlas\/dashboard\/src/g, '@/modules/dashboard');
    content = content.replace(/@atlas\/dashboard/g, '@/modules/dashboard');
    content = content.replace(/@atlas\/freight-comparer\/src/g, '@/modules/freight-comparer');
    content = content.replace(/@atlas\/freight-comparer/g, '@/modules/freight-comparer');
    content = content.replace(/@atlas\/bpmn-modeler\/src/g, '@/modules/bpmn-modeler');
    content = content.replace(/@atlas\/bpmn-modeler/g, '@/modules/bpmn-modeler');
    content = content.replace(/@atlas\/shared\/src/g, '@/shared');
    content = content.replace(/@atlas\/shared/g, '@/shared');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log('Updated:', filePath);
    }
  }
});
