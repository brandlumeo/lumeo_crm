import os
import sys
import json
import django
import urllib.request
import urllib.error

# Ensure parent directory (backend) is in python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from companies.models import Company
from accounts.models import TeamInvitation
from django.test import Client

User = get_user_model()

def run_integration_tests():
    print("==================================================")
    print("STARTING E2E INTEGRATION TESTS FOR EMAIL & AUTH FLOWS")
    print("==================================================")
    
    # 1. ORM SETUP AND CLEANUP
    # Ensure a valid company exists
    company, _ = Company.objects.get_or_create(
        slug="lumeo-test-company",
        defaults={"name": "Lumeo Test Corp", "status": "active"}
    )
    print(f"[ORM] Verified/created company: {company.name}")

    # Ensure user 'shamil' exists with the expected password and is owner of the company
    user, created = User.objects.get_or_create(
        username="shamil",
        defaults={
            "email": "brandlumeollp@gmail.com",
            "company": company,
            "role": "owner",
            "is_active": True
        }
    )
    user.set_password("shamil123")
    user.company = company
    user.role = "owner"
    user.is_active = True
    user.save()
    print(f"[ORM] Verified/configured user 'shamil' (created: {created}) with password 'shamil123'.")

    # Clean up pre-existing invitations for 'brandlumeollp+invite@gmail.com'
    email_to_clean = "brandlumeollp+invite@gmail.com"
    deleted_count, _ = TeamInvitation.objects.filter(email=email_to_clean).delete()
    print(f"[ORM] Cleaned up {deleted_count} existing invitations for '{email_to_clean}' to avoid validation/integrity errors.\n")

    # Check if we can reach the local server on 8000. If not, use in-process django.test.Client
    use_live_server = False
    try:
        urllib.request.urlopen("http://127.0.0.1:8000/api/v1/accounts/password-reset/", timeout=1)
        use_live_server = True
        print("[TEST MODE] Local Django server detected on 127.0.0.1:8000. Using LIVE NETWORK requests.\n")
    except urllib.error.HTTPError:
        # Received HTTP response (e.g. 405 Method Not Allowed), meaning the server is alive!
        use_live_server = True
        print("[TEST MODE] Local Django server detected on 127.0.0.1:8000. Using LIVE NETWORK requests.\n")
    except Exception:
        print("[TEST MODE] Local Django server NOT detected on 127.0.0.1:8000. Using IN-PROCESS django.test.Client.\n")

    if use_live_server:
        # Helper function to send POST requests over the network
        def send_post(url, payload, headers=None):
            if headers is None:
                headers = {}
            headers["Content-Type"] = "application/json"
            
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=data, headers=headers, method="POST")
            
            print(f"--> Sending POST to: {url}")
            print(f"    Payload: {payload}")
            print(f"    Headers: {headers}")
            
            try:
                with urllib.request.urlopen(req) as response:
                    status_code = response.getcode()
                    response_body = response.read().decode("utf-8")
                    response_headers = dict(response.info())
                    print(f"<-- Response {status_code} OK")
                    print(f"    Body: {response_body}")
                    print(f"    Headers: {json.dumps(response_headers, indent=2)}")
                    try:
                        res_json = json.loads(response_body) if response_body else {}
                    except Exception:
                        res_json = {"raw_response": response_body}
                    return status_code, res_json
            except urllib.error.HTTPError as e:
                status_code = e.getcode()
                response_body = e.read().decode("utf-8")
                print(f"<-- Response {status_code} Error")
                print(f"    Body: {response_body}")
                raise Exception(f"HTTP Request failed with status {status_code}: {response_body}")
            except urllib.error.URLError as e:
                print(f"[CONNECTION ERROR] Could not connect to {url}. Reason: {e.reason}")
                raise

        # 2. POST to /api/v1/accounts/password-reset/
        reset_url = "http://127.0.0.1:8000/api/v1/accounts/password-reset/"
        reset_payload = {"email": "brandlumeollp@gmail.com"}
        try:
            reset_status, reset_res = send_post(reset_url, reset_payload)
            print("[SUCCESS] Password reset email API request completed successfully.\n")
        except Exception as e:
            print(f"[FAIL] Password reset email API request failed: {e}\n")
            sys.exit(1)

        # 3. POST to /api/v1/accounts/token/ to retrieve token
        token_url = "http://127.0.0.1:8000/api/v1/accounts/token/"
        token_payload = {"username": "shamil", "password": "shamil123"}
        try:
            token_status, token_res = send_post(token_url, token_payload)
            access_token = token_res.get("access")
            if not access_token:
                raise Exception("Access token not found in response payload.")
            print("[SUCCESS] Token retrieval succeeded.\n")
        except Exception as e:
            print(f"[FAIL] Token retrieval failed: {e}\n")
            sys.exit(1)

        # 4. POST to /api/v1/accounts/invites/ using Authorization header
        invite_url = "http://127.0.0.1:8000/api/v1/accounts/invites/"
        invite_payload = {"email": email_to_clean, "role": "staff"}
        invite_headers = {"Authorization": f"Bearer {access_token}"}
        try:
            invite_status, invite_res = send_post(invite_url, invite_payload, headers=invite_headers)
            print("[SUCCESS] Team invitation created successfully.\n")
        except Exception as e:
            print(f"[FAIL] Team invitation creation failed: {e}\n")
            sys.exit(1)

    else:
        # Use django.test.Client in-process
        client = Client()

        # 2. POST to /api/v1/accounts/password-reset/
        print("--> Sending POST to: /api/v1/accounts/password-reset/")
        print("    Payload: {'email': 'brandlumeollp@gmail.com'}")
        try:
            response = client.post(
                "/api/v1/accounts/password-reset/",
                data=json.dumps({"email": "brandlumeollp@gmail.com"}),
                content_type="application/json"
            )
            print(f"<-- Response {response.status_code}")
            print(f"    Body: {response.content.decode('utf-8')}")
            if response.status_code != 200:
                raise Exception(f"Expected status 200, got {response.status_code}")
            print("[SUCCESS] Password reset email API request completed successfully.\n")
        except Exception as e:
            print(f"[FAIL] Password reset email API request failed: {e}\n")
            sys.exit(1)

        # 3. POST to /api/v1/accounts/token/ to retrieve token
        print("--> Sending POST to: /api/v1/accounts/token/")
        print("    Payload: {'username': 'shamil', 'password': 'shamil123'}")
        try:
            response = client.post(
                "/api/v1/accounts/token/",
                data=json.dumps({"username": "shamil", "password": "shamil123"}),
                content_type="application/json"
            )
            print(f"<-- Response {response.status_code}")
            response_body = response.content.decode('utf-8')
            print(f"    Body: {response_body}")
            if response.status_code != 200:
                raise Exception(f"Expected status 200, got {response.status_code}")
            token_res = json.loads(response_body)
            access_token = token_res.get("access")
            if not access_token:
                raise Exception("Access token not found in response payload.")
            print("[SUCCESS] Token retrieval succeeded.\n")
        except Exception as e:
            print(f"[FAIL] Token retrieval failed: {e}\n")
            sys.exit(1)

        # 4. POST to /api/v1/accounts/invites/ using Authorization header
        print("--> Sending POST to: /api/v1/accounts/invites/")
        print(f"    Payload: {{'email': '{email_to_clean}', 'role': 'staff'}}")
        try:
            response = client.post(
                "/api/v1/accounts/invites/",
                data=json.dumps({"email": email_to_clean, "role": "staff"}),
                content_type="application/json",
                HTTP_AUTHORIZATION=f"Bearer {access_token}"
            )
            print(f"<-- Response {response.status_code}")
            print(f"    Body: {response.content.decode('utf-8')}")
            if response.status_code != 201:
                raise Exception(f"Expected status 201, got {response.status_code}")
            print("[SUCCESS] Team invitation created successfully.\n")
        except Exception as e:
            print(f"[FAIL] Team invitation creation failed: {e}\n")
            sys.exit(1)

    print("==================================================")
    print("ALL TESTS COMPLETED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_integration_tests()
