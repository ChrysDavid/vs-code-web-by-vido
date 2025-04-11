// Structure de données pour stocker le contenu des fichiers
const files = {
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

// Créer les éditeurs CodeMirror
const editors = {};

// Initialiser l'éditeur pour main.py
editors["main.py"] = CodeMirror.fromTextArea(document.getElementById("editor-main.py"), {
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
editors["main.py"].setValue(files["main.py"]);

// Structure pour simuler le système de fichiers
const fileSystem = {
    "Users": {
        "projet": {
            "test": {
                "main.py": files["main.py"],
                "scraper.py": files["scraper.py"],
                "config.json": files["config.json"]
            },
            "vido": {}
        }
    }
};

// Chemin actuel dans le système de fichiers
let currentPath = ["Users", "projet", "test"];

// Terminal interactif
const terminal = document.getElementById("terminal-content");
const terminalInput = document.getElementById("terminal-input");
let currentPrompt = "VidoHackers:\\Users\\projet\\test>";
let isRunning = false;
let currentProcess = null;
let inputQueue = [];
let waitingForInput = false;

// Historique des commandes
let commandHistory = [];
let historyIndex = -1;

// Gestion des onglets et des fichiers
function openFile(path) {
    // Si l'éditeur pour ce fichier n'existe pas, le créer
    if (!editors[path]) {
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

        editors[path] = CodeMirror.fromTextArea(document.getElementById(`editor-${path}`), {
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
        editors[path].setValue(files[path] || "");

        // Configurer les événements pour le nouvel onglet
        setupTabEvents();
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
    editors[path].focus();
    editors[path].refresh();
}

// Configuration des événements pour les onglets
function setupTabEvents() {
    // Cliquer sur un onglet pour l'activer
    document.querySelectorAll(".tab").forEach(tab => {
        tab.removeEventListener("click", tabClickHandler);
        tab.addEventListener("click", tabClickHandler);
    });

    // Fermer un onglet
    document.querySelectorAll(".tab-close").forEach(closeBtn => {
        closeBtn.removeEventListener("click", tabCloseHandler);
        closeBtn.addEventListener("click", tabCloseHandler);
    });
}

function tabClickHandler(e) {
    if (e.target.classList.contains("tab-close")) return;
    const path = this.getAttribute("data-path");
    openFile(path);
}

function tabCloseHandler(e) {
    e.stopPropagation();
    const tab = this.parentElement;
    const path = tab.getAttribute("data-path");
    const isActive = tab.classList.contains("active");

    // Sauvegarder le contenu avant de fermer
    files[path] = editors[path].getValue();

    // Supprimer l'onglet et l'éditeur
    tab.remove();
    document.querySelector(`.editor-panel[data-path="${path}"]`).remove();

    // Si l'onglet fermé était actif, en activer un autre
    if (isActive) {
        const remainingTabs = document.querySelectorAll(".tab");
        if (remainingTabs.length > 0) {
            const newPath = remainingTabs[0].getAttribute("data-path");
            openFile(newPath);
        }
    }
}

// Ajouter du texte au terminal
function appendToTerminal(text, type = "output") {
    const line = document.createElement("div");
    line.className = "terminal-line";

    const content = document.createElement("div");
    content.className = `terminal-line-${type}`;
    content.textContent = text;

    line.appendChild(content);
    terminal.appendChild(line);
    // Scroll au bas du terminal
    terminal.scrollTop = terminal.scrollHeight;
}

// Ajouter une commande avec son prompt
function appendCommand(command) {
    const line = document.createElement("div");
    line.className = "terminal-line";

    const prompt = document.createElement("div");
    prompt.className = "terminal-line-prompt";
    prompt.textContent = currentPrompt + " ";

    const input = document.createElement("div");
    input.className = "terminal-line-input";
    input.textContent = command;

    line.appendChild(prompt);
    line.appendChild(input);
    terminal.appendChild(line);

    // Scroll au bas du terminal
    terminal.scrollTop = terminal.scrollHeight;
}

// Obtenir le dossier courant
function getCurrentDirectory() {
    let current = fileSystem;
    for (const dir of currentPath) {
        current = current[dir];
    }
    return current;
}

// Mettre à jour le prompt avec le chemin actuel
function updatePrompt() {
    currentPrompt = `VidoHackers:\\${currentPath.join('\\')}>`;
    document.querySelector(".terminal-input-prompt").textContent = currentPrompt;
}

// Fonction pour réinitialiser complètement l'état du terminal
function resetTerminalState() {
    // Réinitialiser les variables d'état
    isRunning = false;
    currentProcess = null;
    waitingForInput = false;
    inputQueue = [];

    // Supprimer tous les champs d'entrée en ligne
    const inlineInputs = document.querySelectorAll(".terminal-inline-input, .terminal-input-special-line");
    inlineInputs.forEach(element => {
        if (element.closest) {
            const parent = element.closest('.terminal-line');
            if (parent) parent.remove();
        } else {
            element.remove();
        }
    });

    // S'assurer que la ligne d'entrée principale est visible et active
    const terminalInputLine = document.querySelector(".terminal-input-line");
    if (terminalInputLine) {
        terminalInputLine.style.display = "flex";

        // S'assurer que le prompt est correct
        const promptElement = terminalInputLine.querySelector(".terminal-input-prompt");
        if (promptElement) {
            promptElement.textContent = currentPrompt;
        }
    }

    // Réinitialiser le champ d'entrée et lui donner le focus
    const input = document.getElementById("terminal-input");
    if (input) {
        input.value = "";
        input.disabled = false;

        // Forcer le focus
        setTimeout(() => {
            input.focus();

            // Technique pour forcer le clignotement du curseur
            input.blur();
            setTimeout(() => input.focus(), 10);
        }, 50);
    }

    // Scroll au bas du terminal
    terminal.scrollTop = terminal.scrollHeight;
}

// Utilisez cette fonction à la place des multiples sections de code qui font la même chose
document.getElementById("kill-process").addEventListener("click", () => {
    if (isRunning) {
        appendToTerminal("\nProcessus arrêté", "error");
        resetTerminalState();
    }
});

// Ajoutez également un bouton de sauvegarde spécifique dans les contrôles
// qui réinitialise l'état du terminal en cas de problème
document.querySelector(".terminal-header-actions").insertAdjacentHTML(
    'beforeend',
    `<button id="reset-terminal" title="Réinitialiser le terminal"><i class="fas fa-sync-alt"></i></button>`
);

document.getElementById("reset-terminal").addEventListener("click", () => {
    appendToTerminal("Terminal réinitialisé", "output");
    resetTerminalState();
});

function focusTerminalInput() {
    // S'assurer que la ligne d'entrée est visible
    const terminalInputLine = document.querySelector(".terminal-input-line");
    if (terminalInputLine) {
        terminalInputLine.style.display = "flex";

        // Vider l'entrée et lui donner le focus
        const input = document.getElementById("terminal-input");
        if (input) {
            // Mettre le focus avec un léger délai
            setTimeout(() => {
                input.focus();
            }, 50);
        }
    }
}

// Exécuter une commande
function executeCommand(command) {
    // Ajouter la commande à l'historique
    commandHistory.unshift(command);
    historyIndex = -1;
    if (commandHistory.length > 50) commandHistory.pop();

    // Afficher la commande
    appendCommand(command);

    // Si on attend une entrée utilisateur
    if (waitingForInput) {
        inputQueue.push(command);
        waitingForInput = false;
        resumeExecution();
        return;
    }

    // Traitement des commandes
    if (command.trim() === "") {
        return;
    } else if (command === "help") {
        appendToTerminal("Commandes disponibles:");
        appendToTerminal("  help       - Affiche cette aide");
        appendToTerminal("  clear      - Efface l'écran du terminal");
        appendToTerminal("  python     - Exécute un fichier Python");
        appendToTerminal("  ls         - Liste les fichiers et dossiers");
        appendToTerminal("  cd         - Change de répertoire");
        appendToTerminal("  cat        - Affiche le contenu d'un fichier");
        appendToTerminal("  mkdir      - Crée un nouveau dossier");
        appendToTerminal("  touch      - Crée un nouveau fichier vide");
        appendToTerminal("  rm         - Supprime un fichier");
        appendToTerminal("  rmdir      - Supprime un dossier vide");
        appendToTerminal("  pwd        - Affiche le chemin actuel");
        appendToTerminal("  echo       - Affiche du texte");
        appendToTerminal("  mv         - Déplace ou renomme un fichier/dossier");
        appendToTerminal("  cp         - Copie un fichier/dossier");
        appendToTerminal("  exit       - Quitte le terminal (simulation)");
    } else if (command === "clear") {
        clearTerminal();
    } else if (command === "exit") {
        appendToTerminal("Déconnecté. (Simulation)");
    } else if (command.startsWith("python ")) {
        const fileName = command.substring(7).trim();
        const currentDir = getCurrentDirectory();

        if (currentDir[fileName]) {
            if (fileName.endsWith('.py')) {
                // Vérifier qu'aucun programme n'est déjà en cours d'exécution
                if (isRunning) {
                    appendToTerminal(`Un programme est déjà en cours d'exécution. Utilisez "Arrêter le processus" pour l'interrompre.`, "error");
                    return;
                }

                runPythonFile(fileName);
            } else {
                appendToTerminal(`${fileName} n'est pas un fichier Python.`, "error");
            }
        } else {
            appendToTerminal(`Fichier non trouvé: ${fileName}`, "error");
        }
    } else if (command.startsWith("cd ")) {
        const dir = command.substring(3).trim();

        if (dir === "..") {
            if (currentPath.length > 1) {
                currentPath.pop();
                updatePrompt();
                appendToTerminal(`Changement de répertoire vers: ${currentPath.join('\\')}`);
            } else {
                appendToTerminal("Vous êtes déjà à la racine.", "error");
            }
        } else if (dir === "~" || dir === "/") {
            currentPath = ["Users", "projet"];
            updatePrompt();
            appendToTerminal(`Changement de répertoire vers: ${currentPath.join('\\')}`);
        } else {
            const currentDir = getCurrentDirectory();

            if (currentDir[dir] && typeof currentDir[dir] === 'object') {
                currentPath.push(dir);
                updatePrompt();
                appendToTerminal(`Changement de répertoire vers: ${currentPath.join('\\')}`);
            } else {
                appendToTerminal(`Répertoire non trouvé: ${dir}`, "error");
            }
        }
    } else if (command === "ls" || command === "dir") {
        const currentDir = getCurrentDirectory();
        const entries = Object.entries(currentDir);

        if (entries.length === 0) {
            appendToTerminal("(Répertoire vide)");
        } else {
            entries.forEach(([name, content]) => {
                if (typeof content === 'object') {
                    appendToTerminal(`📁 ${name}/`);
                } else {
                    appendToTerminal(`📄 ${name}`);
                }
            });
        }
    } else if (command.startsWith("cat ")) {
        const fileName = command.substring(4).trim();
        const currentDir = getCurrentDirectory();

        if (currentDir[fileName] && typeof currentDir[fileName] === 'string') {
            appendToTerminal(currentDir[fileName]);
        } else {
            appendToTerminal(`Fichier non trouvé: ${fileName}`, "error");
        }
    } else if (command.startsWith("mkdir ")) {
        const dirName = command.substring(6).trim();
        const currentDir = getCurrentDirectory();
        
        if (dirName === "") {
            appendToTerminal("Nom de répertoire manquant.", "error");
        } else if (currentDir[dirName]) {
            appendToTerminal(`Le répertoire '${dirName}' existe déjà.`, "error");
        } else {
            currentDir[dirName] = {};
            appendToTerminal(`Répertoire '${dirName}' créé.`);
            
            // Mettre à jour l'explorateur de fichiers
            updateFileExplorer();
        }
    } else if (command.startsWith("touch ")) {
        const fileName = command.substring(6).trim();
        const currentDir = getCurrentDirectory();
        
        if (fileName === "") {
            appendToTerminal("Nom de fichier manquant.", "error");
        } else if (currentDir[fileName]) {
            appendToTerminal(`Le fichier '${fileName}' existe déjà.`, "error");
        } else {
            currentDir[fileName] = "";
            
            // Déterminer le chemin complet du fichier
            const fullPath = [...currentPath, fileName].join('/');
            files[fullPath] = "";  // Ajouter au système de fichiers global
            
            appendToTerminal(`Fichier '${fileName}' créé.`);
            
            // Mettre à jour l'explorateur de fichiers
            updateFileExplorer();
        }
    } else if (command.startsWith("rm ")) {
        const fileName = command.substring(3).trim();
        const currentDir = getCurrentDirectory();
        
        if (fileName === "") {
            appendToTerminal("Nom de fichier manquant.", "error");
        } else if (!currentDir[fileName]) {
            appendToTerminal(`Fichier non trouvé: ${fileName}`, "error");
        } else if (typeof currentDir[fileName] === 'object') {
            appendToTerminal(`'${fileName}' est un répertoire. Utilisez 'rmdir' pour supprimer un répertoire.`, "error");
        } else {
            delete currentDir[fileName];
            appendToTerminal(`Fichier '${fileName}' supprimé.`);
            
            // Supprimer l'onglet et l'éditeur si ouvert
            const fullPath = [...currentPath, fileName].join('/');
            const tab = document.querySelector(`.tab[data-path="${fullPath}"]`);
            if (tab) {
                tab.remove();
                document.querySelector(`.editor-panel[data-path="${fullPath}"]`).remove();
            }
            
            // Mettre à jour l'explorateur de fichiers
            updateFileExplorer();
        }
    } else if (command.startsWith("rmdir ")) {
        const dirName = command.substring(6).trim();
        const currentDir = getCurrentDirectory();
        
        if (dirName === "") {
            appendToTerminal("Nom de répertoire manquant.", "error");
        } else if (!currentDir[dirName]) {
            appendToTerminal(`Répertoire non trouvé: ${dirName}`, "error");
        } else if (typeof currentDir[dirName] !== 'object') {
            appendToTerminal(`'${dirName}' est un fichier. Utilisez 'rm' pour supprimer un fichier.`, "error");
        } else if (Object.keys(currentDir[dirName]).length > 0) {
            appendToTerminal(`Le répertoire '${dirName}' n'est pas vide.`, "error");
        } else {
            delete currentDir[dirName];
            appendToTerminal(`Répertoire '${dirName}' supprimé.`);
            
            // Mettre à jour l'explorateur de fichiers
            updateFileExplorer();
        }
    } else if (command.startsWith("mv ")) {
        const args = command.substring(3).trim().split(' ');
        if (args.length < 2) {
            appendToTerminal("Usage: mv source destination", "error");
        } else {
            const source = args[0];
            const destination = args[1];
            const currentDir = getCurrentDirectory();
            
            if (!currentDir[source]) {
                appendToTerminal(`Source non trouvée: ${source}`, "error");
            } else {
                // Déplacer vers un autre répertoire ou renommer
                if (destination.includes('/')) {
                    // Déplacer vers un autre répertoire
                    const destParts = destination.split('/');
                    const destName = destParts.pop();
                    let destDir = fileSystem;
                    
                    // Trouver le répertoire de destination
                    for (const part of destParts) {
                        if (!destDir[part] || typeof destDir[part] !== 'object') {
                            appendToTerminal(`Répertoire de destination non trouvé: ${destParts.join('/')}`, "error");
                            return;
                        }
                        destDir = destDir[part];
                    }
                    
                    // Déplacer le fichier/dossier
                    const finalName = destName || source;
                    destDir[finalName] = currentDir[source];
                    delete currentDir[source];
                    
                    appendToTerminal(`'${source}' déplacé vers '${destination}'.`);
                } else {
                    // Renommer
                    if (currentDir[destination]) {
                        appendToTerminal(`La destination '${destination}' existe déjà.`, "error");
                        return;
                    }
                    
                    currentDir[destination] = currentDir[source];
                    delete currentDir[source];
                    appendToTerminal(`'${source}' renommé en '${destination}'.`);
                }
                
                // Mettre à jour l'explorateur de fichiers
                updateFileExplorer();
            }
        }
    } else if (command.startsWith("cp ")) {
        const args = command.substring(3).trim().split(' ');
        if (args.length < 2) {
            appendToTerminal("Usage: cp source destination", "error");
        } else {
            const source = args[0];
            const destination = args[1];
            const currentDir = getCurrentDirectory();
            
            if (!currentDir[source]) {
                appendToTerminal(`Source non trouvée: ${source}`, "error");
            } else {
                // Copier le contenu
                const content = currentDir[source];
                
                // Si la destination est un chemin
                if (destination.includes('/')) {
                    const destParts = destination.split('/');
                    const destName = destParts.pop() || source;
                    let destDir = fileSystem;
                    
                    // Trouver le répertoire de destination
                    for (const part of destParts) {
                        if (!destDir[part] || typeof destDir[part] !== 'object') {
                            appendToTerminal(`Répertoire de destination non trouvé: ${destParts.join('/')}`, "error");
                            return;
                        }
                        destDir = destDir[part];
                    }
                    
                    // Copier le fichier/dossier
                    destDir[destName] = structuredClone(content); // Deep copy
                    appendToTerminal(`'${source}' copié vers '${destination}'.`);
                } else {
                    // Copier dans le même répertoire
                    if (currentDir[destination]) {
                        appendToTerminal(`La destination '${destination}' existe déjà.`, "error");
                        return;
                    }
                    
                    currentDir[destination] = structuredClone(content); // Deep copy
                    appendToTerminal(`'${source}' copié vers '${destination}'.`);
                }
                
                // Mettre à jour l'explorateur de fichiers
                updateFileExplorer();
            }
        }
    } else if (command === "pwd") {
        appendToTerminal(`${currentPath.join('\\')}`);
    } else if (command.startsWith("echo ")) {
        const text = command.substring(5).trim();
        appendToTerminal(text);
    } else {
        appendToTerminal(`Commande non reconnue: ${command}`, "error");
        appendToTerminal("Tapez 'help' pour voir les commandes disponibles.");
    }
}

// Effacer le terminal
function clearTerminal() {
    terminal.innerHTML = "";
    appendToTerminal("VidoHackers IDE v1.0.0 - Terminal interactif");
    appendToTerminal("Tapez 'help' pour afficher les commandes disponibles.");
}

// Exécuter un fichier Python
function runPythonFile(fileName) {
    if (!files[fileName]) {
        appendToTerminal(`Fichier non trouvé: ${fileName}`, "error");
        return;
    }

    isRunning = true;
    currentProcess = {
        fileName: fileName,
        code: files[fileName],
        state: 'running'
    };

    // Masquer l'invite de commande pendant l'exécution
    document.querySelector(".terminal-input-line").style.display = "none";

    appendToTerminal(`Exécution de ${fileName}...`);

    // Simuler une exécution asynchrone
    setTimeout(() => {
        try {
            executePythonCode(currentProcess.code);
        } catch (error) {
            appendToTerminal(`Erreur lors de l'exécution: ${error.message}`, "error");

            // En cas d'erreur, réafficher immédiatement l'invite
            isRunning = false;
            currentProcess = null;
            document.querySelector(".terminal-input-line").style.display = "flex";
            terminalInput.focus();
        }
    }, 100);
}

// Fonction pour mettre à jour l'explorateur de fichiers
function updateFileExplorer() {
    const fileList = document.getElementById("file-list");
    fileList.innerHTML = "";
    
    // Fonction récursive pour afficher l'arborescence des fichiers
    function renderDirectory(dir, container, path = [], indent = 0) {
        Object.entries(dir).sort(([nameA, contentA], [nameB, contentB]) => {
            // Trier: d'abord les dossiers, puis les fichiers (par ordre alphabétique)
            const isObjectA = typeof contentA === 'object';
            const isObjectB = typeof contentB === 'object';
            if (isObjectA && !isObjectB) return -1;
            if (!isObjectA && isObjectB) return 1;
            return nameA.localeCompare(nameB);
        }).forEach(([name, content]) => {
            const currentPath = [...path, name];
            const pathString = currentPath.join('/');
            
            const li = document.createElement("li");
            li.setAttribute("data-path", pathString);
            li.setAttribute("data-type", typeof content === 'object' ? "folder" : "file");
            
            // Ajouter un style d'indentation si nécessaire
            if (indent > 0) {
                li.style.paddingLeft = `${indent * 20}px`;
            }
            
            // Déterminer l'icône appropriée
            let icon = "fas fa-file";
            if (typeof content === 'object') {
                icon = "fas fa-folder";
            } else {
                // Icônes pour différents types de fichiers
                const fileType = name.split('.').pop().toLowerCase();
                if (fileType === "py") icon = "fab fa-python";
                else if (fileType === "json") icon = "fas fa-cog";
                else if (fileType === "js") icon = "fab fa-js";
                else if (fileType === "html") icon = "fab fa-html5";
                else if (fileType === "css") icon = "fab fa-css3";
                else if (["jpg", "jpeg", "png", "gif", "svg"].includes(fileType)) icon = "fas fa-image";
            }
            
            li.innerHTML = `<i class="${icon} gutter-icon"></i>${name}${typeof content === 'object' ? '/' : ''}`;
            container.appendChild(li);
            
            // Si c'est un dossier, afficher récursivement son contenu
            if (typeof content === 'object') {
                renderDirectory(content, container, currentPath, indent + 1);
            }
            
            // Ajouter au système global de fichiers si c'est un fichier
            if (typeof content === 'string') {
                files[pathString] = content;
            }
        });
    }
    
    // Commencer par le répertoire racine (User/projet)
    let baseDir = fileSystem;
    if (baseDir["Users"] && baseDir["Users"]["projet"]) {
        renderDirectory(baseDir["Users"]["projet"], fileList, ["Users", "projet"]);
    }
    
    // Réattacher les événements au sidebar après la mise à jour
    attachSidebarEvents();
}

// Fonction pour attacher les événements au sidebar
function attachSidebarEvents() {
    // Gestion du clic sur les fichiers/dossiers
    document.querySelectorAll("#file-list li").forEach(item => {
        item.removeEventListener("click", fileItemClickHandler);
        item.addEventListener("click", fileItemClickHandler);
        
        // Double-clic pour renommer
        item.removeEventListener("dblclick", fileItemDblClickHandler);
        item.addEventListener("dblclick", fileItemDblClickHandler);
    });
}

// Gestionnaire pour le clic sur un élément du sidebar
function fileItemClickHandler(e) {
    e.stopPropagation();
    const path = this.getAttribute("data-path");
    const type = this.getAttribute("data-type");
    
    // Mettre à jour la classe active
    document.querySelectorAll("#file-list li").forEach(item => item.classList.remove("active"));
    this.classList.add("active");
    
    if (type === "folder") {
        // Naviguer vers ce dossier dans le terminal
        const folderPath = path.split('/');
        executeCommand(`cd ${folderPath[folderPath.length - 1]}`);
    } else {
        // Ouvrir le fichier dans l'éditeur
        openFile(path);
    }
}

// Gestionnaire pour le double-clic (renommer)
function fileItemDblClickHandler(e) {
    e.stopPropagation();
    const path = this.getAttribute("data-path");
    const type = this.getAttribute("data-type");
    
    // Demander le nouveau nom
    const newName = prompt(`Renommer ${path} en:`, path.split('/').pop());
    if (newName && newName !== path.split('/').pop()) {
        renameFileOrFolder(path, newName, type);
    }
}

// Fonction pour renommer un fichier ou dossier
function renameFileOrFolder(path, newName, type) {
    const parts = path.split('/');
    const oldName = parts.pop();
    const parentPath = parts;
    
    // Trouver le répertoire parent
    let parentDir = fileSystem;
    for (const part of parentPath) {
        parentDir = parentDir[part];
    }
    
    if (!parentDir) {
        showNotification(`Erreur: Impossible de trouver le répertoire parent pour ${path}`, "error");
        return;
    }
    
    // Vérifier si le nouveau nom existe déjà
    if (parentDir[newName]) {
        showNotification(`Le nom '${newName}' existe déjà dans ce répertoire.`, "error");
        return;
    }
    
    // Copier le contenu et supprimer l'ancien
    parentDir[newName] = parentDir[oldName];
    delete parentDir[oldName];
    
    // Si c'est un fichier, mettre à jour la référence globale
    if (type === "file") {
        const content = files[path];
        const newPath = [...parentPath, newName].join('/');
        files[newPath] = content;
        delete files[path];
        
        // Si le fichier est ouvert dans l'éditeur, mettre à jour son onglet
        const tab = document.querySelector(`.tab[data-path="${path}"]`);
        if (tab) {
            tab.setAttribute("data-path", newPath);
            const tabNameElement = tab.childNodes[2]; // Le nœud texte après l'icône
            if (tabNameElement) {
                tabNameElement.textContent = newName;
            }
            
            // Mettre à jour le panneau d'éditeur
            const editorPanel = document.querySelector(`.editor-panel[data-path="${path}"]`);
            if (editorPanel) {
                editorPanel.setAttribute("data-path", newPath);
            }
        }
    }
    
    // Mettre à jour l'explorateur de fichiers
    updateFileExplorer();
    showNotification(`'${oldName}' renommé en '${newName}'.`);
}

// Simuler l'exécution du code Python côté client
function executePythonCode(code) {
    const lines = code.split('\n');
    const outputBuffer = {};
    let i = 0;
    let executionPaused = false;

    function processNextLine() {
        if (executionPaused) return;

        if (i >= lines.length) {
            appendToTerminal("\nExécution terminée", "output");
            
            // Réinitialiser les variables d'état
            isRunning = false;
            currentProcess = null;
            waitingForInput = false;

            // Créer un délai léger pour que le message d'exécution terminée soit visible
            setTimeout(() => {
                // IMPORTANT: Supprimer tous les champs d'entrée en ligne existants
                const inlineInputs = document.querySelectorAll(".terminal-inline-input");
                if (inlineInputs.length > 0) {
                    inlineInputs.forEach(input => {
                        const parent = input.closest('.terminal-input-line');
                        if (parent) parent.remove();
                    });
                }

                // S'assurer que la ligne d'entrée principale est visible et active
                const terminalInputLine = document.querySelector(".terminal-input-line");
                if (terminalInputLine) {
                    terminalInputLine.style.display = "flex";

                    // S'assurer que le prompt est correct
                    const promptElement = terminalInputLine.querySelector(".terminal-input-prompt");
                    if (promptElement) {
                        promptElement.textContent = currentPrompt;
                    }

                    // Réinitialiser le champ d'entrée et lui donner le focus
                    const input = document.getElementById("terminal-input");
                    if (input) {
                        input.value = "";
                        input.disabled = false; // S'assurer que l'entrée n'est pas désactivée

                        // Forcer le focus avec un délai plus long
                        setTimeout(() => {
                            input.focus();

                            // Technique pour forcer le clignotement du curseur
                            input.blur();
                            setTimeout(() => input.focus(), 10);

                            // Log pour vérifier que cette partie du code s'exécute
                            console.log("Focus donné à l'entrée du terminal");
                        }, 100);
                    }
                }

                // Scroll au bas du terminal
                terminal.scrollTop = terminal.scrollHeight;
            }, 300);

            return;
        }

        const line = lines[i].trim();
        i++;

        // Simuler les fonctions de base de Python
        if (line.startsWith('print(')) {
            // Extraire le contenu entre parenthèses
            const content = line.substring(6, line.length - 1);
            let output = "";

            // Gestion basique des chaînes de caractères
            if (content.startsWith('"') && content.endsWith('"') ||
                content.startsWith("'") && content.endsWith("'")) {
                output = content.substring(1, content.length - 1);
            }
            // Gestion basique des f-strings
            else if (content.startsWith('f"') && content.endsWith('"') ||
                content.startsWith("f'") && content.endsWith("'")) {
                output = content.substring(2, content.length - 1);

                // Remplacer les variables entre accolades par des valeurs simulées
                output = output.replace(/{([^}]*)}/g, (match, variable) => {
                    variable = variable.trim();
                    // Rechercher dans outputBuffer
                    if (outputBuffer[variable] !== undefined) {
                        return outputBuffer[variable];
                    }
                    // Cas spécial pour la boucle
                    if (variable === 'i') return i - 1;
                    return `[${variable}]`;
                });
            }
            // Autre cas
            else {
                output = `[Output de: ${content}]`;
            }

            appendToTerminal(output);
            setTimeout(processNextLine, 100);
        }
        // Simuler input()
        else if (line.includes('input(')) {
            const promptStart = line.indexOf('input(') + 6;
            const promptEnd = line.lastIndexOf(')');
            const prompt = line.substring(promptStart, promptEnd);
            let promptText = "";

            // Extraire le texte de prompt
            if (prompt.startsWith('"') && prompt.endsWith('"') ||
                prompt.startsWith("'") && prompt.endsWith("'")) {
                promptText = prompt.substring(1, prompt.length - 1);
            }

            // Créer une ligne d'input spéciale directement dans le terminal
            const inputLine = document.createElement("div");
            inputLine.className = "terminal-line terminal-input-special-line";

            const promptElement = document.createElement("span");
            promptElement.className = "terminal-line-output";
            promptElement.textContent = promptText + " ";

            const inputField = document.createElement("input");
            inputField.type = "text";
            inputField.className = "terminal-inline-input";
            inputField.style.background = "transparent";
            inputField.style.border = "none";
            inputField.style.outline = "none";
            inputField.style.color = "white";
            inputField.style.fontFamily = "Consolas, monospace";
            inputField.style.width = "70%";

            // Cacher la ligne d'entrée normale du terminal pendant l'input
            document.querySelector(".terminal-input-line").style.display = "none";

            inputLine.appendChild(promptElement);
            inputLine.appendChild(inputField);
            terminal.appendChild(inputLine);

            // Scroll au bas du terminal
            terminal.scrollTop = terminal.scrollHeight;

            // Extraire le nom de variable
            const variableName = line.split('=')[0].trim();

            // Mettre en pause l'exécution et attendre l'entrée utilisateur
            executionPaused = true;
            waitingForInput = true;

            // Focus sur l'input en ligne avec un délai pour s'assurer que le DOM est prêt
            setTimeout(() => {
                inputField.focus();

                // Technique pour forcer le clignotement du curseur
                inputField.blur();
                setTimeout(() => inputField.focus(), 10);
            }, 50);

            // Gérer l'entrée utilisateur
            inputField.addEventListener("keydown", function onEnter(e) {
                if (e.key === "Enter") {
                    const input = inputField.value;

                    // Supprimer l'écouteur d'événements pour éviter les doublons
                    inputField.removeEventListener("keydown", onEnter);

                    // Ajouter la valeur saisie au texte affiché (pour l'historique)
                    promptElement.textContent = promptText + " " + input;
                    inputField.style.display = "none";

                    // Stocker la valeur dans outputBuffer
                    outputBuffer[variableName] = input;

                    // Reprendre l'exécution
                    executionPaused = false;
                    waitingForInput = false;
                    setTimeout(processNextLine, 100);
                }
            });
        }

        // Simuler for loop
        else if (line.startsWith('for ') && line.includes(' in range(') && line.endsWith(':')) {
            // Juste passer à la ligne suivante
            setTimeout(processNextLine, 100);
        }
        // Simuler def de fonction
        else if (line.startsWith('def ') && line.endsWith(':')) {
            // Juste passer à la ligne suivante
            setTimeout(processNextLine, 100);
        }
        // Simuler une assignation de variable
        else if (line.includes('=') && !line.includes('==')) {
            // Juste passer à la ligne suivante
            setTimeout(processNextLine, 50);
        }
        // Simuler un return
        else if (line.startsWith('return ')) {
            // Juste passer à la ligne suivante
            setTimeout(processNextLine, 50);
        }
        // Ignorer les commentaires et lignes vides
        else if (line.startsWith('#') || line === '') {
            setTimeout(processNextLine, 20);
        }
        // Gérer l'import
        else if (line.startsWith('import ') || line.startsWith('from ')) {
            appendToTerminal(`[Simulation d'import: ${line}]`, "output");
            setTimeout(processNextLine, 100);
        }
        // Gérer try/except et autres blocs
        else if (line.endsWith(':')) {
            setTimeout(processNextLine, 50);
        }
        // Ignorer autres lignes
        else {
            setTimeout(processNextLine, 50);
        }
    }

    processNextLine();
}

// Reprendre l'exécution après une entrée utilisateur
function resumeExecution() {
    if (currentProcess && waitingForInput === false) {
        const variableName = window.currentInputVar;
        if (variableName && inputQueue.length > 0) {
            window.outputBuffer[variableName] = inputQueue[0];
        }

        setTimeout(() => {
            try {
                executePythonCode(currentProcess.code);
            } catch (error) {
                appendToTerminal(`Erreur lors de l'exécution: ${error.message}`, "error");
                isRunning = false;
                currentProcess = null;
            }
        }, 100);
    }
}

// Entrée utilisateur dans le terminal
terminalInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        const command = terminalInput.value;
        terminalInput.value = "";

        // Ignorer les entrées lorsqu'un input() est en attente d'une entrée en ligne
        if (document.querySelector(".terminal-inline-input")) {
            return;
        }

        if (waitingForInput && !document.querySelector(".terminal-inline-input")) {
            // Cas rare - si on attend une entrée mais pas avec notre nouvelle méthode
            if (window.resumeWithInput) {
                window.resumeWithInput(command);
            } else {
                inputQueue.push(command);
                waitingForInput = false;
                resumeExecution();
            }

            // Afficher l'entrée dans le terminal
            appendToTerminal(command);
        } else {
            // Sinon, c'est une commande normale
            executeCommand(command);
        }
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            terminalInput.value = commandHistory[historyIndex];
        }
    } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex > 0) {
            historyIndex--;
            terminalInput.value = commandHistory[historyIndex];
        } else {
            historyIndex = -1;
            terminalInput.value = "";
        }
    } else if (e.key === "Tab") {
        e.preventDefault();
        // Auto-complétion simple
        const input = terminalInput.value;
        const args = input.split(' ');
        const cmd = args[0];

        if (args.length >= 2) {
            const lastArg = args[args.length - 1];
            const currentDir = getCurrentDirectory();

            // Trouver les correspondances
            const matches = Object.keys(currentDir).filter(name =>
                name.startsWith(lastArg)
            );

            if (matches.length === 1) {
                // Compléter avec la seule correspondance
                args[args.length - 1] = matches[0];
                terminalInput.value = args.join(' ');
            } else if (matches.length > 1) {
                // Afficher toutes les possibilités
                appendToTerminal("Complétion possible:");
                matches.forEach(m => appendToTerminal(`  ${m}`));
            }
        }
    }
});

