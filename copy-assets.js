const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const htmlSrc = path.join(__dirname, 'src', 'renderer', 'html');
const htmlDest = path.join(__dirname, 'dist', 'renderer', 'html');

if (fs.existsSync(htmlSrc)) {
  copyDir(htmlSrc, htmlDest);
}

const stylesSrc = path.join(__dirname, 'src', 'renderer', 'styles');
const stylesDest = path.join(__dirname, 'dist', 'renderer', 'styles');

if (fs.existsSync(stylesSrc)) {
  copyDir(stylesSrc, stylesDest);
}
