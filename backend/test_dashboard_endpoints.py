import urllib.request
import json
import ssl

req = urllib.request.Request(
    'https://lumeo-crm-backend.onrender.com/api/v1/accounts/token/',
    data=json.dumps({"username":"shamil","password":"shamil123"}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
ctx = ssl._create_unverified_context()
try:
    with urllib.request.urlopen(req, context=ctx) as response:
        data = json.loads(response.read().decode('utf-8'))
        token = data.get('access')
        print("Got token")
except Exception as e:
    print("Failed to login:", e)
    exit(1)

endpoints = [
    "/accounts/me/",
    "/companies/current/",
    "/crm/leads/?limit=100",
    "/crm/customers/?limit=100",
    "/crm/deals/?limit=100",
    "/crm/tasks/?limit=100",
    "/crm/notes/?limit=100",
]

for ep in endpoints:
    url = f"https://lumeo-crm-backend.onrender.com/api/v1{ep}"
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req, context=ctx) as res:
            print(f"[OK] {ep}: {res.status}")
    except urllib.error.HTTPError as e:
        print(f"[FAIL] {ep}: {e.code} - {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"[FAIL] {ep}: {e}")
