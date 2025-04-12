// file-system.js
// Gestion de la structure des fichiers et dossiers

// Structure pour simuler le système de fichiers
window.fileSystem = {
    "Users": {
        "projet": {
            "test": {
                "main.py": window.files["main.py"],
                "scraper.py": window.files["scraper.py"],
                "config.json": window.files["config.json"]
            },
            "vido": {}
        }
    }
};

// Chemin actuel dans le système de fichiers
window.currentPath = ["Users", "projet", "test"];

// Namespace pour la gestion du système de fichiers
window.FileSystem = {
    // Obtenir le dossier courant
    getCurrentDirectory: function() {
        let current = window.fileSystem;
        for (const dir of window.currentPath) {
            current = current[dir];
        }
        return current;
    },

    // Mettre à jour le prompt avec le chemin actuel
    updatePrompt: function() {
        const currentPrompt = `VidoHackers:\\${window.currentPath.join('\\')}>`; 
        document.querySelector(".terminal-input-prompt").textContent = currentPrompt;
        return currentPrompt;
    },

    // Fonction pour mettre à jour l'explorateur de fichiers
    updateFileExplorer: function() {
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
                    window.files[pathString] = content;
                }
            });
        }
        
        // Commencer par le répertoire racine (User/projet)
        let baseDir = window.fileSystem;
        if (baseDir["Users"] && baseDir["Users"]["projet"]) {
            renderDirectory(baseDir["Users"]["projet"], fileList, ["Users", "projet"]);
        }
        
        // Réattacher les événements au sidebar après la mise à jour
        this.attachSidebarEvents();
    },

    // Fonction pour attacher les événements au sidebar
    attachSidebarEvents: function() {
        // Gestion du clic sur les fichiers/dossiers
        document.querySelectorAll("#file-list li").forEach(item => {
            item.removeEventListener("click", this.fileItemClickHandler);
            item.addEventListener("click", this.fileItemClickHandler);
            
            // Double-clic pour renommer
            item.removeEventListener("dblclick", this.fileItemDblClickHandler);
            item.addEventListener("dblclick", this.fileItemDblClickHandler);
        });
    },

    // Gestionnaire pour le clic sur un élément du sidebar
    fileItemClickHandler: function(e) {
        e.stopPropagation();
        const path = this.getAttribute("data-path");
        const type = this.getAttribute("data-type");
        
        // Mettre à jour la classe active
        document.querySelectorAll("#file-list li").forEach(item => item.classList.remove("active"));
        this.classList.add("active");
        
        if (type === "folder") {
            // Naviguer vers ce dossier dans le terminal
            const folderPath = path.split('/');
            window.Terminal.executeCommand(`cd ${folderPath[folderPath.length - 1]}`);
        } else {
            // Ouvrir le fichier dans l'éditeur
            window.EditorManager.openFile(path);
        }
    },

    // Gestionnaire pour le double-clic (renommer)
    fileItemDblClickHandler: function(e) {
        e.stopPropagation();
        const path = this.getAttribute("data-path");
        const type = this.getAttribute("data-type");
        
        // Demander le nouveau nom
        const newName = prompt(`Renommer ${path} en:`, path.split('/').pop());
        if (newName && newName !== path.split('/').pop()) {
            window.FileSystem.renameFileOrFolder(path, newName, type);
        }
    },

    // Fonction pour renommer un fichier ou dossier
    renameFileOrFolder: function(path, newName, type) {
        const parts = path.split('/');
        const oldName = parts.pop();
        const parentPath = parts;
        
        // Trouver le répertoire parent
        let parentDir = window.fileSystem;
        for (const part of parentPath) {
            parentDir = parentDir[part];
        }
        
        if (!parentDir) {
            Utils.showNotification(`Erreur: Impossible de trouver le répertoire parent pour ${path}`, "error");
            return;
        }
        
        // Vérifier si le nouveau nom existe déjà
        if (parentDir[newName]) {
            Utils.showNotification(`Le nom '${newName}' existe déjà dans ce répertoire.`, "error");
            return;
        }
        
        // Copier le contenu et supprimer l'ancien
        parentDir[newName] = parentDir[oldName];
        delete parentDir[oldName];
        
        // Si c'est un fichier, mettre à jour la référence globale
        if (type === "file") {
            const content = window.files[path];
            const newPath = [...parentPath, newName].join('/');
            window.files[newPath] = content;
            delete window.files[path];
            
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
        this.updateFileExplorer();
        Utils.showNotification(`'${oldName}' renommé en '${newName}'.`);
    },

    // Sauvegarder l'espace de travail dans le localStorage
    saveWorkspace: function() {
        try {
            // Sauvegarder le contenu de tous les fichiers
            for (const path in window.EditorManager.editors) {
                window.files[path] = window.EditorManager.editors[path].getValue();
            }

            // Convertir le système de fichiers en JSON
            const data = {
                files: window.files,
                fileSystem: window.fileSystem,
                currentPath: window.currentPath
            };

            localStorage.setItem("vidoHackersWorkspace", JSON.stringify(data));

            console.log("Espace de travail sauvegardé");
        } catch (error) {
            console.error("Erreur lors de la sauvegarde de l'espace de travail:", error);
        }
    },

    // Charger l'espace de travail depuis le localStorage
    loadWorkspace: function() {
        try {
            const data = localStorage.getItem("vidoHackersWorkspace");
            if (data) {
                const workspace = JSON.parse(data);

                // Restaurer les fichiers
                if (workspace.files) {
                    Object.assign(window.files, workspace.files);
                }

                // Restaurer le système de fichiers
                if (workspace.fileSystem) {
                    Object.assign(window.fileSystem, workspace.fileSystem);
                }

                // Restaurer le chemin actuel
                if (workspace.currentPath) {
                    window.currentPath = workspace.currentPath;
                    this.updatePrompt();
                }

                // Mettre à jour l'explorateur de fichiers
                this.updateFileExplorer();

                console.log("Espace de travail chargé");
            }
        } catch (error) {
            console.error("Erreur lors du chargement de l'espace de travail:", error);
        }
    },

    // Fonction pour importer des fichiers
    importFiles: function(fileList) {
        // Créer une promesse pour chaque fichier à lire
        const filePromises = Array.from(fileList).map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    try {
                        const content = e.target.result;
                        
                        // Stocker le contenu du fichier dans le répertoire courant
                        const currentDir = window.FileSystem.getCurrentDirectory();
                        currentDir[file.name] = content;
                        
                        // Ajouter au système global de fichiers
                        const fullPath = [...window.currentPath, file.name].join('/');
                        window.files[fullPath] = content;
                        
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
                Utils.showNotification(`${importedFiles.length} fichiers importés avec succès.`);
                this.updateFileExplorer();
            })
            .catch(error => {
                Utils.showNotification(`Erreur lors de l'import: ${error.message}`, "error");
            });
    },

    // Ajouter la fonctionnalité d'importation de fichiers
    addImportFunctionality: function() {
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
                
                this.importFiles(files);
            });
        }
    },

    // Initialiser le système de fichiers
    initialize: function() {
        this.updateFileExplorer();
        this.addImportFunctionality();
    }
};