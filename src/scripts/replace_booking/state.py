# src/scripts/replace_booking/state.py
import re

def inject_state(content: str) -> str:
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'const [activeTab, setActiveTab]' in line:
            lines.insert(i + 1, '  const [viewMode, setViewMode] = useState<"list" | "board">("board");')
            break
    return '\n'.join(lines)
