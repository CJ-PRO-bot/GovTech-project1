from django.urls import path
from . import views

urlpatterns = [
    path('auth/signup', views.signup),
    path('auth/login', views.login_view),
    path('auth/logout', views.logout_view),
    path('auth/me', views.me),

    path('users/me', views.users_me),
    path('attendance', views.attendance_list),
    path('attendance/checkin', views.attendance_checkin),
    path('attendance/checkout', views.attendance_checkout),
]
