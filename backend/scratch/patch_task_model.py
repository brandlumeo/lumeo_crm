import sys

path = r'backend/crm/models.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
target = '''        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("due_date", "title")'''
replacement = '''        blank=True,
    )
    row_order = models.PositiveIntegerField(default=0, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("row_order", "due_date", "title")'''
if target in content:
    content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Done!")
else:
    print("Target not found!")