// Mettre le focus sur l'entrée du terminal lors d'un clic
document.getElementById("terminal").addEventListener("click", () => {
    terminalInput.focus();
});

// Bouton pour effacer le terminal
document.getElementById("clear-terminal").addEventListener("click", clearTerminal);

// Bouton pour arrêter le processus en cours
document.getElementById("kill-process").addEventListener("click", () => {
    if (isRunning) {
        isRunning = false;
        currentProcess = null;
        waitingForInput = false;
        inputQueue = [];

        // Supprimer les éventuels champs d'entrée en ligne qui pourraient exister
        const inlineInputs = document.querySelectorAll(".terminal-inline-input");
        inlineInputs.forEach(input => {
            if (input.parentElement) {
                input.parentElement.remove();
            }
        });

        appendToTerminal("\nProcessus arrêté", "error");

        // Réactiver la ligne de commande
        const terminalInputLine = document.querySelector(".terminal-input-line");
        terminalInputLine.style.display = "flex";

        // Vider le champ d'entrée et lui donner le focus
        document.getElementById("terminal-input").value = "";

        // Focus avec un léger délai
        setTimeout(() => {
            document.getElementById("terminal-input").focus();
            // Double focus pour garantir le clignotement du curseur
            document.getElementById("terminal-input").blur();
            setTimeout(() => document.getElementById("terminal-input").focus(), 10);
        }, 50);
    }
});

