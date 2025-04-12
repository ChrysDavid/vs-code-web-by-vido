// editor-manager.js
// Gestion des éditeurs CodeMirror et des onglets

// Structure de données pour stocker le contenu des fichiers
window.files = {
    "main.py": `# Programme principal
print("Bienvenue sur VidoHackers IDE!")

# Exemple de code qui demande une entrée utilisateur
nom = input("Entrez votre nom: ")
print(f"Bonjour, {nom}!")

# Exemple d'une boucle
for i in range(5):
    print(f"Compteur: {i}")

# Exemple d'utilisation de fonctions
def saluer(personne):
    return f"Bonjour {personne}!"

message = saluer(nom)
print(message)`,
    "scraper.py": `# Exemple simple de web scraping
import requests
from bs4 import BeautifulSoup

def scraper_site(url):
    """Fonction qui permet de récupérer le titre d'une page web."""
    try:
        # Envoi de la requête HTTP
        response = requests.get(url)
        response.raise_for_status()  # Vérifie si la requête a réussi
        
        # Analyse du contenu HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Récupération du titre de la page
        titre = soup.title.string if soup.title else "Titre non trouvé"
        
        return {
            "titre": titre,
            "statut": response.status_code,
            "url": url
        }
    except Exception as e:
        return {
            "erreur": str(e),
            "url": url
        }

# Test de la fonction
if __name__ == "__main__":
    url_test = "https://www.example.com"
    resultat = scraper_site(url_test)
    print(f"Résultat du scraping pour {url_test}:")
    for cle, valeur in resultat.items():
        print(f"{cle}: {valeur}")`,
    "config.json": `{
    "application": "VidoHackers IDE",
    "version": "1.0.0",
    "configuration": {
        "theme": "dark",
        "font_size": 14,
        "tab_size": 4,
        "auto_save": true,
        "language": "fr"
    },
    "execution": {
        "python_path": "/usr/bin/python3",
        "timeout": 30,
        "max_memory": "512M"
    },
    "extensions": [
        "python",
        "javascript",
        "markdown",
        "html",
        "css"
    ]
}`
};

