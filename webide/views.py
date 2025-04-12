# webide/views.py
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import json
import os
import tempfile
import shutil
from pathlib import Path

from .executors import python_executor
from .package_manager import PackageManager

# Initialisation du gestionnaire de packages
package_manager = PackageManager()

def index(request):
    """Rendu de la page principale de l'IDE."""
    return render(request, 'index.html')

@csrf_exempt
def execute_code(request):
    """Point de terminaison pour exécuter le code."""
    print("Reçu une requête d'exécution de code")
    if request.method != "POST":
        return JsonResponse({"output": "", "error": "Méthode non supportée", "exit_code": 1}, status=405, safe=True)
    
    try:
        code = request.POST.get("code", "")
        language = request.POST.get("language", "python")
        stdin = request.POST.get("stdin", "")  # Entrée utilisateur si nécessaire
        
        # Validation de base
        if not code.strip():
            return JsonResponse({"output": "", "error": "Aucun code à exécuter.", "exit_code": 1}, safe=True)
        
        # Exécution spécifique au langage
        if language == "python":
            return python_executor.execute_python(code, stdin)
        elif language == "javascript":
            # Implémentation pour JavaScript à ajouter dans une future mise à jour
            return JsonResponse({"output": "", "error": "L'exécution de JavaScript n'est pas encore prise en charge.", "exit_code": 1}, safe=True)
        elif language == "java":
            # Implémentation pour Java à ajouter dans une future mise à jour
            return JsonResponse({"output": "", "error": "L'exécution de Java n'est pas encore prise en charge.", "exit_code": 1}, safe=True)
        elif language == "c":
            # Implémentation pour C à ajouter dans une future mise à jour
            return JsonResponse({"output": "", "error": "L'exécution de C n'est pas encore prise en charge.", "exit_code": 1}, safe=True)
        else:
            return JsonResponse({"output": "", "error": f"Langage '{language}' non supporté.", "exit_code": 1}, safe=True)
    except Exception as e:
        return JsonResponse({"output": "", "error": f"Erreur serveur: {str(e)}", "exit_code": 1}, safe=True)

@csrf_exempt
def install_package(request):
    """Installe un package dans l'environnement approprié."""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Méthode non supportée"}, status=405, safe=True)
    
    try:
        package = request.POST.get("package", "")
        language = request.POST.get("language", "python")
        special_command = request.POST.get("special_command", None)
        
        # Validation de base
        if not package.strip():
            return JsonResponse({"success": False, "error": "Aucun package spécifié."}, safe=True)
        
        # Utiliser le gestionnaire de packages pour l'installation
        user_id = request.session.get("user_id", "default")
        response = package_manager.install_package(package, language, user_id, special_command)
        
        # Assurer que la réponse est bien un JsonResponse
        if isinstance(response, JsonResponse):
            return response
        else:
            return JsonResponse(response, safe=True)
    except Exception as e:
        return JsonResponse({"success": False, "error": f"Erreur serveur: {str(e)}"}, safe=True)
    

    
@csrf_exempt
def uninstall_package(request):
    """Désinstalle un package."""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Méthode non supportée"}, status=405, safe=True)
    
    try:
        package = request.POST.get("package", "")
        language = request.POST.get("language", "python")
        
        # Validation de base
        if not package.strip():
            return JsonResponse({"success": False, "error": "Aucun package spécifié."}, safe=True)
        
        # Utiliser le gestionnaire de packages pour la désinstallation
        user_id = request.session.get("user_id", "default")
        response = package_manager.uninstall_package(package, language, user_id)
        
        # Assurer que la réponse est bien un JsonResponse
        if isinstance(response, JsonResponse):
            return response
        else:
            return JsonResponse(response, safe=True)
    except Exception as e:
        return JsonResponse({"success": False, "error": f"Erreur serveur: {str(e)}"}, safe=True)

def list_packages(request):
    """Liste les packages installés."""
    try:
        language = request.GET.get("language", "python")
        user_id = request.session.get("user_id", "default")
        
        # Utiliser le gestionnaire de packages pour lister les packages
        response = package_manager.list_packages(language, user_id)
        
        # Assurer que la réponse est bien un JsonResponse
        if isinstance(response, JsonResponse):
            return response
        else:
            return JsonResponse(response, safe=True)
    except Exception as e:
        return JsonResponse({"success": False, "error": f"Erreur serveur: {str(e)}"}, safe=True)

@csrf_exempt
def cancel_package_install(request):
    """Annule l'installation d'un package en cours."""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Méthode non supportée"}, status=405, safe=True)
    
    try:
        package = request.POST.get("package", "")
        user_id = request.session.get("user_id", "default")
        
        # Validation de base
        if not package.strip():
            return JsonResponse({"success": False, "error": "Aucun package spécifié."}, safe=True)
        
        # Utiliser le gestionnaire de packages pour annuler l'installation
        response = package_manager.cancel_package_install(package, user_id)
        
        # Assurer que la réponse est bien un JsonResponse
        if isinstance(response, JsonResponse):
            return response
        else:
            return JsonResponse(response, safe=True)
    except Exception as e:
        return JsonResponse({"success": False, "error": f"Erreur serveur: {str(e)}"}, safe=True)

@csrf_exempt
def handle_input(request):
    """Gère les entrées utilisateur pendant l'exécution."""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Méthode non supportée"}, status=405, safe=True)
    
    try:
        user_input = request.POST.get("input", "")
        execution_id = request.POST.get("execution_id", "")
        
        # Implémentation à compléter avec un système d'ID d'exécution
        return JsonResponse({"success": True}, safe=True)
    except Exception as e:
        return JsonResponse({"success": False, "error": f"Erreur serveur: {str(e)}"}, safe=True)

