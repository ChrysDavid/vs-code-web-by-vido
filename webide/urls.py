# urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='ide'),
    path('execute/', views.execute_code, name='execute_code'),
    path('input/', views.handle_input, name='handle_input'),
    path('save/', views.save_file, name='save_file'),
    path('files/', views.list_files, name='list_files'),
]