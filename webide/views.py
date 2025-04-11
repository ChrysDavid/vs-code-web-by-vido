# views.py
import json
import os
import subprocess
import tempfile
import threading
import time
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt

def index(request):
    """Rendu de la page principale de l'IDE."""
    return render(request, 'webide/index.html')

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

def execute_python(code, stdin=""):
    """Exécute du code Python en sécurité."""
    # Créer un fichier temporaire
    with tempfile.NamedTemporaryFile(suffix='.py', delete=False) as temp:
        temp_name = temp.name
        temp.write(code.encode('utf-8'))
    
    try:
        # Configurer le processus avec un délai d'attente
        process = subprocess.Popen(
            ["python", temp_name],
            stdin=subprocess.PIPE if stdin else None,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Configurer un timer pour limiter le temps d'exécution (5 secondes max)
        timer = threading.Timer(5.0, process.kill)
        try:
            timer.start()
            stdout, stderr = process.communicate(input=stdin)
            
            # Vérifier si le processus s'est terminé correctement
            if process.returncode != 0 and not stderr:
                stderr = f"Le processus s'est terminé avec le code {process.returncode}"
            
            return JsonResponse({
                "output": stdout,
                "error": stderr,
                "exit_code": process.returncode
            })
        finally:
            timer.cancel()
    except Exception as e:
        return JsonResponse({"output": "", "error": str(e), "exit_code": 1})
    finally:
        # Nettoyer le fichier temporaire
        try:
            os.unlink(temp_name)
        except:
            pass

def execute_javascript(code, stdin=""):
    """Exécute du code JavaScript en utilisant Node.js."""
    with tempfile.NamedTemporaryFile(suffix='.js', delete=False) as temp:
        temp_name = temp.name
        temp.write(code.encode('utf-8'))
    
    try:
        process = subprocess.Popen(
            ["node", temp_name],
            stdin=subprocess.PIPE if stdin else None,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        timer = threading.Timer(5.0, process.kill)
        try:
            timer.start()
            stdout, stderr = process.communicate(input=stdin)
            
            return JsonResponse({
                "output": stdout,
                "error": stderr,
                "exit_code": process.returncode
            })
        finally:
            timer.cancel()
    except Exception as e:
        return JsonResponse({"output": "", "error": str(e), "exit_code": 1})
    finally:
        try:
            os.unlink(temp_name)
        except:
            pass

def execute_java(code, stdin=""):
    """Exécute du code Java."""
    # Extraire le nom de la classe principale (à partir de 'public class X')
    import re
    class_match = re.search(r'public\s+class\s+(\w+)', code)
    
    if not class_match:
        return JsonResponse({
            "output": "",
            "error": "Aucune classe publique trouvée dans le code Java",
            "exit_code": 1
        })
    
    class_name = class_match.group(1)
    
    # Créer un fichier temporaire
    with tempfile.NamedTemporaryFile(suffix='.java', delete=False) as temp:
        temp_name = temp.name
        temp.write(code.encode('utf-8'))
    
    try:
        # Compiler le code Java
        compile_process = subprocess.Popen(
            ["javac", temp_name],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        compile_stdout, compile_stderr = compile_process.communicate()
        
        if compile_process.returncode != 0:
            return JsonResponse({
                "output": compile_stdout,
                "error": compile_stderr,
                "exit_code": compile_process.returncode
            })
        
        # Exécuter le code compilé
        temp_dir = os.path.dirname(temp_name)
        
        process = subprocess.Popen(
            ["java", "-cp", temp_dir, class_name],
            stdin=subprocess.PIPE if stdin else None,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        timer = threading.Timer(5.0, process.kill)
        try:
            timer.start()
            stdout, stderr = process.communicate(input=stdin)
            
            return JsonResponse({
                "output": stdout,
                "error": stderr,
                "exit_code": process.returncode
            })
        finally:
            timer.cancel()
    except Exception as e:
        return JsonResponse({"output": "", "error": str(e), "exit_code": 1})
    finally:
        # Nettoyer les fichiers temporaires
        try:
            os.unlink(temp_name)
            os.unlink(os.path.join(os.path.dirname(temp_name), f"{class_name}.class"))
        except:
            pass

def execute_c(code, stdin=""):
    """Exécute du code C."""
    # Créer un fichier temporaire
    with tempfile.NamedTemporaryFile(suffix='.c', delete=False) as temp:
        temp_name = temp.name
        temp.write(code.encode('utf-8'))
    
    try:
        # Compilez le code C
        output_name = temp_name + ".out"
        compile_process = subprocess.Popen(
            ["gcc", temp_name, "-o", output_name],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        compile_stdout, compile_stderr = compile_process.communicate()
        
        if compile_process.returncode != 0:
            return JsonResponse({
                "output": compile_stdout,
                "error": compile_stderr,
                "exit_code": compile_process.returncode
            })
        
        # Exécuter le code compilé
        process = subprocess.Popen(
            [output_name],
            stdin=subprocess.PIPE if stdin else None,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        timer = threading.Timer(5.0, process.kill)
        try:
            timer.start()
            stdout, stderr = process.communicate(input=stdin)
            
            return JsonResponse({
                "output": stdout,
                "error": stderr,
                "exit_code": process.returncode
            })
        finally:
            timer.cancel()
    except Exception as e:
        return JsonResponse({"output": "", "error": str(e), "exit_code": 1})
    finally:
        # Nettoyer les fichiers temporaires
        try:
            os.unlink(temp_name)
            if os.path.exists(output_name):
                os.unlink(output_name)
        except:
            pass

@csrf_exempt
def handle_input(request):
    """Gère les entrées utilisateur pendant l'exécution."""
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Méthode non supportée"}, status=405)
    
    user_input = request.POST.get("input", "")
    execution_id = request.POST.get("execution_id", "")
    
    # Ici, vous pourriez stocker l'entrée utilisateur dans une file d'attente Redis ou un autre mécanisme
    # pour la transmettre au processus en cours d'exécution
    
    return JsonResponse({"status": "success", "message": "Entrée reçue"})

@csrf_exempt
def save_file(request):
    """Sauvegarde le contenu d'un fichier."""
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Méthode non supportée"}, status=405)
    
    path = request.POST.get("path", "")
    content = request.POST.get("content", "")
    
    # Vérifier si le chemin est valide et sécurisé
    if not path or ".." in path:
        return JsonResponse({"status": "error", "message": "Chemin non valide"}, status=400)
    
    # Définir le répertoire de base pour les fichiers
    base_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "files")
    
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

@csrf_exempt
def list_files(request):
    """Liste les fichiers et dossiers disponibles."""
    base_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "files")
    path = request.GET.get("path", "")
    
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