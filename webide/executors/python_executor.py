# webide/executors/python_executor.py

import os
import sys
import json
import subprocess
import tempfile
import threading
from pathlib import Path
from django.http import JsonResponse

def execute_python(code, stdin=""):
    """Exécute du code Python en sécurité avec support d'entrée utilisateur."""
    
    # Vérifier si le code contient un appel à input()
    has_input = 'input(' in code
    
    with tempfile.NamedTemporaryFile(suffix='.py', delete=False) as temp:
        temp_name = temp.name
        temp.write(code.encode('utf-8'))
    
    try:
        # Obtenir le chemin Python de l'environnement virtuel
        user_id = "default"  # À remplacer par l'ID utilisateur si nécessaire
        venv_path = Path("./webide/environments") / user_id
        
        if os.name == 'nt':  # Windows
            python_path = venv_path / "Scripts" / "python.exe"
        else:  # Unix/Linux/MacOS
            python_path = venv_path / "bin" / "python"
        
        # Vérifier que le chemin Python existe
        if not python_path.exists():
            return JsonResponse({
                "output": "",
                "error": f"Environnement Python non trouvé: {python_path}",
                "exit_code": 1
            }, safe=True)
        
        # Utiliser le Python de l'environnement virtuel pour exécuter le code
        process = subprocess.Popen(
            [str(python_path), temp_name],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Configurer un timer pour limiter le temps d'exécution
        timer = threading.Timer(10.0, process.kill)  # 10 secondes au lieu de 5
        
        try:
            timer.start()
            
            # Si stdin est fourni, l'envoyer au processus
            stdout, stderr = process.communicate(input=stdin)
            
            # Si le code contient input() mais qu'aucun stdin n'a été fourni
            if has_input and not stdin and process.returncode != 0 and "EOFError" in stderr:
                return JsonResponse({
                    "output": stdout,
                    "error": "",
                    "exit_code": 2,
                    "needs_input": True
                }, safe=True)
            
            # Réponse normale
            return JsonResponse({
                "output": stdout,
                "error": stderr,
                "exit_code": process.returncode
            }, safe=True)
            
        except subprocess.TimeoutExpired:
            process.kill()
            # Si timeout, peut-être que le programme attend une entrée
            if has_input:
                return JsonResponse({
                    "output": "Le programme attend une entrée utilisateur...",
                    "error": "",
                    "exit_code": 2,
                    "needs_input": True
                }, safe=True)
            else:
                return JsonResponse({
                    "output": "",
                    "error": "Le programme a mis trop de temps à s'exécuter et a été arrêté.",
                    "exit_code": 1
                }, safe=True)
        finally:
            timer.cancel()
            
    except Exception as e:
        return JsonResponse({
            "output": "",
            "error": f"Erreur d'exécution: {str(e)}",
            "exit_code": 1
        }, safe=True)
    finally:
        # Nettoyer le fichier temporaire
        try:
            os.unlink(temp_name)
        except:
            pass