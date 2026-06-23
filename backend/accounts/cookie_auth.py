"""
Custom JWT authentication that reads tokens from HttpOnly cookies.
Falls back to the Authorization: Bearer header for API clients / mobile apps.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication

COOKIE_ACCESS_TOKEN_NAME = "lumeo_access"


class CookieJWTAuthentication(JWTAuthentication):
    """
    Reads the JWT access token from an HttpOnly cookie first.
    Falls back to the standard Authorization: Bearer header so that
    API clients (Postman, mobile apps) keep working unchanged.
    """

    def authenticate(self, request):
        raw_token = request.COOKIES.get(COOKIE_ACCESS_TOKEN_NAME)

        if raw_token is not None:
            try:
                validated_token = self.get_validated_token(raw_token)
                return self.get_user(validated_token), validated_token
            except Exception:
                # Token in cookie is invalid/expired — fall through to header
                pass

        # Fall back to Authorization: Bearer <token> header
        return super().authenticate(request)
