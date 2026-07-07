import logging
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .cookie_auth import COOKIE_ACCESS_TOKEN_NAME
from .models import User, TeamInvitation
from .serializers import UserSerializer, TeamInvitationSerializer

logger = logging.getLogger(__name__)

# ── Cookie helpers ────────────────────────────────────────────────────────────

COOKIE_REFRESH_TOKEN_NAME = "lumeo_refresh"

def _cookie_kwargs(max_age: int, is_production: bool) -> dict:
    """Returns cookie attributes that are Secure in production."""
    return {
        "httponly": True,
        "samesite": "None" if is_production else "Lax",
        "path": "/",
        "max_age": max_age,
        # Secure=True requires HTTPS — only set in production
        "secure": is_production,
    }


COOKIE_SESSION_NAME = "lumeo_session"  # non-HttpOnly, for Next.js middleware check

def _set_auth_cookies(response: Response, refresh: RefreshToken) -> None:
    """
    Hybrid auth pattern:
      - lumeo_refresh : HttpOnly cookie  → refresh token, never readable by JS
      - lumeo_session : plain cookie     → session indicator for Next.js middleware
    The ACCESS token is returned in the response body and stored in sessionStorage.
    """
    is_prod = not settings.DEBUG
    refresh_lifetime = settings.SIMPLE_JWT.get(
        "REFRESH_TOKEN_LIFETIME", timedelta(days=7)
    )
    max_age = int(refresh_lifetime.total_seconds())

    # Refresh token — HttpOnly, never readable by JS
    response.set_cookie(
        COOKIE_REFRESH_TOKEN_NAME,
        str(refresh),
        **_cookie_kwargs(max_age, is_prod),
    )
    # Session indicator — NOT HttpOnly so Next.js middleware can read it
    response.set_cookie(
        COOKIE_SESSION_NAME,
        "1",
        httponly=False,
        samesite="None" if is_prod else "Lax",
        path="/",
        max_age=max_age,
        secure=is_prod,
    )


def _clear_auth_cookies(response: Response) -> None:
    """Deletes the refresh and session cookies."""
    response.delete_cookie(COOKIE_REFRESH_TOKEN_NAME, path="/")
    response.delete_cookie(COOKIE_SESSION_NAME, path="/")

# ── Auth views ───────────────────────────────────────────────────────────────

