import os
import django
import sys

# Ensure the backend root is in the path
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

import dis
import crm.workflows

with open("scratch/disassembly.txt", "w", encoding="utf-8") as f:
    dis.dis(crm.workflows, file=f)

print("Disassembly saved to scratch/disassembly.txt")
