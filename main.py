import os

# Structure du projet
structure = {
    "ideproject": [
        "ideproject/__init__.py",
        "ideproject/asgi.py",
        "ideproject/settings.py",
        "ideproject/urls.py",
        "ideproject/wsgi.py",
        "static/css/style.css",
        "static/js/script.js",
        "templates/ide/index.html",
        "webide/__init__.py",
        "webide/admin.py",
        "webide/apps.py",
        "webide/models.py",
        "webide/urls.py",
        "webide/views/__init__.py",
        "webide/views/code_execution.py",
        "webide/views/file_management.py",
        "webide/views/main.py",
        "webide/utils/__init__.py",
        "webide/utils/execution.py",
        "webide/tests.py",
        "webide/migrations/__init__.py",
        "manage.py"
    ]
}

# Fonction pour créer les fichiers et dossiers
def create_structure(structure):
    for base, files in structure.items():
        for file_path in files:
            full_path = os.path.join(base, file_path)
            dir_path = os.path.dirname(full_path)
            os.makedirs(dir_path, exist_ok=True)  # Créer le dossier si nécessaire
            with open(full_path, 'w') as f:
                f.write("")  # Crée un fichier vide

# Exécuter la création
create_structure(structure)

print("Structure du projet créée avec succès.")
