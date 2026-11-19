"""Platform-wide controls set from the SaaS admin.

1. AI kill switch: when PlatformSettings.enable_ai_features is off, every AI endpoint returns 403.
2. Impersonation trail: every write request (POST/PUT/PATCH/DELETE) made with a
   "Log in as" token (JWT claim `imp`) is recorded in PlatformAuditLog.
"""
import logging

from django.http import JsonResponse

logger = logging.getLogger(__name__)

AI_PATHS = (
    "/api/v1/crm/ai-chat/",
    "/api/v1/crm/ai/assistant/",
    "/api/v1/crm/ai-email-draft/",
    "/api/v1/attendance/reports/ai-monthly-analysis/",
)
WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SKIP_LOGGING = ("/api/v1/accounts/token/", "/api/v1/saas/impersonation/end/", "/api/v1/notifications/mark-read/")


def _impersonation_claims(request):
    header = request.META.get("HTTP_AUTHORIZATION", "")
    if not header.startswith("Bearer "):
        return None
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        token = AccessToken(header.split(" ", 1)[1])
    except Exception:
        return None
    if not token.get("imp"):
        return None
    return {"admin_id": token.get("imp"), "user_id": token.get("user_id")}


class PlatformControlsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        if path.startswith(AI_PATHS):
            from companies.models import PlatformSettings
            if not PlatformSettings.get_settings().enable_ai_features:
                return JsonResponse(
                    {"detail": "AI features are turned off by the platform administrator.", "code": "ai_disabled"},
                    status=403,
                )

        claims = None
        if request.method in WRITE_METHODS and path.startswith("/api/") and not path.startswith(SKIP_LOGGING):
            claims = _impersonation_claims(request)

        response = self.get_response(request)

        if claims:
            try:
                from accounts.models import User
                from companies.models import PlatformAuditLog
                target = User.objects.select_related("company").filter(pk=claims["user_id"]).first()
                admin = User.objects.filter(pk=claims["admin_id"]).first()
                PlatformAuditLog.objects.create(
                    actor=admin,
                    actor_email=admin.email if admin else "",
                    action="impersonation.action",
                    company=target.company if target else None,
                    target_user=target,
                    summary=f"As {target.email if target else 'user'}: {request.method} {path} → {response.status_code}",
                    details={"method": request.method, "path": path, "status": response.status_code},
                    ip_address=(request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get("REMOTE_ADDR")) or None,
                )
            except Exception:
                logger.exception("Could not record impersonation action")
        return response
