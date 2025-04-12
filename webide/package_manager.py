# webide/package_manager.py
import os
import sys
import subprocess
import json
import threading
from pathlib import Path
from django.http import JsonResponse

class PackageManager:
    """Gestionnaire de packages pour différents langages de programmation"""
    
    def __init__(self):
        # Dictionnaire pour suivre les processus d'installation en cours
        self.running_processes = {}
        
        # Créer un environnement virtuel par utilisateur si nécessaire
        self.venv_path = Path("./webide/environments")
        self.venv_path.mkdir(exist_ok=True)
    
    def get_venv_path(self, user_id="default"):
        """Obtient le chemin de l'environnement virtuel pour l'utilisateur"""
        user_venv = self.venv_path / user_id
        if not user_venv.exists():
            # Créer un nouvel environnement virtuel pour l'utilisateur
            self._create_virtual_env(user_id)
        return user_venv
    
    def _create_virtual_env(self, user_id):
        """Crée un nouvel environnement virtuel pour l'utilisateur"""
        user_venv = self.venv_path / user_id
        try:
            # Créer l'environnement virtuel
            subprocess.run([sys.executable, "-m", "venv", str(user_venv)], 
                            check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError as e:
            print(f"Erreur lors de la création de l'environnement virtuel: {e}")
            return False
    
    def install_package(self, package_name, language="python", user_id="default", special_command=None):
        """Installe un package pour un langage spécifique"""
        if language.lower() == "python":
            return self._install_python_package(package_name, user_id, special_command)
        else:
            return JsonResponse({
                "success": False,
                "error": f"Installation de packages pour {language} non prise en charge."
            })
    
    def _install_python_package(self, package_name, user_id="default", special_command=None):
        """Installe un package Python dans l'environnement virtuel de l'utilisateur"""
        user_venv = self.get_venv_path(user_id)
        
        # Déterminer le chemin de l'exécutable pip dans l'environnement virtuel
        if os.name == 'nt':  # Windows
            pip_path = user_venv / "Scripts" / "pip.exe"
            python_path = user_venv / "Scripts" / "python.exe"
        else:  # Unix/Linux/MacOS
            pip_path = user_venv / "bin" / "pip"
            python_path = user_venv / "bin" / "python"
        
        # Vérifier que pip existe dans l'environnement virtuel
        if not pip_path.exists():
            return JsonResponse({
                "success": False,
                "error": "Erreur: pip n'est pas disponible dans l'environnement virtuel."
            })
        
        try:
            # Traitement spécial pour certaines commandes
            if special_command == 'upgrade_pip':
                # Utiliser python -m pip install --upgrade pip (commande plus fiable)
                process = subprocess.Popen(
                    [str(python_path), "-m", "pip", "install", "--upgrade", "pip"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
            else:
                # Installation normale
                process = subprocess.Popen(
                    [str(pip_path), "install", package_name],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
            
            # Identifier ce processus pour pouvoir l'annuler ultérieurement
            process_id = f"{user_id}_{package_name}"
            self.running_processes[process_id] = process
            
            # Lancer un thread pour surveiller le délai d'expiration
            def timeout_handler():
                if process_id in self.running_processes:
                    try:
                        self.running_processes[process_id].kill()
                        print(f"Installation du package {package_name} expirée")
                    except:
                        pass
            
            # Définir un délai d'attente de 60 secondes
            timer = threading.Timer(60.0, timeout_handler)
            
            try:
                timer.start()
                stdout, stderr = process.communicate()
                
                # Supprimer le processus de la liste
                if process_id in self.running_processes:
                    del self.running_processes[process_id]
                
                if process.returncode == 0:
                    return JsonResponse({
                        "success": True,
                        "output": stdout
                    })
                else:
                    return JsonResponse({
                        "success": False,
                        "error": stderr,
                        "output": stdout
                    })
            finally:
                timer.cancel()
                
        except Exception as e:
            return JsonResponse({
                "success": False,
                "error": str(e)
            })
        
    def uninstall_package(self, package_name, language="python", user_id="default"):
        """Désinstalle un package"""
        if language.lower() == "python":
            return self._uninstall_python_package(package_name, user_id)
        else:
            return JsonResponse({
                "success": False,
                "error": f"Désinstallation de packages pour {language} non prise en charge."
            })
    
    def _uninstall_python_package(self, package_name, user_id="default"):
        """Désinstalle un package Python de l'environnement virtuel de l'utilisateur"""
        user_venv = self.get_venv_path(user_id)
        
        # Déterminer le chemin de l'exécutable pip
        if os.name == 'nt':  # Windows
            pip_path = user_venv / "Scripts" / "pip.exe"
        else:  # Unix/Linux/MacOS
            pip_path = user_venv / "bin" / "pip"
        
        try:
            # Exécuter la désinstallation
            process = subprocess.run(
                [str(pip_path), "uninstall", "-y", package_name],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if process.returncode == 0:
                return JsonResponse({
                    "success": True,
                    "output": process.stdout
                })
            else:
                return JsonResponse({
                    "success": False,
                    "error": process.stderr,
                    "output": process.stdout
                })
        except subprocess.TimeoutExpired:
            return JsonResponse({
                "success": False,
                "error": "Délai d'attente dépassé lors de la désinstallation du package."
            })
        except Exception as e:
            return JsonResponse({
                "success": False,
                "error": str(e)
            })
    
    def list_packages(self, language="python", user_id="default"):
        """Liste tous les packages installés pour un langage spécifique"""
        if language.lower() == "python":
            return self._list_python_packages(user_id)
        else:
            return JsonResponse({
                "success": False,
                "error": f"Listage de packages pour {language} non pris en charge."
            })
    
    def _list_python_packages(self, user_id="default"):
        """Liste tous les packages Python installés dans l'environnement virtuel"""
        user_venv = self.get_venv_path(user_id)
        
        # Déterminer le chemin de l'exécutable pip
        if os.name == 'nt':  # Windows
            pip_path = user_venv / "Scripts" / "pip.exe"
        else:  # Unix/Linux/MacOS
            pip_path = user_venv / "bin" / "pip"
        
        try:
            # Exécuter la commande de liste en format JSON
            process = subprocess.run(
                [str(pip_path), "list", "--format=json"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if process.returncode == 0:
                try:
                    packages = json.loads(process.stdout)
                    return JsonResponse({
                        "success": True,
                        "packages": packages
                    })
                except json.JSONDecodeError:
                    return JsonResponse({
                        "success": False,
                        "error": "Erreur lors du décodage de la liste des packages."
                    })
            else:
                return JsonResponse({
                    "success": False,
                    "error": process.stderr
                })
        except subprocess.TimeoutExpired:
            return JsonResponse({
                "success": False,
                "error": "Délai d'attente dépassé lors de l'obtention de la liste des packages."
            })
        except Exception as e:
            return JsonResponse({
                "success": False,
                "error": str(e)
            })
    
    def cancel_package_install(self, package_name, user_id="default"):
        """Annule l'installation d'un package en cours"""
        process_id = f"{user_id}_{package_name}"
        
        if process_id in self.running_processes:
            try:
                self.running_processes[process_id].kill()
                del self.running_processes[process_id]
                return JsonResponse({
                    "success": True,
                    "message": f"Installation de {package_name} annulée."
                })
            except Exception as e:
                return JsonResponse({
                    "success": False,
                    "error": str(e)
                })
        else:
            return JsonResponse({
                "success": False,
                "error": f"Aucune installation en cours pour {package_name}."
            })