// Gestion du redimensionnement du terminal
const resizeHandle = document.getElementById("terminal-resize");
let isResizing = false;
let startY, startHeight;

resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startY = e.clientY;
    startHeight = document.querySelector(".terminal-container").offsetHeight;
    document.body.style.cursor = "ns-resize";
    e.preventDefault();
});

document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    const dy = startY - e.clientY;
    const newHeight = startHeight + dy;
    if (newHeight > 100 && newHeight < window.innerHeight - 200) {
        document.querySelector(".terminal-container").style.height = `${newHeight}px`;
        // Rafraîchir les éditeurs pour éviter les problèmes d'affichage
        Object.values(editors).forEach(editor => editor.refresh());
    }
});

document.addEventListener("mouseup", () => {
    if (isResizing) {
        isResizing = false;
        document.body.style.cursor = "";
    }
});

// Gestion du menu contextuel pour les fichiers
let activeContextFile = null;
document.addEventListener("contextmenu", (e) => {
    const li = e.target.closest("#file-list li");
    if (li) {
        e.preventDefault();
        activeContextFile = li.getAttribute("data-path");
        const contextMenu = document.getElementById("file-context-menu");
        contextMenu.style.display = "block";
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
    }
});

document.addEventListener("click", () => {
    document.getElementById("file-context-menu").style.display = "none";
});

