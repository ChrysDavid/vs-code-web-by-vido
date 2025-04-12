// utils.js
// Fonctions utilitaires pour l'application

// Namespace global pour les utilitaires
window.Utils = {
    // Gestion des notifications
    showNotification: function(message, type = "info") {
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
            this.closeNotification(notification);
        }, 5000);

        // Fermeture manuelle
        const closeBtn = notification.querySelector(".notification-close");
        closeBtn.addEventListener("click", () => {
            clearTimeout(timeout);
            this.closeNotification(notification);
        });
    },

    closeNotification: function(notif) {
        notif.classList.remove("show");
        setTimeout(() => {
            notif.remove();
        }, 300);
    },

    // Configurer les raccourcis clavier globaux
    setupGlobalShortcuts: function() {
        document.addEventListener("keydown", (e) => {
            // Ctrl+S pour sauvegarder
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();

                const activeTab = document.querySelector(".tab.active");
                if (activeTab) {
                    const path = activeTab.getAttribute("data-path");
                    if (window.EditorManager.editors[path]) {
                        window.files[path] = window.EditorManager.editors[path].getValue();

                        // Mise à jour du contenu dans le système de fichiers
                        const parts = path.split('/');
                        if (parts.length > 1) {
                            let currentDir = window.fileSystem;
                            // Naviguer jusqu'au répertoire parent
                            for (let i = 0; i < parts.length - 1; i++) {
                                currentDir = currentDir[parts[i]];
                            }
                            // Mettre à jour le fichier
                            currentDir[parts[parts.length - 1]] = window.EditorManager.editors[path].getValue();
                        } else {
                            window.fileSystem["Users"]["projet"]["test"][path] = window.EditorManager.editors[path].getValue();
                        }

                        Utils.showNotification(`Fichier ${path} sauvegardé.`);
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
                document.getElementById("terminal-input").focus();
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
    },

    // Configurer la gestion du redimensionnement du terminal
    setupTerminalResize: function() {
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
                Object.values(window.EditorManager.editors).forEach(editor => editor.refresh());
            }
        });

        document.addEventListener("mouseup", () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = "";
            }
        });
    },

    // Configurer le menu contextuel pour les fichiers
    setupContextMenu: function() {
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
                window.Terminal.executeCommand(`python ${activeContextFile}`);
            } else {
                window.Terminal.appendToTerminal("Seuls les fichiers Python peuvent être exécutés.", "error");
            }
        });

        // Renommer un fichier (du menu contextuel)
        document.getElementById("context-rename").addEventListener("click", () => {
            if (activeContextFile) {
                const newName = prompt(`Renommer ${activeContextFile} en:`, activeContextFile.split('/').pop());
                if (newName && newName !== activeContextFile.split('/').pop()) {
                    // Déterminer si c'est un fichier ou un dossier
                    const type = document.querySelector(`#file-list li[data-path="${activeContextFile}"]`).getAttribute("data-type");
                    window.FileSystem.renameFileOrFolder(activeContextFile, newName, type);
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
                        currentDir = window.fileSystem["Users"]["projet"][parts[0]];
                        delete currentDir[parts[1]];
                    } else {
                        // Fichier à la racine
                        currentDir = window.FileSystem.getCurrentDirectory();
                        delete currentDir[activeContextFile];
                    }

                    // Supprimer l'onglet et l'éditeur si ouvert
                    const tab = document.querySelector(`.tab[data-path="${activeContextFile}"]`);
                    if (tab) {
                        tab.remove();
                        document.querySelector(`.editor-panel[data-path="${activeContextFile}"]`).remove();
                    }

                    // Mettre à jour l'explorateur de fichiers
                    window.FileSystem.updateFileExplorer();

                    window.Terminal.appendToTerminal(`'${activeContextFile}' supprimé.`);
                }
            }
        });
    },

    // Configurer les dialogues de création de fichiers/dossiers
    setupDialogs: function() {
        const backdrop = document.getElementById("backdrop");
        const newFileDialog = document.getElementById("new-file-dialog");
        const newFolderDialog = document.getElementById("new-folder-dialog");

        // Dialogue pour créer un nouveau fichier
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
                const currentDir = window.FileSystem.getCurrentDirectory();
                currentDir[fileName] = "";

                // Ajouter au système de fichiers global
                const fullPath = [...window.currentPath, fileName].join('/');
                window.files[fullPath] = "";

                // Mettre à jour l'explorateur de fichiers
                window.FileSystem.updateFileExplorer();

                // Ouvrir le nouveau fichier
                window.EditorManager.openFile(fullPath);

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
            newFolderDialog.style.display = "block";
            document.getElementById("new-folder-name").focus();
        });

        document.getElementById("cancel-new-folder").addEventListener("click", () => {
            backdrop.style.display = "none";
            newFolderDialog.style.display = "none";
        });

        document.getElementById("create-new-folder").addEventListener("click", () => {
            const folderName = document.getElementById("new-folder-name").value.trim();
            if (folderName) {
                // Créer un nouveau dossier dans le répertoire courant
                const currentDir = window.FileSystem.getCurrentDirectory();
                currentDir[folderName] = {};

                // Mettre à jour l'explorateur de fichiers
                window.FileSystem.updateFileExplorer();

                backdrop.style.display = "none";
                newFolderDialog.style.display = "none";
            }
        });

        // Gérer l'appui sur Entrée dans le champ de texte pour créer un dossier
        document.getElementById("new-folder-name").addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                document.getElementById("create-new-folder").click();
            }
        });
    },

    // Configurer le bouton d'exécution du code
    setupRunButton: function() {
        document.getElementById("run-button").addEventListener("click", () => {
            // Récupérer le fichier actif
            const activeTab = document.querySelector(".tab.active");
            if (activeTab) {
                const path = activeTab.getAttribute("data-path");
                const language = document.getElementById("language-select").value;

                // Sauvegarder les modifications avant d'exécuter
                if (window.EditorManager.editors[path]) {
                    window.files[path] = window.EditorManager.editors[path].getValue();

                    // Mettre à jour dans le système de fichiers
                    const parts = path.split('/');
                    if (parts.length > 1) {
                        if (window.fileSystem["Users"]["projet"][parts[0]]) {
                            window.fileSystem["Users"]["projet"][parts[0]][parts[1]] = window.EditorManager.editors[path].getValue();
                        }
                    } else {
                        window.fileSystem["Users"]["projet"]["test"][path] = window.EditorManager.editors[path].getValue();
                    }
                }

                // Exécuter en fonction du langage
                if (language === "python" && path.endsWith('.py')) {
                    window.Terminal.executeCommand(`python ${path}`);
                } else if (language === "javascript" && path.endsWith('.js')) {
                    window.Terminal.appendToTerminal(`Exécution de JavaScript non prise en charge dans cette version.`, "error");
                } else if (language === "java" && path.endsWith('.java')) {
                    window.Terminal.appendToTerminal(`Exécution de Java non prise en charge dans cette version.`, "error");
                } else if (language === "c" && path.endsWith('.c')) {
                    window.Terminal.appendToTerminal(`Exécution de C non prise en charge dans cette version.`, "error");
                } else {
                    window.Terminal.appendToTerminal(`Extension de fichier incompatible avec le langage sélectionné.`, "error");
                }
            } else {
                window.Terminal.appendToTerminal("Aucun fichier actif à exécuter.", "error");
            }
        });
    }
};