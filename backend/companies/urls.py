from django.urls import path

from .views import CurrentCompanyView


app_name = "companies"


urlpatterns = [
    path("current/", CurrentCompanyView.as_view(), name="current"),
]
