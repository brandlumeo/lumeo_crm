import os
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from google_auth_oauthlib.flow import Flow
from .models import EmailAccount
import googleapiclient.discovery
import base64
import json

# Google OAuth Scopes required for bi-directional sync
GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
]

def get_google_client_config():
    return {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "project_id": "lumeo-crm-oauth",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": settings.GOOGLE_CLIENT_SECRET
        }
    }

def get_redirect_uri():
    # URL that Google redirects to after successful login
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    return f"{frontend_url}/settings/integrations/google/callback"


class GoogleOAuthURLView(APIView):
    """
    Returns the Google OAuth 2.0 authorization URL.
    The frontend should redirect the user to this URL.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(settings, 'GOOGLE_CLIENT_ID', None) or not getattr(settings, 'GOOGLE_CLIENT_SECRET', None):
            return Response({"error": "Google OAuth is not configured on the server."}, status=500)
            
        # We need os.environ set up to allow insecure HTTP for local dev testing
        if "localhost" in get_redirect_uri() or "127.0.0.1" in get_redirect_uri():
            os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

        flow = Flow.from_client_config(
            get_google_client_config(), 
            scopes=GOOGLE_SCOPES,
            redirect_uri=get_redirect_uri()
        )
        
        # access_type='offline' is required to get a refresh token
        # prompt='consent' forces the consent screen to ensure we get a refresh token every time
        auth_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        
        return Response({"auth_url": auth_url})


class GoogleOAuthCallbackView(APIView):
    """
    Receives the 'code' from the frontend (which got it from Google's redirect),
    exchanges it for tokens, and saves them to the database.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response({"error": "No authorization code provided."}, status=400)
            
        if "localhost" in get_redirect_uri() or "127.0.0.1" in get_redirect_uri():
            os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

        flow = Flow.from_client_config(
            get_google_client_config(), 
            scopes=GOOGLE_SCOPES,
            redirect_uri=get_redirect_uri()
        )
        
        try:
            flow.fetch_token(code=code)
            credentials = flow.credentials
        except Exception as e:
            return Response({"error": f"Failed to fetch token: {str(e)}"}, status=400)
            
        try:
            # Use the credentials to fetch the user's email address
            service = googleapiclient.discovery.build('oauth2', 'v2', credentials=credentials)
            user_info = service.userinfo().get().execute()
            email_address = user_info.get('email')
        except Exception as e:
            return Response({"error": f"Failed to fetch user profile: {str(e)}"}, status=400)
        
        if not email_address:
            return Response({"error": "Could not determine email address from Google."}, status=400)
            
        # Save or update the EmailAccount
        account, created = EmailAccount.objects.update_or_create(
            user=request.user,
            email_address=email_address,
            defaults={
                "company": request.user.company,
                "provider": EmailAccount.Provider.GOOGLE,
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token or "",
                "token_expires_at": credentials.expiry,
                "is_active": True
            }
        )
        
        # Setup Pub/Sub Webhook subscription here for real-time syncing
        topic_name = getattr(settings, 'GCP_PUBSUB_TOPIC', None)
        if topic_name:
            try:
                watch_request = {
                    'labelIds': ['INBOX', 'SENT'],
                    'labelFilterAction': 'include',
                    'topicName': topic_name
                }
                watch_response = service.users().watch(userId='me', body=watch_request).execute()
                account.sync_state_id = watch_response.get('historyId')
                account.save(update_fields=['sync_state_id'])
            except Exception as e:
                # Log error but don't fail the connect flow
                print(f"Failed to setup Gmail watch: {e}")
        
        return Response({
            "status": "success",
            "message": "Google account connected successfully.",
            "email_address": email_address
        })


class GooglePubSubWebhookView(APIView):
    """
    Receives push notifications from Google Cloud Pub/Sub when a Gmail inbox changes.
    """
    permission_classes = [] # Public endpoint for Google to call
    
    def post(self, request):
        from .tasks import sync_gmail_account_task
        try:
            body = request.data
            message = body.get('message', {})
            data = message.get('data')
            if not data:
                return Response(status=400)
                
            decoded_data = json.loads(base64.b64decode(data).decode('utf-8'))
            email_address = decoded_data.get('emailAddress')
            history_id = decoded_data.get('historyId')
            
            if email_address:
                # Dispatch celery task to sync
                sync_gmail_account_task.delay(email_address, history_id)
                
            return Response(status=204)
        except Exception as e:
            # Always return 200/204 to Google to acknowledge receipt, otherwise they retry
            print(f"Error processing Google Webhook: {e}")
            return Response(status=204)


# ─────────────────────────────────────────────────────────────────────────────
# Meta / Facebook Lead Generation Multi-tenant OAuth Integration
# ─────────────────────────────────────────────────────────────────────────────

def get_facebook_redirect_uri(request=None):
    """Return redirect URI for Facebook OAuth callback."""
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    if request:
        origin = request.headers.get('origin') or request.headers.get('referer')
        if origin:
            from urllib.parse import urlparse
            parsed = urlparse(origin)
            if parsed.scheme and parsed.netloc:
                return f"{parsed.scheme}://{parsed.netloc}/settings/integrations/facebook/callback"
    return f"{frontend_url}/settings/integrations/facebook/callback"


class FacebookOAuthURLView(APIView):
    """
    Returns the Facebook OAuth authorization URL for Lead Generation & Page management.
    Scopes: pages_show_list, pages_manage_metadata, leads_retrieval, pages_manage_ads
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        app_id = getattr(settings, 'META_APP_ID', '1625759509088307')
        redirect_uri = request.GET.get('redirect_uri') or get_facebook_redirect_uri(request)
        
        scopes = [
            'pages_show_list',
            'pages_manage_metadata',
            'leads_retrieval',
            'pages_manage_ads',
            'public_profile',
        ]
        
        scope_str = ','.join(scopes)
        auth_url = (
            f"https://www.facebook.com/v21.0/dialog/oauth"
            f"?client_id={app_id}"
            f"&redirect_uri={redirect_uri}"
            f"&scope={scope_str}"
            f"&response_type=code"
            f"&auth_type=rerequest"
        )
        return Response({"auth_url": auth_url, "redirect_uri": redirect_uri})


class FacebookOAuthCallbackView(APIView):
    """
    Exchanges code for User Access Token, retrieves Pages managed by the user,
    and if only 1 page exists or auto_connect is set, auto-subscribes the app to the page's leadgen webhook.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import requests
        code = request.data.get('code')
        redirect_uri = request.data.get('redirect_uri') or get_facebook_redirect_uri(request)
        app_id = getattr(settings, 'META_APP_ID', '1625759509088307')
        app_secret = getattr(settings, 'META_APP_SECRET', '')

        if not code:
            return Response({"error": "No authorization code provided."}, status=400)

        # 1. Exchange code for User Access Token
        token_url = "https://graph.facebook.com/v21.0/oauth/access_token"
        token_params = {
            "client_id": app_id,
            "redirect_uri": redirect_uri,
            "code": code,
        }
        if app_secret:
            token_params["client_secret"] = app_secret

        try:
            token_res = requests.get(token_url, params=token_params, timeout=12)
            token_data = token_res.json()
        except Exception as e:
            return Response({"error": f"Failed to connect to Meta Graph API: {str(e)}"}, status=502)

        if "access_token" not in token_data:
            err_msg = token_data.get('error', {}).get('message', 'Failed to exchange authorization code with Meta.')
            return Response({"error": err_msg, "meta_error": token_data}, status=400)

        user_access_token = token_data["access_token"]

        # 2. Fetch User's Pages
        accounts_url = f"https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,category&access_token={user_access_token}"
        try:
            acc_res = requests.get(accounts_url, timeout=12)
            acc_data = acc_res.json()
        except Exception as e:
            return Response({"error": f"Failed to fetch Facebook Pages: {str(e)}"}, status=502)

        pages = acc_data.get('data', [])
        if not pages:
            return Response({
                "status": "no_pages",
                "error": "No Facebook Pages found for this account. Ensure you are an Admin of at least one Facebook Page."
            }, status=400)

        # If user has exactly 1 page or auto_connect requested, connect it immediately
        company = request.user.company
        if len(pages) == 1 and company:
            page = pages[0]
            page_id = page.get('id')
            page_name = page.get('name')
            page_token = page.get('access_token')

            # Subscribe page to leadgen
            sub_res = requests.post(
                f"https://graph.facebook.com/v21.0/{page_id}/subscribed_apps",
                params={"access_token": page_token, "subscribed_fields": "leadgen"},
                timeout=10
            )
            sub_success = sub_res.status_code == 200 and sub_res.json().get('success') is True

            company.meta_page_id = page_id
            company.meta_page_name = page_name
            company.meta_page_access_token = page_token
            company.meta_leadgen_subscribed = sub_success
            company.save(update_fields=[
                'meta_page_id', 'meta_page_name', 'meta_page_access_token', 'meta_leadgen_subscribed'
            ])

            return Response({
                "status": "connected",
                "message": f"Successfully connected '{page_name}' to Lumeo CRM!",
                "page": {
                    "id": page_id,
                    "name": page_name,
                    "subscribed": sub_success
                }
            })

        # Multiple pages: return pages so client admin can choose
        simplified_pages = [
            {"id": p.get('id'), "name": p.get('name'), "category": p.get('category'), "token": p.get('access_token')}
            for p in pages
        ]
        return Response({
            "status": "select_page",
            "message": "Multiple pages found. Please select which Facebook Page to connect.",
            "pages": simplified_pages
        })


class FacebookConnectPageView(APIView):
    """
    Subscribes the selected Facebook Page to the Lumeo CRM leadgen webhook
    and saves its credentials to the current company.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import requests
        company = request.user.company
        if not company:
            return Response({"error": "No company associated with this user."}, status=400)

        page_id = request.data.get('page_id')
        page_name = request.data.get('page_name')
        page_token = request.data.get('page_token')

        if not page_id or not page_token:
            return Response({"error": "page_id and page_token are required."}, status=400)

        # Subscribe page to leadgen field
        try:
            sub_res = requests.post(
                f"https://graph.facebook.com/v21.0/{page_id}/subscribed_apps",
                params={"access_token": page_token, "subscribed_fields": "leadgen"},
                timeout=10
            )
            sub_json = sub_res.json()
            sub_success = sub_res.status_code == 200 and sub_json.get('success') is True
        except Exception as e:
            sub_success = False

        company.meta_page_id = str(page_id)
        company.meta_page_name = page_name or f"Page {page_id}"
        company.meta_page_access_token = page_token
        company.meta_leadgen_subscribed = sub_success
        company.save(update_fields=[
            'meta_page_id', 'meta_page_name', 'meta_page_access_token', 'meta_leadgen_subscribed'
        ])

        return Response({
            "status": "success",
            "message": f"Successfully connected '{company.meta_page_name}' to Lumeo CRM!",
            "company": {
                "meta_page_id": company.meta_page_id,
                "meta_page_name": company.meta_page_name,
                "meta_leadgen_subscribed": company.meta_leadgen_subscribed
            }
        })


class FacebookDisconnectPageView(APIView):
    """
    Disconnects the connected Facebook Page and unsubscribes the webhook.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import requests
        company = request.user.company
        if not company:
            return Response({"error": "No company associated with this user."}, status=400)

        page_id = company.meta_page_id
        page_token = company.meta_page_access_token

        if page_id and page_token:
            try:
                requests.delete(
                    f"https://graph.facebook.com/v21.0/{page_id}/subscribed_apps",
                    params={"access_token": page_token},
                    timeout=8
                )
            except Exception as e:
                pass

        company.meta_page_id = None
        company.meta_page_name = None
        company.meta_page_access_token = None
        company.meta_leadgen_subscribed = False
        company.save(update_fields=[
            'meta_page_id', 'meta_page_name', 'meta_page_access_token', 'meta_leadgen_subscribed'
        ])

        return Response({
            "status": "success",
            "message": "Facebook Page disconnected successfully."
        })