// Exécuter un fichier depuis le menu contextuel
document.getElementById("context-run").addEventListener("click", () => {
    if (activeContextFile && activeContextFile.endsWith(".py")) {
        executeCommand(`python ${activeContextFile}`);
    } else {
        appendToTerminal("Seuls les fichiers Python peuvent être exécutés.", "error");
    }
});

// Dialogue pour créer un nouveau fichier
const backdrop = document.getElementById("backdrop");
const newFileDialog = document.getElementById("new-file-dialog");

document.getElementById("new-file-btn").addEventListener("click", () => {
    document.getElementById("new-file-name").value = "";
    backdrop.style.display = "block";
    newFileDialog.style.display = "block";
    document.getElementById("new-file-name").focus();
});

document.getElementById("cancel-new-file").addEventListener("click", () => {
    backdrop.style.display = "none";
    newFileDialog.style.display = "none";
});

document.getElementById("create-new-file").addEventListener("click", () => {
    const fileName = document.getElementById("new-file-name").value.trim();
    if (fileName) {
        // Créer un nouveau fichier dans le répertoire courant
        const currentDir = getCurrentDirectory();
        currentDir[fileName] = "";

        // Ajouter au système de fichiers global
        const fullPath = [...currentPath, fileName].join('/');
        files[fullPath] = "";

        // Mettre à jour l'explorateur de fichiers
        updateFileExplorer();

        // Ouvrir le nouveau fichier
        openFile(fullPath);

        backdrop.style.display = "none";
        newFileDialog.style.display = "none";
    }
});

