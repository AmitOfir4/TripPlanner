from django.urls import path
from . import views

# This list holds the specific routes for your 'trips' app
urlpatterns = [
    # When Django sees '/api/plan/', it runs the plan_trip function in views.py
    path('plan/', views.plan_trip, name='plan_trip'),
]