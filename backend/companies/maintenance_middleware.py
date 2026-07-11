from django.http import JsonResponse
from companies.models import PlatformSettings

class MaintenanceModeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/api/'):
            # Allow login and refresh endpoints so superusers can actually log in
            if '/accounts/token/' in request.path or '/accounts/token/refresh/' in request.path:
                return self.get_response(request)

            settings = PlatformSettings.get_settings()
            if settings.maintenance_mode:
                is_super = False
                
                # Check for DRF JWT in headers or cookies
                auth_header = request.META.get('HTTP_AUTHORIZATION', '')
                token_str = None
                if auth_header.startswith('Bearer '):
                    token_str = auth_header.split(' ')[1]
                else:
                    token_str = request.COOKIES.get('access_token')

                if token_str:
                    try:
                        from rest_framework_simplejwt.tokens import AccessToken
                        from accounts.models import User
                        token = AccessToken(token_str)
                        user_id = token.payload.get('user_id')
                        if user_id:
                            # We can do a quick DB check OR we can rely on a custom claim
                            user = User.objects.filter(id=user_id).first()
                            if user and user.is_superuser:
                                is_super = True
                            elif user:
                                # Valid token, but not superuser. Return 503 Maintenance!
                                return JsonResponse(
                                    {"detail": "The platform is currently under maintenance. Please try again later.", "code": "maintenance_mode"},
                                    status=503
                                )
                    except Exception:
                        pass
                
                # If we get here and they are not a superadmin, it means they either have no token,
                # or their token is invalid/expired. We should return 401 to force the frontend to
                # redirect them to the Login page. Once they log in, they get a valid token.
                # If they are a normal user, the next request will hit the 503 block above.
                if not is_super:
                    return JsonResponse(
                        {"detail": "Authentication credentials were not provided."},
                        status=401
                    )
        
        response = self.get_response(request)
        return response