// Gérer l'appui sur Entrée dans le champ de texte pour créer un fichier
document.getElementById("new-file-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        document.getElementById("create-new-file").click();
    }
});

// Dialogue pour créer un nouveau dossier
document.getElementById("new-folder-btn").addEventListener("click", () => {
    document.getElementById("new-folder-name").value = "";
    backdrop.style.display = "block";
    document.getElementById("new-folder-dialog").style.display = "block";
    document.getElementById("new-folder-name").focus();
});

document.getElementById("cancel-new-folder").addEventListener("click", () => {
    backdrop.style.display = "none";
    document.getElementById("new-folder-dialog").style.display = "none";
});

document.getElementById("create-new-folder").addEventListener("click", () => {
    const folderName = document.getElementById("new-folder-name").value.trim();
    if (folderName) {
        // Créer un nouveau dossier dans le répertoire courant
        const currentDir = getCurrentDirectory();
        currentDir[folderName] = {};

        // Mettre à jour l'explorateur de fichiers
        updateFileExplorer();

        backdrop.style.display = "none";
        document.getElementById("new-folder-dialog").style.display = "none";
    }
});

// Gérer l'appui sur Entrée dans le champ de texte pour créer un dossier
document.getElementById("new-folder-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        document.getElementById("create-new-folder").click();
    }
});

