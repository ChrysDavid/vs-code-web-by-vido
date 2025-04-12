# webide/executors/python_executor.py

import os
import subprocess
import tempfile
import threading
from django.http import JsonResponse

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