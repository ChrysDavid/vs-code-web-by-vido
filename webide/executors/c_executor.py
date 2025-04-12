# webide/executors/c_executor.py

import os
import subprocess
import tempfile
import threading
from django.http import JsonResponse

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