// Bouton d'exécution du code
document.getElementById("run-button").addEventListener("click", () => {
    // Récupérer le fichier actif
    const activeTab = document.querySelector(".tab.active");
    if (activeTab) {
        const path = activeTab.getAttribute("data-path");
        const language = document.getElementById("language-select").value;

        // Sauvegarder les modifications avant d'exécuter
        if (editors[path]) {
            files[path] = editors[path].getValue();

            // Mettre à jour dans le système de fichiers
            const parts = path.split('/');
            if (parts.length > 1) {
                if (fileSystem["Users"]["projet"][parts[0]]) {
                    fileSystem["Users"]["projet"][parts[0]][parts[1]] = editors[path].getValue();
                }
            } else {
                fileSystem["Users"]["projet"]["test"][path] = editors[path].getValue();
            }
        }

        // Exécuter en fonction du langage
        if (language === "python" && path.endsWith('.py')) {
            executeCommand(`python ${path}`);
        } else if (language === "javascript" && path.endsWith('.js')) {
            appendToTerminal(`Exécution de JavaScript non prise en charge dans cette version.`, "error");
        } else if (language === "java" && path.endsWith('.java')) {
            appendToTerminal(`Exécution de Java non prise en charge dans cette version.`, "error");
        } else if (language === "c" && path.endsWith('.c')) {
            appendToTerminal(`Exécution de C non prise en charge dans cette version.`, "error");
        } else {
            appendToTerminal(`Extension de fichier incompatible avec le langage sélectionné.`, "error");
        }
    } else {
        appendToTerminal("Aucun fichier actif à exécuter.", "error");
    }
});

// Renommer un fichier (du menu contextuel)
document.getElementById("context-rename").addEventListener("click", () => {
    if (activeContextFile) {
        const newName = prompt(`Renommer ${activeContextFile} en:`, activeContextFile.split('/').pop());
        if (newName && newName !== activeContextFile.split('/').pop()) {
            // Trouver le fichier dans le système de fichiers
            const parts = activeContextFile.split('/');
            let content;
            let currentDir;

            if (parts.length > 1) {
                // Fichier dans un sous-dossier
                currentDir = fileSystem["Users"]["projet"][parts[0]];
                content = currentDir[parts[1]];

                // Vérifier si le nouveau nom existe déjà
                if (currentDir[newName]) {
                    appendToTerminal(`Le fichier '${newName}' existe déjà.`, "error");
                    return;
                }

                // Copier le contenu et supprimer l'ancien
                currentDir[newName] = content;
                delete currentDir[parts[1]];
            } else {
                // Fichier à la racine
                currentDir = getCurrentDirectory();
                content = currentDir[activeContextFile];

                // Vérifier si le nouveau nom existe déjà
                if (currentDir[newName]) {
                    appendToTerminal(`Le fichier '${newName}' existe déjà.`, "error");
                    return;
                }

                // Copier le contenu et supprimer l'ancien
                currentDir[newName] = content;
                delete currentDir[activeContextFile];
            }

            // Mettre à jour l'explorateur de fichiers
            updateFileExplorer();

            appendToTerminal(`'${activeContextFile}' renommé en '${newName}'.`);
        }
    }
});

