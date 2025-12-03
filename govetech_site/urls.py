from django.contrib import admin
from django.urls import path, re_path, include
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('portal.urls')),
    # SPA fallback: any non-API path serves index.html
    re_path(r'^(?!api/).*$', TemplateView.as_view(template_name='public/index.html')),
]
