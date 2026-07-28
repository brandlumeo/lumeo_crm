import codecs
with open('requirements.txt', 'rb') as f:
    content = f.read()

# Replace null bytes that were incorrectly added by powershell Add-Content
cleaned = content.replace(b'\x00', b'')

with open('requirements.txt', 'wb') as f:
    f.write(cleaned)
