# webide/executors/java_executor.py

import os
import re
import subprocess
import tempfile
import threading
from django.http import JsonResponse

def execute_java(code, stdin=""):
    """Exécute du code Java."""
    # Extraire le nom de la classe principale (à partir de 'public class X')
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