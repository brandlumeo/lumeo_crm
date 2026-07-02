import re
path = 'frontend/src/app/(app)/payroll/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Add formatINR import
if 'formatINR' not in c:
    c = c.replace('import { cn } from "@/lib/utils";', 'import { cn, formatINR } from "@/lib/utils";')

# Replace the hardcoded $ rendering
c = re.sub(r'\$\{Number\(([^)]+)\)\.toFixed\(2\)\}', r'{formatINR(Number(\1))}', c)
c = re.sub(r'\+\$\{Number\(([^)]+)\)\.toFixed\(2\)\}', r'+{formatINR(Number(\1))}', c)
c = re.sub(r'-\$\{Number\(([^)]+)\)\.toFixed\(2\)\}', r'-{formatINR(Number(\1))}', c)

# Replace the table headers for forms
c = c.replace('Basic Salary ($)', 'Basic Salary (₹)')
c = c.replace('Allowances ($)', 'Allowances (₹)')
c = c.replace('Deductions ($)', 'Deductions (₹)')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