// Supprimer un fichier (du menu contextuel)
document.getElementById("context-delete").addEventListener("click", () => {
    if (activeContextFile) {
        if (confirm(`Êtes-vous sûr de vouloir supprimer '${activeContextFile}' ?`)) {
            // Trouver le fichier dans le système de fichiers
            const parts = activeContextFile.split('/');
            let currentDir;

            if (parts.length > 1) {
                // Fichier dans un sous-dossier
                currentDir = fileSystem["Users"]["projet"][parts[0]];
                delete currentDir[parts[1]];
            } else {
                // Fichier à la racine
                currentDir = getCurrentDirectory();
                delete currentDir[activeContextFile];
            }

            // Supprimer l'onglet et l'éditeur si ouvert
            const tab = document.querySelector(`.tab[data-path="${activeContextFile}"]`);
            if (tab) {
                tab.remove();
                document.querySelector(`.editor-panel[data-path="${activeContextFile}"]`).remove();
            }

            // Mettre à jour l'explorateur de fichiers
            updateFileExplorer();

            appendToTerminal(`'${activeContextFile}' supprimé.`);
        }
    }
});

// Fonctionnalité d'importation de fichiers
function addImportFunctionality() {
    // Ajouter un bouton d'import dans les actions de fichier
    const fileActions = document.querySelector('.sidebar .file-actions');
    if (fileActions) {
        const importButton = document.createElement('button');
        importButton.id = 'import-files-btn';
        importButton.title = 'Importer des fichiers';
        importButton.innerHTML = '<i class="fas fa-file-import"></i>';
        fileActions.appendChild(importButton);
        
        // Ajouter un input file invisible
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'file-input';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        // Gestionnaire pour le bouton d'import
        importButton.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Gestionnaire pour l'input file
        fileInput.addEventListener('change', (event) => {
            const files = event.target.files;
            if (!files || files.length === 0) return;
            
            importFiles(files);
        });
    }
}

// Fonction pour importer des fichiers
function importFiles(fileList) {
    // Créer une promesse pour chaque fichier à lire
    const filePromises = Array.from(fileList).map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    
                    // Stocker le contenu du fichier dans le répertoire courant
                    const currentDir = getCurrentDirectory();
                    currentDir[file.name] = content;
                    
                    // Ajouter au système global de fichiers
                    const fullPath = [...currentPath, file.name].join('/');
                    files[fullPath] = content;
                    
                    resolve(file.name);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = function() {
                reject(new Error(`Erreur lors de la lecture de ${file.name}`));
            };
            
            // Lire le fichier comme texte
            reader.readAsText(file);
        });
    });
    
    // Attendre que tous les fichiers soient importés
    Promise.all(filePromises)
        .then(importedFiles => {
            showNotification(`${importedFiles.length} fichiers importés avec succès.`);
            updateFileExplorer();
        })
        .catch(error => {
            showNotification(`Erreur lors de l'import: ${error.message}`, "error");
        });
}

// Fonctionnalité de web scraping
function addWebScrapingFunctionality() {
    // Ajouter un fichier de script de scraping si celui-ci n'existe pas
    if (!fileSystem["Users"]["projet"]["test"]["web_scraper.py"]) {
        const scrapingScript = `# Script de Web Scraping
import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

# Dossier de base pour les fichiers téléchargés
output_folder = "scraped_content"

# Crée les dossiers s'ils n'existent pas
os.makedirs(output_folder, exist_ok=True)

# Fonction pour télécharger et enregistrer un fichier
def download_file(url, base_folder):
    try:
        response = requests.get(url)
        if response.status_code == 200:
            # Extraire le chemin du fichier à partir de l'URL
            parsed_url = urlparse(url)
            file_path = parsed_url.path.lstrip("/")  # Supprimer le "/" initial du chemin

            # Déterminer le chemin complet du fichier local
            local_file_path = os.path.join(base_folder, file_path)
            local_folder = os.path.dirname(local_file_path)

            # Créer les dossiers locaux s'ils n'existent pas
            os.makedirs(local_folder, exist_ok=True)

            # Télécharger et sauvegarder le fichier
            with open(local_file_path, 'wb') as f:
                f.write(response.content)
            print(f"Downloaded: {url}")
        else:
            print(f"Failed to download {url}")
    except Exception as e:
        print(f"Error downloading {url}: {e}")

# Fonction pour extraire et télécharger les fichiers HTML, CSS, JS, Images, etc.
def scrape_files(url, base_folder, visited_pages=set()):
    try:
        # Télécharger la page HTML principale
        response = requests.get(url)
        if response.status_code == 200:
            visited_pages.add(url)

            # Sauvegarder la page HTML principale
            soup = BeautifulSoup(response.text, 'html.parser')
            page_filename = get_filename_from_url(url)
            download_file(url, base_folder)

            # Scraper les liens CSS
            for link in soup.find_all('link', href=True):
                file_url = urljoin(url, link['href'])
                if link['href'].endswith('.css'):
                    download_file(file_url, base_folder)

            # Scraper les scripts JS
            for script in soup.find_all('script', src=True):
                file_url = urljoin(url, script['src'])
                if file_url.endswith('.js'):
                    download_file(file_url, base_folder)

            # Scraper les images et autres fichiers
            for img in soup.find_all(['img', 'source'], src=True):
                file_url = urljoin(url, img['src'])
                download_file(file_url, base_folder)

            # Scraper tous les liens vers d'autres pages HTML du même site
            for a_tag in soup.find_all('a', href=True):
                next_page = urljoin(url, a_tag['href'])

                # Filtrer uniquement les liens HTML internes
                if is_internal_html(next_page, url) and next_page not in visited_pages:
                    print(f"Scraping linked page: {next_page}")
                    scrape_files(next_page, base_folder, visited_pages)

            print("Scraping terminé.")
        else:
            print(f"Erreur: Impossible de récupérer la page. Status code {response.status_code}")
    except Exception as e:
        print(f"Erreur lors du scraping : {e}")

# Vérifie si un lien est une page HTML interne
def is_internal_html(link, base_url):
    parsed_link = urlparse(link)
    parsed_base = urlparse(base_url)

    # Comparer les noms de domaine et vérifier si c'est une page HTML
    return parsed_link.netloc == parsed_base.netloc and (parsed_link.path.endswith('.html') or parsed_link.path == '')

# Génère un nom de fichier unique pour une page en fonction de son URL
def get_filename_from_url(url):
    parsed_url = urlparse(url)
    if parsed_url.path == "" or parsed_url.path == "/":
        return "index.html"
    else:
        path = parsed_url.path.strip("/").replace("/", "_")
        if not path.endswith(".html"):
            path += ".html"
        return path

# Programme principal
if __name__ == "__main__":
    url_to_scrape = input("Entrez l'URL à scraper: ")
    scrape_files(url_to_scrape, output_folder)`;

        fileSystem["Users"]["projet"]["test"]["web_scraper.py"] = scrapingScript;
        files["web_scraper.py"] = scrapingScript;
    }

    // Ajouter un bouton pour lancer le web scraping
    const toolbarContainer = document.querySelector('.editor-controls');
    if (toolbarContainer) {
        const scrapingButton = document.createElement('button');
        scrapingButton.id = 'scraping-btn';
        scrapingButton.className = 'primary';
        scrapingButton.innerHTML = '<i class="fas fa-spider"></i> Scraper';
        scrapingButton.title = 'Lancer le web scraping';
        
        toolbarContainer.appendChild(scrapingButton);
        
        // Gestionnaire d'événement pour le bouton
        scrapingButton.addEventListener('click', () => {
            // Ouvrir le fichier web_scraper.py
            openFile("web_scraper.py");
            
            // Demander l'URL à scraper
            const url = prompt("Entrez l'URL à scraper:", "https://example.com");
            if (url) {
                // Simuler l'exécution du script de scraping
                simulateWebScraping(url);
            }
        });
    }
}

