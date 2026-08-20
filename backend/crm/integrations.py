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
