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
                # Allow superusers to bypass maintenance mode
                if not request.user.is_authenticated or not request.user.is_superuser:
                    return JsonResponse(
                        {"detail": "The platform is currently under maintenance. Please try again later.", "code": "maintenance_mode"},
                        status=503
                    )
        
        response = self.get_response(request)
        return response
