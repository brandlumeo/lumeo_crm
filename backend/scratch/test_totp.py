import base64
import hmac
import hashlib
import time
import struct
import secrets

def verify_totp(secret, code, window=1):
    try:
        secret = secret.replace(" ", "").upper()
        missing_padding = len(secret) % 8
        if missing_padding:
            secret += "=" * (8 - missing_padding)
        key = base64.b32decode(secret)
    except Exception:
        return False

    try:
        code = int(code)
    except Exception:
        return False

    now = int(time.time())
    current_step = now // 30

    for i in range(-window, window + 1):
        step = current_step + i
        msg = struct.pack(">Q", step)
        h = hmac.new(key, msg, hashlib.sha1).digest()
        offset = h[-1] & 0x0f
        truncated = struct.unpack(">I", h[offset:offset+4])[0] & 0x7fffffff
        otp = truncated % 1000000
        if otp == code:
            return True
    return False

def generate_totp_token(secret):
    secret = secret.replace(" ", "").upper()
    missing_padding = len(secret) % 8
    if missing_padding:
        secret += "=" * (8 - missing_padding)
    key = base64.b32decode(secret)
    now = int(time.time())
    current_step = now // 30
    msg = struct.pack(">Q", current_step)
    h = hmac.new(key, msg, hashlib.sha1).digest()
    offset = h[-1] & 0x0f
    truncated = struct.unpack(">I", h[offset:offset+4])[0] & 0x7fffffff
    otp = truncated % 1000000
    return str(otp).zfill(6)

# Generate a random secret
random_bytes = secrets.token_bytes(10)
secret = base64.b32encode(random_bytes).decode("utf-8").rstrip("=")

print(f"Generated Base32 Secret: {secret}")
token = generate_totp_token(secret)
print(f"Current TOTP Token: {token}")
is_valid = verify_totp(secret, token)
print(f"Verification Check: {'SUCCESS' if is_valid else 'FAILED'}")
