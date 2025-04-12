# webide/views.py
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .executors import execute_python, execute_javascript, execute_java, execute_c
from .file_manager import save_file_content, list_directory_contents, handle_user_input

def index(request):
    """Rendu de la page principale de l'IDE."""
    return render(request, 'index.html')

@csrf_exempt
def execute_code(request):
    """Point de terminaison pour exécuter le code."""
    if request.method != "POST":
        return JsonResponse({"output": "Méthode non supportée"}, status=405)
    
    code = request.POST.get("code", "")
    language = request.POST.get("language", "python")
    stdin = request.POST.get("stdin", "")  # Entrée utilisateur si nécessaire
    
    # Validation de base
    if not code.strip():
        return JsonResponse({"output": "Aucun code à exécuter."})
    
    if language not in ["python", "javascript", "java", "c"]:
        return JsonResponse({"output": f"Langage '{language}' non supporté."})
    
    # Fonction d'exécution spécifique au langage
    if language == "python":
        return execute_python(code, stdin)
    elif language == "javascript":
        return execute_javascript(code, stdin)
    elif language == "java":
        return execute_java(code, stdin)
    elif language == "c":
        return execute_c(code, stdin)

@csrf_exempt
def handle_input(request):
    """Gère les entrées utilisateur pendant l'exécution."""
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Méthode non supportée"}, status=405)
    
    user_input = request.POST.get("input", "")
    execution_id = request.POST.get("execution_id", "")
    
    return handle_user_input(user_input, execution_id)

@csrf_exempt
def save_file(request):
    """Sauvegarde le contenu d'un fichier."""
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Méthode non supportée"}, status=405)
    
    path = request.POST.get("path", "")
    content = request.POST.get("content", "")
    
    return save_file_content(path, content)

def list_files(request):
    """Liste les fichiers et dossiers disponibles."""
    path = request.GET.get("path", "")
    
    return list_directory_contents(path)