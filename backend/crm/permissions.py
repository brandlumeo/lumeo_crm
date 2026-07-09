from rest_framework.permissions import BasePermission, SAFE_METHODS
from accounts.models import User


class CompanyRBACPermission(BasePermission):
    """
    Role-Based Access Control that reads the dynamic `roles` JSON config from Company.
    Handles both built-in Django roles (owner, admin, manager, staff) and custom
    departmental roles (hr, team_leader, sales, it, accounts, client, etc.).
    Falls back to safe-method-only if role is unrecognised.
    """

    def _get_action_for_method(self, method):
        if method == "POST":
            return "Add"
        if method in ["PUT", "PATCH"]:
            return "Update"
        if method == "DELETE":
            return "Delete"
        return "View"

    def _get_role_data(self, user):
        """Lookup the user's role entry inside company.roles JSON. Returns dict or None."""
        if not getattr(user, "company", None):
            return None
        roles = user.company.roles or []
        role_id = str(user.role).lower()
        return next((r for r in roles if r.get("id") == role_id), None)

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Superusers + owners + primary admins always have full access
        if request.user.is_superuser or request.user.role in [User.Role.OWNER, User.Role.ADMIN]:
            return True

        # Secondary admins (manager role or can_manage_team flag) have full access
        if request.user.role == User.Role.MANAGER or request.user.can_manage_team:
            return True

        module_name = getattr(view, "permission_module", None)
        if not module_name:
            # No module declared on this view — allow any authenticated company member
            return True

        action = self._get_action_for_method(request.method)
        role_data = self._get_role_data(request.user)

        if not role_data:
            # Role not in company's roles config — deny non-safe methods
            return request.method in SAFE_METHODS

        if role_data.get("isAdmin"):
            return True

        perms = role_data.get("permissions", {})

        if module_name not in perms:
            # Module not listed for this role — deny non-safe methods
            return request.method in SAFE_METHODS

        perm_value = perms.get(module_name, {}).get(action, "None")
        return perm_value != "None"

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser or request.user.role in [User.Role.OWNER, User.Role.ADMIN]:
            return True

        # Secondary admins get full object access
        if request.user.role == User.Role.MANAGER or request.user.can_manage_team:
            return True

        module_name = getattr(view, "permission_module", None)
        if not module_name:
            # Legacy fallback for viewsets without permission_module
            if request.method in SAFE_METHODS:
                return True
            if request.method == "DELETE":
                return False
            if hasattr(obj, "assigned_to_id") and obj.assigned_to_id is not None:
                return obj.assigned_to_id == request.user.id
            return False

        action = self._get_action_for_method(request.method)
        role_data = self._get_role_data(request.user)

        if not role_data:
            return request.method in SAFE_METHODS

        if role_data.get("isAdmin"):
            return True

        perms = role_data.get("permissions", {})

        if module_name not in perms:
            return request.method in SAFE_METHODS

        perm_value = perms.get(module_name, {}).get(action, "None")
        if perm_value == "None":
            return False

        if perm_value == "Owned":
            # Check ownership: assigned_to → created_by → user field
            if hasattr(obj, "assigned_to_id") and obj.assigned_to_id is not None:
                return obj.assigned_to_id == request.user.id
            if hasattr(obj, "created_by_id") and obj.created_by_id is not None:
                return obj.created_by_id == request.user.id
            if hasattr(obj, "user_id") and obj.user_id is not None:
                return obj.user_id == request.user.id
            return False

        return True


class AdminOnlyRBACPermission(BasePermission):
    """
    Role-Based Access Control for Settings and Automations:
    - Only Owners and Admins have access to these views.
    - Managers and Staff are denied.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [User.Role.OWNER, User.Role.ADMIN]

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