// Namespace pour la gestion des éditeurs
window.EditorManager = {
    // Créer les éditeurs CodeMirror
    editors: {},

    // Initialiser l'éditeur pour main.py
    initializeMainEditor: function() {
        this.editors["main.py"] = CodeMirror.fromTextArea(document.getElementById("editor-main.py"), {
            mode: "python",
            theme: "material-darker",
            lineNumbers: true,
            indentUnit: 4,
            tabSize: 4,
            autoCloseBrackets: true,
            matchBrackets: true,
            lineWrapping: false,
            extraKeys: {
                "Ctrl-Space": "autocomplete",
                "Tab": function (cm) {
                    const spaces = Array(cm.getOption("indentUnit") + 1).join(" ");
                    cm.replaceSelection(spaces);
                }
            }
        });

        // Définir le contenu initial
        this.editors["main.py"].setValue(window.files["main.py"]);

        // Configurer la mise à jour de la position du curseur
        this.updateCursorPosition();
    },

    // Mettre à jour la position du curseur pour l'éditeur actif
    updateCursorPosition: function() {
        for (const path in this.editors) {
            this.editors[path].on("cursorActivity", (cm) => {
                const pos = cm.getCursor();
                document.getElementById("cursor-position").textContent = `Ln ${pos.line + 1}, Col ${pos.ch + 1}`;
            });
        }
    },

    // Ouvrir un fichier dans l'éditeur
    openFile: function(path) {
        // Si l'éditeur pour ce fichier n'existe pas, le créer
        if (!this.editors[path]) {
            // Créer un nouvel onglet
            const tabsContainer = document.getElementById("editor-tabs");
            const fileType = path.split('.').pop();
            let icon = "fas fa-file";

            if (fileType === "py") icon = "fab fa-python";
            else if (fileType === "json") icon = "fas fa-cog";
            else if (fileType === "js") icon = "fab fa-js";
            else if (fileType === "html") icon = "fab fa-html5";
            else if (fileType === "css") icon = "fab fa-css3";

            const tabHTML = `
                <div class="tab" data-path="${path}">
                    <i class="${icon} gutter-icon"></i>
                    ${path}
                    <span class="tab-close">×</span>
                </div>
            `;
            tabsContainer.insertAdjacentHTML('beforeend', tabHTML);

            // Créer un nouvel éditeur
            const editorContainer = document.getElementById("editor-container");
            const editorPanelHTML = `
                <div class="editor-panel" data-path="${path}">
                    <textarea id="editor-${path}"></textarea>
                </div>
            `;
            editorContainer.insertAdjacentHTML('beforeend', editorPanelHTML);

            // Configurer l'éditeur CodeMirror
            let mode = "text/plain";
            if (fileType === "py") mode = "python";
            else if (fileType === "js" || fileType === "json") mode = "javascript";
            else if (fileType === "html") mode = "htmlmixed";
            else if (fileType === "css") mode = "css";

            this.editors[path] = CodeMirror.fromTextArea(document.getElementById(`editor-${path}`), {
                mode: mode,
                theme: "material-darker",
                lineNumbers: true,
                indentUnit: 4,
                tabSize: 4,
                autoCloseBrackets: true,
                matchBrackets: true,
                lineWrapping: false
            });

            // Définir le contenu du fichier
            this.editors[path].setValue(window.files[path] || "");

            // Configurer les événements pour le nouvel onglet
            this.setupTabEvents();
        }

        // Activer l'onglet
        document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
        document.querySelector(`.tab[data-path="${path}"]`).classList.add("active");

        // Activer l'éditeur
        document.querySelectorAll(".editor-panel").forEach(panel => panel.classList.remove("active"));
        document.querySelector(`.editor-panel[data-path="${path}"]`).classList.add("active");

        // Mettre à jour la liste des fichiers
        document.querySelectorAll("#file-list li").forEach(item => item.classList.remove("active"));
        const fileItem = document.querySelector(`#file-list li[data-path="${path}"]`);
        if (fileItem) {
            fileItem.classList.add("active");
        }

        // Mettre le focus sur l'éditeur actif
        this.editors[path].focus();
        this.editors[path].refresh();
    },

    // Configuration des événements pour les onglets
    setupTabEvents: function() {
        // Cliquer sur un onglet pour l'activer
        document.querySelectorAll(".tab").forEach(tab => {
            tab.removeEventListener("click", this.tabClickHandler);
            tab.addEventListener("click", this.tabClickHandler);
        });

        // Fermer un onglet
        document.querySelectorAll(".tab-close").forEach(closeBtn => {
            closeBtn.removeEventListener("click", this.tabCloseHandler);
            closeBtn.addEventListener("click", this.tabCloseHandler);
        });
    },

    tabClickHandler: function(e) {
        if (e.target.classList.contains("tab-close")) return;
        const path = this.getAttribute("data-path");
        window.EditorManager.openFile(path);
    },

    tabCloseHandler: function(e) {
        e.stopPropagation();
        const tab = this.parentElement;
        const path = tab.getAttribute("data-path");
        const isActive = tab.classList.contains("active");

        // Sauvegarder le contenu avant de fermer
        window.files[path] = window.EditorManager.editors[path].getValue();

        // Supprimer l'onglet et l'éditeur
        tab.remove();
        document.querySelector(`.editor-panel[data-path="${path}"]`).remove();

        // Si l'onglet fermé était actif, en activer un autre
        if (isActive) {
            const remainingTabs = document.querySelectorAll(".tab");
            if (remainingTabs.length > 0) {
                const newPath = remainingTabs[0].getAttribute("data-path");
                window.EditorManager.openFile(newPath);
            }
        }
    },

    // Initialisation principale des éditeurs
    initialize: function() {
        this.initializeMainEditor();
        this.setupTabEvents();
    }
};