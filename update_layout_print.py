import re

def update_file(path, old, new):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# Update sidebar
update_file(
    'frontend/src/components/sidebar.tsx',
    'aside className="bg-paper border-r',
    'aside className="print:hidden bg-paper border-r'
)

# Update topbar
update_file(
    'frontend/src/components/topbar.tsx',
    'header className="flex flex-wrap',
    'header className="print:hidden flex flex-wrap'
)
