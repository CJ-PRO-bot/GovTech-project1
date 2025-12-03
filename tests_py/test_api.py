from django.test import TestCase, Client
from django.urls import reverse
import re

class ApiTests(TestCase):
    def setUp(self):
        self.c = Client()

    def test_root_serves_html(self):
        r = self.c.get('/')
        self.assertIn(r.status_code, (200, 304))
        self.assertIn('text/html', r.headers.get('Content-Type', ''))

    def test_me_unauthenticated(self):
        r = self.c.get('/api/auth/me')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {'user': None})

    def test_signup_me_logout(self):
        email = f"test_{self._testMethodName}@example.com"
        r = self.c.post('/api/auth/signup', data={
            'name': 'Test User',
            'role': 'tester',
            'email': email,
            'password': 'secret123'
        }, content_type='application/json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {'ok': True})

        r = self.c.get('/api/auth/me')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['user']['email'], email)

        r = self.c.post('/api/auth/logout')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {'ok': True})

        r = self.c.get('/api/auth/me')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {'user': None})

    def test_login_wrong_password(self):
        email = f"wrongpass_{self._testMethodName}@example.com"
        # signup
        r = self.c.post('/api/auth/signup', data={
            'name': 'User', 'role': '', 'email': email, 'password': 'correctPwd'
        }, content_type='application/json')
        self.assertEqual(r.status_code, 200)
        # logout
        self.c.post('/api/auth/logout')
        # wrong password
        r = self.c.post('/api/auth/login', data={
            'email': email, 'password': 'badPwd'
        }, content_type='application/json')
        self.assertEqual(r.status_code, 401)

    def test_protected_routes_require_auth(self):
        r = self.c.get('/api/users/me')
        self.assertEqual(r.status_code, 302)  # login_required redirects
        # but DRF view returns 200 with user=None; we used login_required, so assert redirect
        r = self.c.get('/api/attendance')
        self.assertEqual(r.status_code, 302)

    def test_attendance_flow(self):
        email = f"att_{self._testMethodName}@example.com"
        r = self.c.post('/api/auth/signup', data={
            'name': 'Att User', 'role': '', 'email': email, 'password': 'secret123'
        }, content_type='application/json')
        self.assertEqual(r.status_code, 200)

        r = self.c.get('/api/attendance')
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.json().get('records'), list)

        r = self.c.post('/api/attendance/checkin')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {'ok': True})

        r = self.c.post('/api/attendance/checkin')
        self.assertEqual(r.status_code, 400)

        r = self.c.post('/api/attendance/checkout')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {'ok': True})

        r = self.c.post('/api/attendance/checkout')
        self.assertEqual(r.status_code, 400)
