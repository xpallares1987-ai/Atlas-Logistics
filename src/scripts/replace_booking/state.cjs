// src/scripts/replace_booking/state.cjs
const fs = require('fs');

function injectState(content) {
  const lines = content.split('\n');
  const stateStartIdx = lines.findIndex(l => l.includes('const [activeTab, setActiveTab]'));
  if (stateStartIdx !== -1) {
    lines.splice(stateStartIdx + 1, 0, '  const [viewMode, setViewMode] = useState<"list" | "board">("board");');
  }
  return lines.join('\n');
}

module.exports = { injectState };
