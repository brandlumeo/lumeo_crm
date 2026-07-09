from rest_framework.permissions import BasePermission, SAFE_METHODS
from accounts.models import User

class CompanyRBACPermission(BasePermission):
    """
    Role-Based Access Control that reads the dynamic `roles` JSON config from Company.
    Falls back to basic logic (Manager/Staff) if `view.permission_module` is not set.
    """
    def _get_action_for_method(self, method):
        if method == "POST": return "Add"
        if method in ["PUT", "PATCH"]: return "Update"
        if method == "DELETE": return "Delete"
        return "View"

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        if request.user.is_superuser or request.user.role in [User.Role.OWNER, User.Role.ADMIN]:
            return True
            
        module_name = getattr(view, "permission_module", None)
        if not module_name:
            # Fallback to basic view check
            return True

        action = self._get_action_for_method(request.method)
        roles = request.user.company.roles if request.user.company else []
        role_id = getattr(request.user.role, "lower", lambda: str(request.user.role))()
        
        role_data = next((r for r in roles if r.get("id") == role_id), None)
        if not role_data:
            if request.user.has_management_access or request.user.role == User.Role.STAFF:
                return True
            return request.method in SAFE_METHODS
            
        if role_data.get("isAdmin"):
            return True
            
        perms = role_data.get("permissions", {})
        if module_name not in perms:
            # Fallback if the module was added after custom roles were saved
            if request.user.has_management_access or request.user.role == User.Role.STAFF:
                return True
            return request.method in SAFE_METHODS
            
        perm_value = perms.get(module_name, {}).get(action, "None")
        if perm_value == "None":
            return False
            
        return True

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser or request.user.role in [User.Role.OWNER, User.Role.ADMIN]:
            return True
            
        module_name = getattr(view, "permission_module", None)
        if not module_name:
            # Legacy fallback
            if request.user.has_management_access:
                return True
            if request.method == "DELETE":
                return False
            if request.method in SAFE_METHODS:
                return True
            if hasattr(obj, "assigned_to_id") and obj.assigned_to_id is not None:
                return obj.assigned_to_id == request.user.id
            if request.user.role == User.Role.STAFF:
                return False
            return True

        action = self._get_action_for_method(request.method)
        roles = request.user.company.roles if request.user.company else []
        role_id = getattr(request.user.role, "lower", lambda: str(request.user.role))()
        
        role_data = next((r for r in roles if r.get("id") == role_id), None)
        if not role_data:
            if request.user.has_management_access or request.user.role == User.Role.STAFF:
                return True
            return request.method in SAFE_METHODS
            
        if role_data.get("isAdmin"):
            return True
            
        perms = role_data.get("permissions", {})
        if module_name not in perms:
            # Fallback if the module was added after custom roles were saved
            if request.user.has_management_access or request.user.role == User.Role.STAFF:
                if not request.user.has_management_access and action == "Delete":
                    return False
                return True
            return request.method in SAFE_METHODS
            
        perm_value = perms.get(module_name, {}).get(action, "None")
        if perm_value == "None":
            return False
            
        if perm_value == "Owned":
            # Determine ownership
            if hasattr(obj, "assigned_to_id") and obj.assigned_to_id is not None:
                return obj.assigned_to_id == request.user.id
            if hasattr(obj, "created_by_id"):
                return obj.created_by_id == request.user.id
            if hasattr(obj, "user_id"):
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
