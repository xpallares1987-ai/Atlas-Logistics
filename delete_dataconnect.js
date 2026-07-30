const fs = require('fs');
const path = require('path');

const dirs = [
  'dataconnect',
  'src/dataconnect-generated'
];

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`Deleted ${fullPath}`);
  }
});
