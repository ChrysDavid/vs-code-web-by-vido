# webide/file_manager.py

import os
from django.http import JsonResponse

def get_base_dir():
    """Retourne le répertoire de base pour stocker les fichiers."""
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), "files")

def save_file_content(path, content):
    """Sauvegarde le contenu d'un fichier."""
    # Vérifier si le chemin est valide et sécurisé
    if not path or ".." in path:
        return JsonResponse({"status": "error", "message": "Chemin non valide"}, status=400)
    
    # Définir le répertoire de base pour les fichiers
    base_dir = get_base_dir()
    
    # Créer le répertoire s'il n'existe pas
    os.makedirs(base_dir, exist_ok=True)
    
    # Construire le chemin complet
    full_path = os.path.join(base_dir, path)
    
    # Créer les répertoires intermédiaires si nécessaire
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    
    try:
        # Écrire le contenu dans le fichier
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return JsonResponse({"status": "success", "message": "Fichier sauvegardé"})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

def list_directory_contents(path):
    """Liste les fichiers et dossiers disponibles."""
    base_dir = get_base_dir()
    
    # Construire le chemin complet
    full_path = os.path.join(base_dir, path)
    
    # Vérifier si le chemin est valide et sécurisé
    if not os.path.exists(full_path) or ".." in path:
        return JsonResponse({"status": "error", "message": "Chemin non valide"}, status=400)
    
    try:
        # Récupérer la liste des fichiers et dossiers
        items = []
        for item in os.listdir(full_path):
            item_path = os.path.join(full_path, item)
            items.append({
                "name": item,
                "type": "directory" if os.path.isdir(item_path) else "file",
                "size": os.path.getsize(item_path) if os.path.isfile(item_path) else 0,
                "modified": os.path.getmtime(item_path)
            })
        
        return JsonResponse({"status": "success", "items": items})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

def handle_user_input(user_input, execution_id):
    """Gère les entrées utilisateur pendant l'exécution."""
    # Ici, vous pourriez stocker l'entrée utilisateur dans une file d'attente Redis ou un autre mécanisme
    # pour la transmettre au processus en cours d'exécution
    
    return JsonResponse({"status": "success", "message": "Entrée reçue"})