// Simuler l'exécution d'un script de web scraping
function simulateWebScraping(url) {
    // Créer un dossier 'scraped_content' s'il n'existe pas
    const currentDir = getCurrentDirectory();
    if (!currentDir["scraped_content"]) {
        currentDir["scraped_content"] = {};
    }
    
    // Nettoyer le terminal
    clearTerminal();
    
    // Simuler l'exécution
    appendToTerminal(`Exécution de web_scraper.py...`);
    appendToTerminal(`[Simulation d'import: import os]`);
    appendToTerminal(`[Simulation d'import: import requests]`);
    appendToTerminal(`[Simulation d'import: from bs4 import BeautifulSoup]`);
    appendToTerminal(`[Simulation d'import: from urllib.parse import urljoin, urlparse]`);
    appendToTerminal(`Entrez l'URL à scraper: ${url}`);
    
    // Masquer l'invite du terminal
    document.querySelector(".terminal-input-line").style.display = "none";
    
    // Simulation du scraping
    setTimeout(() => {
        appendToTerminal(`Scraping de ${url}...`);
        appendToTerminal(`Downloaded: ${url}`);
        
        setTimeout(() => {
            appendToTerminal(`Downloaded: ${url}/css/style.css`);
            appendToTerminal(`Downloaded: ${url}/js/script.js`);
            
            setTimeout(() => {
                appendToTerminal(`Downloaded: ${url}/images/logo.png`);
                appendToTerminal(`Scraping linked page: ${url}/about.html`);
                
                setTimeout(() => {
                    appendToTerminal(`Downloaded: ${url}/about.html`);
                    appendToTerminal(`Scraping terminé.`);
                    
                    // Peupler le dossier scraped_content avec quelques fichiers simulés
                    currentDir["scraped_content"]["index.html"] = `<!DOCTYPE html><html><body><h1>Page scrapée depuis ${url}</h1></body></html>`;
                    currentDir["scraped_content"]["about.html"] = `<!DOCTYPE html><html><body><h1>À propos - Page scrapée</h1></body></html>`;
                    
                    // Créer un sous-dossier css
                    currentDir["scraped_content"]["css"] = {
                        "style.css": `body { font-family: Arial; }`
                    };
                    
                    // Créer un sous-dossier js
                    currentDir["scraped_content"]["js"] = {
                        "script.js": `console.log("Script de ${url}");`
                    };
                    
                    // Créer un sous-dossier images
                    currentDir["scraped_content"]["images"] = {
                        "logo.txt": "[image binaire simulée]"
                    };
                    
                    // Mettre à jour l'explorateur de fichiers
                    updateFileExplorer();
                    
                    // Réafficher l'invite du terminal
                    document.querySelector(".terminal-input-line").style.display = "flex";
                    resetTerminalState();
                    
                    // Notification
                    showNotification("Web scraping terminé avec succès!");
                }, 1000);
            }, 1000);
        }, 1000);
    }, 1000);
}

// Gestion des notifications
function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">×</button>
    `;

    document.body.appendChild(notification);

    // Animation d'entrée
    setTimeout(() => {
        notification.classList.add("show");
    }, 10);

    // Fermeture automatique après 5 secondes
    const timeout = setTimeout(() => {
        closeNotification(notification);
    }, 5000);

    // Fermeture manuelle
    const closeBtn = notification.querySelector(".notification-close");
    closeBtn.addEventListener("click", () => {
        clearTimeout(timeout);
        closeNotification(notification);
    });

    function closeNotification(notif) {
        notif.classList.remove("show");
        setTimeout(() => {
            notif.remove();
        }, 300);
    }
}

// Raccourcis clavier globaux
document.addEventListener("keydown", (e) => {
    // Ctrl+S pour sauvegarder
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();

        const activeTab = document.querySelector(".tab.active");
        if (activeTab) {
            const path = activeTab.getAttribute("data-path");
            if (editors[path]) {
                files[path] = editors[path].getValue();

                // Mise à jour du contenu dans le système de fichiers
                const parts = path.split('/');
                if (parts.length > 1) {
                    let currentDir = fileSystem;
                    // Naviguer jusqu'au répertoire parent
                    for (let i = 0; i < parts.length - 1; i++) {
                        currentDir = currentDir[parts[i]];
                    }
                    // Mettre à jour le fichier
                    currentDir[parts[parts.length - 1]] = editors[path].getValue();
                } else {
                    fileSystem["Users"]["projet"]["test"][path] = editors[path].getValue();
                }

                showNotification(`Fichier ${path} sauvegardé.`);
            }
        }
    }

    // Ctrl+R pour exécuter
    else if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        document.getElementById("run-button").click();
    }

    // Ctrl+` pour focus terminal
    else if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        terminalInput.focus();
    }

    // Échap pour fermer les dialogues
    else if (e.key === "Escape") {
        if (document.getElementById("new-file-dialog").style.display === "block") {
            document.getElementById("cancel-new-file").click();
        }
        if (document.getElementById("new-folder-dialog").style.display === "block") {
            document.getElementById("cancel-new-folder").click();
        }
    }
});

// Persistance des données
function saveWorkspace() {
    try {
        // Sauvegarder le contenu de tous les fichiers
        for (const path in editors) {
            files[path] = editors[path].getValue();
        }

        // Convertir le système de fichiers en JSON
        const data = {
            files: files,
            fileSystem: fileSystem,
            currentPath: currentPath
        };

        localStorage.setItem("vidoHackersWorkspace", JSON.stringify(data));

        console.log("Espace de travail sauvegardé");
    } catch (error) {
        console.error("Erreur lors de la sauvegarde de l'espace de travail:", error);
    }
}

function loadWorkspace() {
    try {
        const data = localStorage.getItem("vidoHackersWorkspace");
        if (data) {
            const workspace = JSON.parse(data);

            // Restaurer les fichiers
            if (workspace.files) {
                Object.assign(files, workspace.files);
            }

            // Restaurer le système de fichiers
            if (workspace.fileSystem) {
                Object.assign(fileSystem, workspace.fileSystem);
            }

            // Restaurer le chemin actuel
            if (workspace.currentPath) {
                currentPath = workspace.currentPath;
                updatePrompt();
            }

            // Mettre à jour l'explorateur de fichiers
            updateFileExplorer();

            console.log("Espace de travail chargé");
        }
    } catch (error) {
        console.error("Erreur lors du chargement de l'espace de travail:", error);
    }
}

// Sauvegarder l'espace de travail automatiquement
setInterval(saveWorkspace, 30000);  // Toutes les 30 secondes

// Sauvegarder avant de quitter la page
window.addEventListener("beforeunload", saveWorkspace);

// Initialisation
function initializeIDE() {
    updateFileExplorer();
    setupTabEvents();
    addImportFunctionality();
    addWebScrapingFunctionality();
    resetTerminalState();
    loadWorkspace();
    
    // Mettre à jour la position du curseur pour l'éditeur actif
    for (const path in editors) {
        editors[path].on("cursorActivity", (cm) => {
            const pos = cm.getCursor();
            document.getElementById("cursor-position").textContent = `Ln ${pos.line + 1}, Col ${pos.ch + 1}`;
        });
    }
}

// Lancer l'initialisation quand la page est chargée
document.addEventListener("DOMContentLoaded", initializeIDE);