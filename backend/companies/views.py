from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import CompanySerializer


class CurrentCompanyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = getattr(request.user, "company", None)
        if company is None:
            return Response(
                {"detail": "Authenticated user is not assigned to a company."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = CompanySerializer(company)
        return Response(serializer.data)

    def put(self, request):
        company = getattr(request.user, "company", None)
        if company is None:
            return Response(
                {"detail": "Authenticated user is not assigned to a company."},
                status=status.HTTP_404_NOT_FOUND,
            )

        from accounts.models import User
        if request.user.role not in [User.Role.OWNER, User.Role.ADMIN]:
            return Response(
                {"detail": "You do not have permission to perform this action."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CompanySerializer(company, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
