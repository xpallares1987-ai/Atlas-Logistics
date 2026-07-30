const fs = require('fs');
const files = [
  'packages/frontend/src/pages/AiBookingParserModule.tsx',
  'packages/ui/src/components/AiCopilot.tsx',
  'src/routes/ai.routes.ts',
  'src/services/ai.service.ts',
  'src/services/invoiceParser.schema.ts'
];
files.forEach(f => {
  if (fs.existsSync(f)) {
    fs.unlinkSync(f);
    console.log('Deleted', f);
  }
});
