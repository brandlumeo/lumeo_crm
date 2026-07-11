import urllib.request
import re

html = urllib.request.urlopen('https://lumeo.estgrp.in/login').read().decode('utf-8')
chunks = re.findall(r'src="(/_next/static/chunks/[^"]+)"', html)
for c in chunks:
    js = urllib.request.urlopen('https://lumeo.estgrp.in' + c).read().decode('utf-8')
    if 'onrender.com' in js:
        idx = js.find('lumeo-crm-backend.onrender.com')
        # Print a snippet of 100 characters around it to see EXACTLY how it is formatted
        snippet = js[max(0, idx-20):min(len(js), idx+80)]
        print("EXACT SNIPPET:", repr(snippet))
