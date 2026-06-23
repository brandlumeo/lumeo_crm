from django.urls import path

from . import views

app_name = "accounts"


urlpatterns = [
    # Cookie-based auth — tokens are stored in HttpOnly cookies, never in JS
    path("token/", views.CookieTokenObtainView.as_view(), name="token_obtain_pair"),
    path("token/verify-2fa/", views.Verify2FAView.as_view(), name="token_verify_2fa"),
    path("token/refresh/", views.CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("register/", views.RegisterView.as_view(), name="register"),

    path("me/", views.MeView.as_view(), name="me"),
    path("password/", views.PasswordUpdateView.as_view(), name="password_update"),
    path("team/", views.TeamListView.as_view(), name="team_list"),
    path("team/<int:pk>/", views.TeamMemberUpdateView.as_view(), name="team_member_update"),
    path("invites/", views.InviteMemberView.as_view(), name="invite_member"),
    path("invites/accept/", views.AcceptInviteView.as_view(), name="accept_invite"),

    # Password reset (unauthenticated)
    path("password-reset/", views.PasswordResetRequestView.as_view(), name="password_reset_request"),
    path("password-reset/confirm/", views.PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
]
