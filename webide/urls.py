# webide/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # URL de base pour l'IDE
    path('', views.index, name='ide'),
    
    # Exécution de code
    path('execute/', views.execute_code, name='execute_code'),
    path('input/', views.handle_input, name='handle_input'),
    
    # Gestion des packages
    path('install_package/', views.install_package, name='install_package'),
    path('uninstall_package/', views.uninstall_package, name='uninstall_package'),
    path('list_packages/', views.list_packages, name='list_packages'),
    path('cancel_package_install/', views.cancel_package_install, name='cancel_package_install'),
    
    # Gestion des fichiers
    path('save/', views.save_file, name='save_file'),
    path('files/', views.list_files, name='list_files'),
    
    # Importation/Exportation de projets
    path('import_project/', views.import_project, name='import_project'),
    path('export_project/', views.export_project, name='export_project'),
]