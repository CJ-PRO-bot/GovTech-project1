from datetime import date, datetime
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.decorators import api_view
from rest_framework.parsers import JSONParser
from .models import Attendance


def user_payload(u: User):
    profile = getattr(u, 'profile', None)
    return {
        'id': u.id,
        'name': u.first_name or u.username.split('@')[0],
        'role': (profile.role if profile else ''),
        'email': u.email,
    }


@api_view(['GET'])
def me(request):
    if not request.user.is_authenticated:
        return JsonResponse({'user': None})
    return JsonResponse({'user': user_payload(request.user)})


@api_view(['POST'])
@csrf_exempt
def signup(request):
    data = JSONParser().parse(request)
    name = data.get('name')
    role = data.get('role') or ''
    email = (data.get('email') or '').lower()
    password = data.get('password')

    if not name or not email or not password:
        return JsonResponse({'error': 'Missing fields'}, status=400)
    if '@' not in email:
        return JsonResponse({'error': 'Invalid email'}, status=400)
    if len(password) < 6:
        return JsonResponse({'error': 'Weak password'}, status=400)
    if User.objects.filter(email=email).exists():
        return JsonResponse({'error': 'Email already exists'}, status=409)

    username = email  # treat email as username
    u = User.objects.create_user(username=username, email=email, password=password)
    # save display name into first_name for simplicity
    u.first_name = name
    u.save()
    if hasattr(u, 'profile'):
        u.profile.role = role
        u.profile.save()

    login(request, u)
    return JsonResponse({'ok': True})


@api_view(['POST'])
@csrf_exempt
def login_view(request):
    data = JSONParser().parse(request)
    email = (data.get('email') or '').lower()
    password = data.get('password')
    if not email or not password:
        return JsonResponse({'error': 'Missing credentials'}, status=400)
    user = authenticate(request, username=email, password=password)
    if user is None:
        # differentiate: user not found vs bad password
        if not User.objects.filter(email=email).exists():
            return JsonResponse({'error': 'User not found'}, status=404)
        return JsonResponse({'error': 'Invalid password'}, status=401)
    login(request, user)
    return JsonResponse({'ok': True})


@api_view(['POST'])
@csrf_exempt
def logout_view(request):
    logout(request)
    return JsonResponse({'ok': True})


@login_required
@api_view(['GET'])
def users_me(request):
    return JsonResponse({'user': user_payload(request.user)})


@login_required
@api_view(['GET'])
def attendance_list(request):
    records = Attendance.objects.filter(user=request.user).values('date', 'check_in', 'check_out')
    out = []
    for r in records:
        out.append({
            'date': r['date'].isoformat(),
            'checkIn': r['check_in'].isoformat() if r['check_in'] else None,
            'checkOut': r['check_out'].isoformat() if r['check_out'] else None,
        })
    return JsonResponse({'records': out})


@login_required
@api_view(['POST'])
@csrf_exempt
def attendance_checkin(request):
    today = date.today()
    now = datetime.utcnow()
    obj, created = Attendance.objects.get_or_create(user=request.user, date=today)
    if not created and obj.check_in:
        return JsonResponse({'error': 'Already checked in'}, status=400)
    obj.check_in = now
    obj.save()
    return JsonResponse({'ok': True})


@login_required
@api_view(['POST'])
@csrf_exempt
def attendance_checkout(request):
    today = date.today()
    try:
        obj = Attendance.objects.get(user=request.user, date=today)
    except Attendance.DoesNotExist:
        return JsonResponse({'error': 'Not checked in'}, status=400)
    if not obj.check_in:
        return JsonResponse({'error': 'Not checked in'}, status=400)
    if obj.check_out:
        return JsonResponse({'error': 'Already checked out'}, status=400)
    obj.check_out = datetime.utcnow()
    obj.save()
    return JsonResponse({'ok': True})