class CookieTokenObtainView(APIView):
    """
    POST /api/v1/accounts/token/
    Authenticates the user and:
      - Returns {"access": "<token>"} in the response body or 2FA required response.
      - Sets lumeo_refresh as an HttpOnly cookie (refresh token)
      - Sets lumeo_session as a plain cookie (middleware auth indicator)
    """
    permission_classes = [AllowAny]
    throttle_scope = "login"  # ties in with AXES / DRF throttling

    def post(self, request):
        username = request.data.get("username", "").strip()
        password = request.data.get("password", "")

        if not username or not password:
            return Response(
                {"detail": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=username, password=password)
        if user is None:
            # django-axes records this failure automatically via its middleware
            return Response(
                {"detail": "No active account found with the given credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"detail": "This account has been disabled."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Check if Two-Factor Authentication is enabled
        if user.two_factor_enabled:
            if user.two_factor_method == "email":
                import random
                code = str(random.randint(100000, 999999))
                user.two_factor_email_code = code
                user.two_factor_email_code_created = timezone.now()
                user.save(update_fields=["two_factor_email_code", "two_factor_email_code_created"])
                
                # Try sending a real email
                try:
                    from django.core.mail import send_mail
                    send_mail(
                        subject="Lumeo CRM - Your Security Verification Code",
                        message=f"Hi {user.first_name or user.username},\n\nYour security verification code is: {code}\nThis code will expire in 5 minutes.",
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        fail_silently=False,
                    )
                except Exception as exc:
                    logger.error("Failed to send 2FA email to %s: %s", user.email, exc)
                
                email_parts = user.email.split("@")
                masked_email = email_parts[0][0] + "***" + email_parts[0][-1] + "@" + email_parts[1] if len(email_parts[0]) > 2 else user.email
                
                return Response({
                    "two_factor_required": True,
                    "two_factor_method": "email",
                    "email_masked": masked_email,
                })
                
            elif user.two_factor_method == "google_authenticator":
                return Response({
                    "two_factor_required": True,
                    "two_factor_method": "google_authenticator",
                })

        refresh = RefreshToken.for_user(user)
        # Return access token in body — frontend stores in sessionStorage
        response = Response({"access": str(refresh.access_token)})
        _set_auth_cookies(response, refresh)
        return response


class Verify2FAView(APIView):
    """
    POST /api/v1/accounts/token/verify-2fa/
    Verifies 2FA code and issues JWT tokens on success.
    """
    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        username = request.data.get("username", "").strip()
        password = request.data.get("password", "")
        code = request.data.get("two_factor_code", "").strip()

        if not username or not password or not code:
            return Response(
                {"detail": "Username, password, and code are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=username, password=password)
        if user is None or not user.is_active:
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.two_factor_enabled:
            return Response(
                {"detail": "2FA is not enabled for this account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.two_factor_method == "google_authenticator":
            from .serializers import verify_totp
            if not verify_totp(user.two_factor_secret, code):
                return Response(
                    {"detail": "Invalid verification code. Please check your authenticator app and try again."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif user.two_factor_method == "email":
            if not user.two_factor_email_code or user.two_factor_email_code != code:
                return Response(
                    {"detail": "Invalid verification code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if timezone.now() > user.two_factor_email_code_created + timedelta(minutes=5):
                return Response(
                    {"detail": "Verification code has expired."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.two_factor_email_code = None
            user.two_factor_email_code_created = None
            user.save(update_fields=["two_factor_email_code", "two_factor_email_code_created"])
        else:
            return Response(
                {"detail": "Invalid 2FA method."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Success: login user and issue token
        refresh = RefreshToken.for_user(user)
        response = Response({"access": str(refresh.access_token)})
        _set_auth_cookies(response, refresh)
        return response


class CookieTokenRefreshView(APIView):
    """
    POST /api/v1/accounts/token/refresh/
    Uses the HttpOnly lumeo_refresh cookie to issue a new access token.
    Returns {"access": "<new_token>"} in the body.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        raw_refresh = request.COOKIES.get(COOKIE_REFRESH_TOKEN_NAME)
        if not raw_refresh:
            return Response(
                {"detail": "Refresh token cookie not found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh = RefreshToken(raw_refresh)
            refresh.verify()
        except TokenError as e:
            response = Response(
                {"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED
            )
            _clear_auth_cookies(response)
            return response

        # Return new access token in body
        response = Response({"access": str(refresh.access_token)})
        _set_auth_cookies(response, refresh)
        return response


class LogoutView(APIView):
    """
    POST /api/v1/accounts/logout/
    Blacklists the refresh token (if using token blacklisting) and clears cookies.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        raw_refresh = request.COOKIES.get(COOKIE_REFRESH_TOKEN_NAME)
        if raw_refresh:
            try:
                # Attempt to blacklist — only works if INSTALLED_APPS includes
                # 'rest_framework_simplejwt.token_blacklist'
                RefreshToken(raw_refresh).blacklist()
            except Exception:
                pass  # Blacklisting is optional; clearing the cookie is enough

        response = Response({"detail": "Logged out successfully."})
        _clear_auth_cookies(response)
        return response


class RegisterView(APIView):
    """
    POST /api/v1/accounts/register/
    Self-serve registration: creates a Company and an Owner User.
    Returns access token and sets auth cookies.
    """
    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")
        first_name = request.data.get("first_name", "").strip()
        last_name = request.data.get("last_name", "").strip()
        company_name = request.data.get("company_name", "").strip()

        if not all([email, password, first_name, last_name, company_name]):
            return Response(
                {"detail": "All fields are required (email, password, first_name, last_name, company_name)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {"detail": "A user with this email already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
            
        if User.objects.filter(username=email).exists():
            return Response(
                {"detail": "A user with this username already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(password)
        except DjangoValidationError as e:
            return Response({"detail": " ".join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                from companies.models import Company
                company = Company.objects.create(
                    name=company_name,
                    status=Company.Status.TRIAL,
                    trial_ends_at=timezone.now() + timedelta(days=14),
                )

                user = User.objects.create_user(
                    username=email,
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    company=company,
                    role=User.Role.ADMIN,
                )
        except DjangoValidationError as e:
            return Response({"detail": " ".join(e.messages) if hasattr(e, 'messages') else str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": f"Registration failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # Create welcome notification outside transaction.atomic so email/Celery errors don't rollback user creation
        from notifications.models import Notification
        from notifications.tasks import send_notification_email
        from django.conf import settings
        try:
            Notification.objects.create(
                user=user,
                notification_type=Notification.Type.GENERAL,
                title="Welcome to Lumeo CRM!",
                body=f"Hi {first_name}, welcome to Lumeo! Your workspace '{company_name}' is ready. Get started by inviting your team."
            )
            admin_email = getattr(settings, 'ADMIN_NOTIFICATION_EMAIL', 'brandlumeollp@gmail.com')
            send_notification_email.delay(
                to_email=admin_email,
                title=f"🚀 New User Registration: {first_name} {last_name} ({company_name})",
                body=f"A new user has registered on Lumeo CRM!\n\nName: {first_name} {last_name}\nEmail: {email}\nCompany: {company_name}"
            )
        except Exception:
            pass

        refresh = RefreshToken.for_user(user)
        response = Response({"access": str(refresh.access_token)}, status=status.HTTP_201_CREATED)
        _set_auth_cookies(response, refresh)
        return response


# ── Profile / user views ──────────────────────────────────────────────────────


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        from .serializers import PasswordUpdateSerializer
        serializer = PasswordUpdateSerializer(data=request.data)
        if serializer.is_valid():
            if not request.user.check_password(serializer.validated_data["current_password"]):
                return Response({"current_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
            request.user.set_password(serializer.validated_data["new_password"])
            request.user.save()
            
            from notifications.tasks import send_notification_email
            send_notification_email.delay(
                to_email=request.user.email,
                title="Security Alert: Password Changed",
                body=f"Hi {request.user.first_name or request.user.username},\n\nYour account password was just changed. If you did not make this change, please contact support immediately."
            )
            
            return Response({"detail": "Password updated successfully."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TeamListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        users = User.objects.filter(company=request.user.company).exclude(role=User.Role.CUSTOMER)
        invites = TeamInvitation.objects.filter(
            company=request.user.company,
            is_accepted=False
        )
        return Response({
            "users": UserSerializer(users, many=True).data,
            "invites": TeamInvitationSerializer(invites, many=True).data,
        })


class TeamMemberUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if request.user.role not in [User.Role.OWNER, User.Role.ADMIN]:
            return Response({"detail": "Only admins can manage team roles."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            member = User.objects.get(pk=pk, company=request.user.company)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if "can_manage_team" in request.data:
            member.can_manage_team = request.data["can_manage_team"]
            member.save()

        return Response(UserSerializer(member).data)


class InviteMemberView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Owners, Admins, Managers, and users with has_management_access can invite
        if not request.user.has_management_access:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        email = request.data.get("email")
        role = request.data.get("role", "employee")
        first_name = request.data.get("first_name", "")
        last_name = request.data.get("last_name", "")
        designation = request.data.get("designation", "")
        department = request.data.get("department", "")
        personal_message = request.data.get("personal_message", "")

        # Managers cannot invite admins or other managers
        if request.user.role not in [User.Role.OWNER, User.Role.ADMIN]:
            company_roles = request.user.company.roles if request.user.company else []
            invited_role_data = next((r for r in company_roles if r.get("id") == role), None)
            
            if role in ["admin", "owner", "manager"] or (invited_role_data and invited_role_data.get("isAdmin")):
                return Response({"error": "Managers cannot invite administrators or other managers"}, status=status.HTTP_403_FORBIDDEN)

        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user already exists
        if User.objects.filter(email=email).exists():
            return Response({"error": "User with this email already exists"}, status=status.HTTP_400_BAD_REQUEST)

        # If an unaccepted invite already exists (e.g. from an earlier failed email or localhost), delete it so we can create a fresh invite and send a new email
        TeamInvitation.objects.filter(
            company=request.user.company,
            email=email,
            is_accepted=False,
        ).delete()

        invite = TeamInvitation.objects.create(
            company=request.user.company,
            email=email,
            first_name=first_name,
            last_name=last_name,
            designation=designation,
            department=department,
            personal_message=personal_message,
            role=role,
            invited_by=request.user
        )

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        invite_url = f"{frontend_url}/accept-invite?token={invite.token}"

        # Send invite email via Celery task (non-blocking)
        from .tasks import send_invite_email
        inviter_name = request.user.get_full_name() or request.user.username
        company_name = request.user.company.name if request.user.company else "Lumeo CRM"
        recipient_name = f"{first_name} {last_name}".strip()
        try:
            send_invite_email.delay(email, inviter_name, company_name, invite_url, recipient_name, designation, department, personal_message)
        except Exception:
            pass

        return Response(TeamInvitationSerializer(invite).data, status=status.HTTP_201_CREATED)


class AcceptInviteView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get("token")
        if not token:
            return Response({"error": "Token is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            invite = TeamInvitation.objects.get(token=token, is_accepted=False)
        except TeamInvitation.DoesNotExist:
            return Response({"error": "Invalid or expired invite token"}, status=status.HTTP_404_NOT_FOUND)

        if invite.is_expired:
            return Response({"error": "Invite has expired"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "email": invite.email,
            "first_name": invite.first_name or "",
            "last_name": invite.last_name or "",
            "designation": invite.designation or "",
            "department": invite.department or "",
            "company_name": invite.company.name if invite.company else "",
            "role": invite.role,
        })

    def post(self, request):
        token = request.data.get("token")
        password = request.data.get("password")
        first_name = request.data.get("first_name", "")
        last_name = request.data.get("last_name", "")

        if not all([token, password, first_name, last_name]):
            return Response({"error": "Missing fields"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            invite = TeamInvitation.objects.get(token=token, is_accepted=False)
        except TeamInvitation.DoesNotExist:
            return Response({"error": "Invalid or expired invite token"}, status=status.HTTP_400_BAD_REQUEST)

        if invite.is_expired:
            return Response({"error": "Invite has expired"}, status=status.HTTP_400_BAD_REQUEST)

        # H9 fix: validate password strength using Django's AUTH_PASSWORD_VALIDATORS
        try:
            validate_password(password)
        except DjangoValidationError as e:
            return Response({"password": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # Check if user already exists
                user = User.objects.filter(email=invite.email).first()
                
                if user:
                    # User already exists, just update them with company/role if needed
                    user.company = invite.company
                    user.role = invite.role
                    user.designation = invite.designation
                    user.department = invite.department
                    user.first_name = first_name
                    user.last_name = last_name
                    # Only set password if they don't have one (e.g. they only signed in with Google before)
                    # Or just override it since they provided it during invite acceptance
                    user.set_password(password)
                    user.save()
                else:
                    # Create new user
                    user = User.objects.create_user(
                        username=invite.email,
                        email=invite.email,
                        password=password,
                        first_name=first_name,
                        last_name=last_name,
                        designation=invite.designation,
                        department=invite.department,
                        company=invite.company,
                        role=invite.role,
                    )
                
                invite.is_accepted = True
                invite.save()

            # Generate JWT tokens for immediate login
            refresh = RefreshToken.for_user(user)

            return Response({
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error accepting invite: {str(e)}")
            return Response({"error": "An error occurred while creating the account. Please contact support."}, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    """
    POST /accounts/password-reset/
    Body: { "email": "user@example.com" }

    Sends a password reset link to the user's email.
    Always returns 200 to avoid leaking whether an email is registered.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Always return success — never reveal whether an email exists
            return Response({"detail": "If this email is registered, a reset link has been sent."})

        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        reset_url = f"{frontend_url}/reset-password?uid={uid}&token={token}"

        from .tasks import send_password_reset_email
        name = user.get_full_name() or user.username
        send_password_reset_email.delay(user.email, name, reset_url)
        logger.info(f"Password reset email queued for {email}")

        return Response({"detail": "If this email is registered, a reset link has been sent."})


class PasswordResetConfirmView(APIView):
    """
    POST /accounts/password-reset/confirm/
    Body: { "uid": "...", "token": "...", "password": "new_password" }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get("uid", "")
        token = request.data.get("token", "")
        password = request.data.get("password", "")

        if not all([uid, token, password]):
            return Response({"error": "uid, token and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_pk = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_pk)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"error": "Invalid reset link."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({"error": "This reset link has expired or already been used."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password, user)
        except DjangoValidationError as exc:
            return Response({"password": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save()
        logger.info(f"Password reset successful for user {user.email}")

        return Response({"detail": "Password reset successfully. You can now sign in."})


class ContactSupportView(APIView):
    """
    POST /api/v1/accounts/contact-support/
    Sends a support email from a verified logged-in user to the platform support email.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        subject = request.data.get("subject", "").strip()
        message = request.data.get("message", "").strip()

        if not subject or not message:
            return Response(
                {"detail": "Subject and message are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        company_name = user.company.name if user.company else "No Company Assigned"
        
        full_subject = f"🛠️ Support Request: {subject} [from {user.username}]"
        full_body = (
            f"New support request received from Lumeo CRM dashboard.\n\n"
            f"─── Client Details ───\n"
            f"• Name: {user.first_name} {user.last_name}\n"
            f"• Username/Email: {user.username} / {user.email}\n"
            f"• Company Workspace: {company_name}\n\n"
            f"─── Message ───\n"
            f"{message}\n"
        )

        from notifications.tasks import send_notification_email
        from django.conf import settings
        admin_email = getattr(settings, 'ADMIN_NOTIFICATION_EMAIL', 'support@crm.estgrp.in')

        try:
            send_notification_email.delay(
                to_email=admin_email,
                title=full_subject,
                body=full_body
            )
        except Exception as exc:
            logger.exception("Contact support email dispatch failed: %s", exc)

        return Response({"detail": "Support message sent successfully."}, status=status.HTTP_200_OK)
