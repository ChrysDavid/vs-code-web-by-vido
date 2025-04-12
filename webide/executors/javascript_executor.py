# webide/executors/javascript_executor.py

import os
import subprocess
import tempfile
import threading
from django.http import JsonResponse

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