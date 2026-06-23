const fs = require('fs');
const path = require('path');

function replaceAlerts(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceAlerts(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('alert(')) {
        content = content.replace(/alert\((.*)\);/g, (match, p1) => {
          if (p1.toLowerCase().includes('success') || p1.includes('copied')) {
            return `toast.success(${p1});`;
          } else {
            return `toast.error(${p1});`;
          }
        });
        
        if (!content.includes('import { toast } from "sonner"')) {
           const importStatement = 'import { toast } from "sonner";\n';
           if (content.includes('"use client";')) {
               content = content.replace('"use client";', '"use client";\n' + importStatement);
           } else {
               content = importStatement + content;
           }
        }
        
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

replaceAlerts('c:/Users/MUHAMMAD SHAMIL CV/PycharmProjects/crm-saas/frontend/src');