@csrf_exempt
def save_file(request):
    """Sauvegarde le contenu d'un fichier."""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Méthode non supportée"}, status=405, safe=True)
    
    try:
        path = request.POST.get("path", "")
        content = request.POST.get("content", "")
        
        # Validation du chemin
        if not path:
            return JsonResponse({"success": False, "error": "Chemin de fichier invalide."}, safe=True)
        
        # Normaliser le chemin et assurer la sécurité
        base_dir = Path(os.path.join(os.getcwd(), "user_files"))
        base_dir.mkdir(exist_ok=True)
        
        # S'assurer que le chemin demandé est bien sous le répertoire de base
        normalized_path = os.path.normpath(os.path.join(base_dir, path))
        if not normalized_path.startswith(str(base_dir)):
            return JsonResponse({"success": False, "error": "Chemin non autorisé."}, safe=True)
        
        # Créer les répertoires si nécessaire
        os.makedirs(os.path.dirname(normalized_path), exist_ok=True)
        
        with open(normalized_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return JsonResponse({"success": True}, safe=True)
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, safe=True)

def list_files(request):
    """Liste les fichiers et dossiers disponibles."""
    try:
        path = request.GET.get("path", "")
        
        # Validation et normalisation du chemin
        base_dir = Path(os.path.join(os.getcwd(), "user_files"))
        base_dir.mkdir(exist_ok=True)
        
        # S'assurer que le chemin demandé est bien sous le répertoire de base
        normalized_path = os.path.normpath(os.path.join(base_dir, path))
        if not normalized_path.startswith(str(base_dir)):
            return JsonResponse({"success": False, "error": "Chemin non autorisé."}, safe=True)
        
        files = []
        directories = []
        
        # Lister les fichiers et dossiers
        for item in os.listdir(normalized_path):
            item_path = os.path.join(normalized_path, item)
            if os.path.isdir(item_path):
                directories.append({
                    "name": item,
                    "type": "directory"
                })
            else:
                files.append({
                    "name": item,
                    "type": "file",
                    "size": os.path.getsize(item_path)
                })
        
        return JsonResponse({
            "success": True,
            "path": path,
            "directories": directories,
            "files": files
        }, safe=True)
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, safe=True)

@csrf_exempt
def import_project(request):
    """Importe un projet depuis un fichier ZIP."""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Méthode non supportée"}, status=405, safe=True)
    
    try:
        if 'file' not in request.FILES:
            return JsonResponse({"success": False, "error": "Aucun fichier n'a été fourni."}, safe=True)
        
        uploaded_file = request.FILES['file']
        if not uploaded_file.name.endswith('.zip'):
            return JsonResponse({"success": False, "error": "Le fichier doit être au format ZIP."}, safe=True)
        
        # Créer un dossier temporaire pour l'extraction
        temp_dir = tempfile.mkdtemp()
        
        try:
            # Sauvegarder le fichier ZIP
            temp_zip = os.path.join(temp_dir, "upload.zip")
            with open(temp_zip, 'wb+') as destination:
                for chunk in uploaded_file.chunks():
                    destination.write(chunk)
            
            # Définir le répertoire de destination
            user_id = request.session.get("user_id", "default")
            destination_dir = Path(os.path.join(os.getcwd(), "user_files", user_id))
            destination_dir.mkdir(exist_ok=True, parents=True)
            
            # Extraire le ZIP dans le répertoire de destination
            import zipfile
            with zipfile.ZipFile(temp_zip, 'r') as zip_ref:
                zip_ref.extractall(destination_dir)
            
            return JsonResponse({
                "success": True,
                "message": "Projet importé avec succès."
            }, safe=True)
        finally:
            # Nettoyer le dossier temporaire
            shutil.rmtree(temp_dir, ignore_errors=True)
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, safe=True)

@csrf_exempt
def export_project(request):
    """Exporte un projet dans un fichier ZIP."""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Méthode non supportée"}, status=405, safe=True)
    
    try:
        project_path = request.POST.get("path", "")
        
        # Validation et normalisation du chemin
        user_id = request.session.get("user_id", "default")
        base_dir = Path(os.path.join(os.getcwd(), "user_files", user_id))
        
        # S'assurer que le chemin demandé est bien sous le répertoire de base
        normalized_path = os.path.normpath(os.path.join(base_dir, project_path))
        if not normalized_path.startswith(str(base_dir)):
            return JsonResponse({"success": False, "error": "Chemin non autorisé."}, safe=True)
        
        # Créer un dossier temporaire pour le ZIP
        temp_dir = tempfile.mkdtemp()
        zip_filename = os.path.basename(normalized_path) + ".zip"
        zip_filepath = os.path.join(temp_dir, zip_filename)
        
        try:
            # Créer le fichier ZIP
            import zipfile
            from io import BytesIO
            
            # Fonction pour ajouter un dossier au ZIP de manière récursive
            def zipdir(path, ziph):
                for root, dirs, files in os.walk(path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, normalized_path)
                        ziph.write(file_path, arcname)
            
            # Créer le ZIP
            with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
                zipdir(normalized_path, zipf)
            
            # Lire le fichier ZIP et préparer la réponse
            with open(zip_filepath, 'rb') as f:
                response = BytesIO(f.read())
            
            # Préparer la réponse HTTP pour le téléchargement
            http_response = HttpResponse(response.getvalue(), content_type='application/zip')
            http_response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'
            
            return http_response
        finally:
            # Nettoyer le dossier temporaire
            shutil.rmtree(temp_dir, ignore_errors=True)
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, safe=True)