// terminal.js
// Gestion du terminal interactif

// Namespace pour le terminal
window.Terminal = {
    // Variables du terminal
    terminal: document.getElementById("terminal-content"),
    terminalInput: document.getElementById("terminal-input"),
    currentPrompt: "",
    isRunning: false,
    currentProcess: null,
    inputQueue: [],
    waitingForInput: false,
    packageInstallRunning: false,
    lastCommand: null,

    // Historique des commandes
    commandHistory: [],
    historyIndex: -1,

    // Initialiser le terminal
    initialize: function () {
        this.currentPrompt = window.FileSystem.updatePrompt();

        // Configurer les gestionnaires d'événements
        document.getElementById("clear-terminal").addEventListener("click", this.clearTerminal.bind(this));
        document.getElementById("kill-process").addEventListener("click", this.killProcess.bind(this));
        document.getElementById("terminal").addEventListener("click", this.focusTerminalInput.bind(this));

        // Ajouter le bouton de réinitialisation du terminal si nécessaire
        if (!document.getElementById("reset-terminal")) {
            document.querySelector(".terminal-header-actions").insertAdjacentHTML(
                'beforeend',
                `<button id="reset-terminal" title="Réinitialiser le terminal"><i class="fas fa-sync-alt"></i></button>`
            );
            document.getElementById("reset-terminal").addEventListener("click", this.resetTerminal.bind(this));
        }

        // Configurer les événements pour l'entrée du terminal
        this.setupTerminalInput();

        // Afficher le message de bienvenue
        this.clearTerminal();
    },

    // Ajouter du texte au terminal
    appendToTerminal: function (text, type = "output") {
        const line = document.createElement("div");
        line.className = "terminal-line";

        const content = document.createElement("div");
        content.className = `terminal-line-${type}`;
        content.textContent = text;

        line.appendChild(content);
        this.terminal.appendChild(line);

        // Scroll au bas du terminal - TOUJOURS
        this.scrollToBottom();
    },

    // Fonction dédiée pour scroller au bas du terminal
    scrollToBottom: function() {
        if (!this.terminal) return;
        
        // Ajout d'un élément d'espacement temporaire pour garantir que le prompte est visible
        const spacer = document.createElement('div');
        spacer.style.height = '50vh'; // 50% de la hauteur de la fenêtre visible
        spacer.style.minHeight = '200px'; // hauteur minimale
        spacer.className = 'terminal-scroll-spacer';
        
        // Supprimer tout ancien spacer
        const oldSpacer = this.terminal.querySelector('.terminal-scroll-spacer');
        if (oldSpacer) {
            oldSpacer.remove();
        }
        
        // Ajouter le nouveau spacer
        this.terminal.appendChild(spacer);
        
        // Faire défiler jusqu'à la ligne d'entrée
        const inputLine = document.querySelector('.terminal-input-line');
        if (inputLine) {
            // Position la ligne d'entrée au milieu de la vue
            inputLine.scrollIntoView({ behavior: 'auto', block: 'center' });
        } else {
            // Si pas de ligne d'entrée, défiler jusqu'au dernier élément
            const lastElement = this.terminal.lastElementChild;
            if (lastElement) {
                lastElement.scrollIntoView({ behavior: 'auto', block: 'center' });
            }
        }
        
        // Nettoyer après le défilement
        setTimeout(() => {
            // Supprimer le spacer après que le défilement est terminé
            if (spacer && spacer.parentNode) {
                spacer.remove();
            }
        }, 100);
    },


    // Ajouter une commande avec son prompt
    appendCommand: function (command) {
        const line = document.createElement("div");
        line.className = "terminal-line";

        const prompt = document.createElement("div");
        prompt.className = "terminal-line-prompt";
        prompt.textContent = this.currentPrompt + " ";

        const input = document.createElement("div");
        input.className = "terminal-line-input";
        input.textContent = command;

        line.appendChild(prompt);
        line.appendChild(input);
        this.terminal.appendChild(line);

        // Scroll au bas du terminal
        this.scrollToBottom();
    },

    // Efface le terminal
    clearTerminal: function () {
        this.terminal.innerHTML = "";
        this.appendToTerminal("VidoHackers IDE v1.0.0 - Terminal interactif");
        this.appendToTerminal("Tapez 'help' pour afficher les commandes disponibles.");
    },

    // Fonction pour réinitialiser complètement l'état du terminal
    resetTerminalState: function () {
        // Réinitialiser les variables d'état
        this.isRunning = false;
        this.currentProcess = null;
        this.waitingForInput = false;
        this.inputQueue = [];
        this.packageInstallRunning = false;

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
                promptElement.textContent = this.currentPrompt;
            }
        }

        // Réinitialiser le champ d'entrée et lui donner le focus
        if (this.terminalInput) {
            this.terminalInput.value = "";
            this.terminalInput.disabled = false;

            // Forcer le focus
            setTimeout(() => {
                this.terminalInput.focus();

                // Technique pour forcer le clignotement du curseur
                this.terminalInput.blur();
                setTimeout(() => this.terminalInput.focus(), 10);
            }, 50);
        }

        // Scroll au bas du terminal
        this.scrollToBottom();
    },

    // Configurer les événements pour l'entrée du terminal
    setupTerminalInput: function () {
        this.terminalInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const command = this.terminalInput.value;
                this.terminalInput.value = "";

                // Ignorer les entrées lorsqu'un input() est en attente d'une entrée en ligne
                if (document.querySelector(".terminal-inline-input")) {
                    return;
                }

                if (this.waitingForInput && !document.querySelector(".terminal-inline-input")) {
                    // Cas rare - si on attend une entrée mais pas avec notre nouvelle méthode
                    if (window.resumeWithInput) {
                        window.resumeWithInput(command);
                    } else {
                        this.inputQueue.push(command);
                        this.waitingForInput = false;
                        this.resumeExecution();
                    }

                    // Afficher l'entrée dans le terminal
                    this.appendToTerminal(command);
                } else {
                    // Sinon, c'est une commande normale
                    this.executeCommand(command);
                }

                // Toujours scroller en bas après l'exécution d'une commande
                this.scrollToBottom();
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (this.historyIndex < this.commandHistory.length - 1) {
                    this.historyIndex++;
                    this.terminalInput.value = this.commandHistory[this.historyIndex];
                }
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    this.terminalInput.value = this.commandHistory[this.historyIndex];
                } else {
                    this.historyIndex = -1;
                    this.terminalInput.value = "";
                }
            } else if (e.key === "Tab") {
                e.preventDefault();
                // Auto-complétion simple
                const input = this.terminalInput.value;
                const args = input.split(' ');
                const cmd = args[0];

                if (args.length >= 2) {
                    const lastArg = args[args.length - 1];
                    const currentDir = window.FileSystem.getCurrentDirectory();

                    // Trouver les correspondances
                    const matches = Object.keys(currentDir).filter(name =>
                        name.startsWith(lastArg)
                    );

                    if (matches.length === 1) {
                        // Compléter avec la seule correspondance
                        args[args.length - 1] = matches[0];
                        this.terminalInput.value = args.join(' ');
                    } else if (matches.length > 1) {
                        // Afficher toutes les possibilités
                        this.appendToTerminal("Complétion possible:");
                        matches.forEach(m => this.appendToTerminal(`  ${m}`));
                        this.scrollToBottom();
                    }
                }
            }
        });
    },

    // Donner le focus à l'entrée du terminal
    focusTerminalInput: function () {
        // S'assurer que la ligne d'entrée est visible
        const terminalInputLine = document.querySelector(".terminal-input-line");
        if (terminalInputLine) {
            terminalInputLine.style.display = "flex";

            // Vider l'entrée et lui donner le focus
            if (this.terminalInput) {
                // Mettre le focus avec un léger délai
                setTimeout(() => {
                    this.terminalInput.focus();
                }, 50);
            }
        }

        // Scroll au bas du terminal
        this.scrollToBottom();
    },

    // Fonction pour tuer un processus en cours
    killProcess: function () {
        if (this.isRunning || this.packageInstallRunning) {
            this.isRunning = false;
            this.currentProcess = null;
            this.waitingForInput = false;
            this.inputQueue = [];
            this.packageInstallRunning = false;

            // Annuler l'installation de package si en cours
            if (this.lastCommand && this.lastCommand.startsWith("pip install")) {
                // Envoyer une requête d'annulation au serveur si nécessaire
                // fetch('/cancel_package_install/');
            }

            // Supprimer les éventuels champs d'entrée en ligne qui pourraient exister
            const inlineInputs = document.querySelectorAll(".terminal-inline-input");
            inlineInputs.forEach(input => {
                if (input.parentElement) {
                    input.parentElement.remove();
                }
            });

            this.appendToTerminal("\nProcessus arrêté", "error");

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

            // Scroll au bas du terminal
            this.scrollToBottom();
        }
    },

    // Fonction pour réinitialiser le terminal
    resetTerminal: function () {
        this.appendToTerminal("Terminal réinitialisé", "output");
        this.resetTerminalState();
    },

    getApiBasePath: function() {
        // Utiliser une URL absolue pour éviter les problèmes de chemin
        return window.location.origin + '/';  // Inclut le protocole, le domaine et le port
    },

    // Exécuter un fichier Python
    runPythonFile: function (fileName) {
        if (!window.files[fileName]) {
            this.appendToTerminal(`Fichier non trouvé: ${fileName}`, "error");
            return;
        }

        this.isRunning = true;
        this.currentProcess = {
            fileName: fileName,
            code: window.files[fileName],
            state: 'running'
        };

        // Masquer l'invite de commande pendant l'exécution
        document.querySelector(".terminal-input-line").style.display = "none";

        this.appendToTerminal(`Exécution de ${fileName}...`);
        this.scrollToBottom();

        // Envoyer le code au serveur pour exécution
        fetch(window.location.origin + '/execute/', {  
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            body: new URLSearchParams({
                'code': this.currentProcess.code,
                'language': 'python'
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur serveur: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.output) {
                    this.appendToTerminal(data.output);
                }

                // Vérifier si le programme attend une entrée utilisateur
                if (data.needs_input) {
                    this.handleUserInput(data);
                } else {
                    if (data.error) {
                        this.appendToTerminal(data.error, "error");
                    }

                    if (data.exit_code === 0 || !data.needs_input) {
                        // Programme terminé normalement
                        this.appendToTerminal("Exécution terminée");
                        this.isRunning = false;
                        this.currentProcess = null;
                        document.querySelector(".terminal-input-line").style.display = "flex";
                        this.terminalInput.focus();
                    }
                }

                this.scrollToBottom();
            })
            .catch(error => {
                this.appendToTerminal(`Erreur de communication avec le serveur: ${error.message}`, "error");
                this.isRunning = false;
                this.currentProcess = null;
                document.querySelector(".terminal-input-line").style.display = "flex";
                this.terminalInput.focus();
                this.scrollToBottom();
            });
    },

    handleUserInput: function(programOutput) {
        // Si le programme attend une entrée utilisateur
        if (programOutput.needs_input) {
            this.waitingForInput = true;
            
            // Créer une ligne d'entrée spéciale dans le terminal
            const inputLine = document.createElement("div");
            inputLine.className = "terminal-line";
            
            const inputField = document.createElement("input");
            inputField.className = "terminal-inline-input";
            inputField.type = "text";
            inputField.autocomplete = "off";
            inputField.spellcheck = false;
            
            // Ajouter le champ d'entrée à la ligne
            inputLine.appendChild(inputField);
            this.terminal.appendChild(inputLine);
            
            // Donner le focus au champ d'entrée
            setTimeout(() => {
                inputField.focus();
            }, 50);
            
            // Configurer l'événement de validation (Entrée)
            inputField.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    const userInput = inputField.value + "\n"; // Ajouter nouvelle ligne nécessaire pour input()
                    
                    // Afficher l'entrée saisie
                    this.appendToTerminal(userInput.trim());
                    
                    // Supprimer le champ d'entrée
                    inputLine.remove();
                    
                    // Envoyer l'entrée au serveur
                    this.sendInputToRunningProgram(userInput);
                    
                    // Empêcher le traitement par défaut
                    e.preventDefault();
                }
            });
            
            // Scroll en bas pour s'assurer que l'entrée est visible
            this.scrollToBottom();
            return true;
        }
        return false;
    },

    handlePipCommand: function (command) {
        const pipCommand = command.substring(4).trim();

        if (pipCommand === "install --upgrade pip" || pipCommand === "--upgrade pip") {
            // Cas spécial pour mettre à jour pip
            this.appendToTerminal("Mise à jour de pip...");
            this.scrollToBottom();

            fetch(this.getApiBasePath() + '/install_package/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({
                    'package': "--upgrade pip",
                    'language': 'python',
                    'special_command': 'upgrade_pip'
                })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erreur serveur: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.output) this.appendToTerminal(data.output);
                    if (data.error) this.appendToTerminal(data.error, "error");

                    if (data.success) {
                        this.appendToTerminal("Pip mis à jour avec succès.");
                    } else {
                        this.appendToTerminal("Échec de la mise à jour de pip.", "error");
                    }
                    this.scrollToBottom();
                })
                .catch(error => {
                    this.appendToTerminal(`Erreur: ${error.message}`, "error");
                    this.scrollToBottom();
                });
            return true;
        }
        return false;
    },

    // Envoyer l'entrée utilisateur au programme en cours d'exécution
    sendInputToRunningProgram: function (userInput) {
        if (!this.isRunning || !this.currentProcess) {
            return;
        }

        // Envoyer l'entrée au serveur
        fetch(this.getApiBasePath() + '/execute/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            body: new URLSearchParams({
                'code': this.currentProcess.code,
                'language': 'python',
                'stdin': userInput
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur serveur: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.output) {
                    this.appendToTerminal(data.output);
                }

                // Vérifier si le programme attend encore une entrée
                if (data.needs_input) {
                    this.handleUserInput(data);
                } else {
                    if (data.error) {
                        this.appendToTerminal(data.error, "error");
                    }

                    if (data.exit_code === 0 || !data.needs_input) {
                        // Programme terminé
                        this.appendToTerminal("Exécution terminée");
                        this.isRunning = false;
                        this.currentProcess = null;
                        document.querySelector(".terminal-input-line").style.display = "flex";
                        this.terminalInput.focus();
                    }
                }

                this.scrollToBottom();
            })
            .catch(error => {
                this.appendToTerminal(`Erreur de communication avec le serveur: ${error.message}`, "error");
                this.isRunning = false;
                this.currentProcess = null;
                document.querySelector(".terminal-input-line").style.display = "flex";
                this.terminalInput.focus();
                this.scrollToBottom();
            });
    },

    // Fonction pour installer des packages Python via pip
    installPythonPackage: function (packageName) {
        if (this.isRunning || this.packageInstallRunning) {
            this.appendToTerminal("Un processus est déjà en cours d'exécution.", "error");
            return;
        }

        this.packageInstallRunning = true;
        this.lastCommand = `pip install ${packageName}`;

        // Masquer l'invite de commande pendant l'installation
        document.querySelector(".terminal-input-line").style.display = "none";

        this.appendToTerminal(`Installation du package: ${packageName}...`);
        this.scrollToBottom();

        // Envoyer la requête d'installation au serveur
        fetch(this.getApiBasePath() + '/install_package/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            body: new URLSearchParams({
                'package': packageName,
                'language': 'python'
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur serveur: ${response.status}`);
                }
                // Vérifier le type de contenu pour éviter les erreurs de parsing JSON
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return response.json();
                }
                throw new Error('Réponse du serveur invalide: format JSON attendu');
            })
            .then(data => {
                if (data.output) {
                    this.appendToTerminal(data.output);
                }
                if (data.error) {
                    this.appendToTerminal(data.error, "error");
                }

                if (data.success) {
                    this.appendToTerminal(`Package '${packageName}' installé avec succès.`);
                } else {
                    this.appendToTerminal(`Échec de l'installation du package '${packageName}'.`, "error");
                }

                // Réactiver l'invite de commande
                this.packageInstallRunning = false;
                this.lastCommand = null;
                document.querySelector(".terminal-input-line").style.display = "flex";
                this.terminalInput.focus();
                this.scrollToBottom();
            })
            .catch(error => {
                this.appendToTerminal(`Erreur de communication avec le serveur: ${error.message}`, "error");
                this.packageInstallRunning = false;
                this.lastCommand = null;
                document.querySelector(".terminal-input-line").style.display = "flex";
                this.terminalInput.focus();
                this.scrollToBottom();
            });
    },

    // Reprendre l'exécution après une entrée utilisateur
    resumeExecution: function () {
        if (this.currentProcess && this.waitingForInput === false) {
            const variableName = window.currentInputVar;
            if (variableName && this.inputQueue.length > 0) {
                window.outputBuffer[variableName] = this.inputQueue[0];
            }

            setTimeout(() => {
                try {
                    window.CodeExecution.executePythonCode(this.currentProcess.code);
                } catch (error) {
                    this.appendToTerminal(`Erreur lors de l'exécution: ${error.message}`, "error");
                    this.isRunning = false;
                    this.currentProcess = null;
                }
            }, 100);
        }
    },

    // Exécuter une commande
    executeCommand: function (command) {
        console.log("Exécution de la commande:", command);

        // Mise à jour du prompt
        this.currentPrompt = window.FileSystem.updatePrompt();

        // Ajouter la commande à l'historique
        this.commandHistory.unshift(command);
        this.historyIndex = -1;
        if (this.commandHistory.length > 50) this.commandHistory.pop();

        // Afficher la commande
        this.appendCommand(command);

        // Si on attend une entrée utilisateur
        if (this.waitingForInput) {
            this.inputQueue.push(command);
            this.waitingForInput = false;
            this.resumeExecution();
            return;
        }

        // Traitement des commandes
        if (command.trim() === "") {
            console.log("Commande vide détectée");
            return;
        } else if (command === "help") {
            console.log("Commande help détectée");
            this.appendToTerminal("Commandes disponibles:");
            this.appendToTerminal("  help       - Affiche cette aide");
            this.appendToTerminal("  clear      - Efface l'écran du terminal");
            this.appendToTerminal("  python     - Exécute un fichier Python");
            this.appendToTerminal("  pip        - Gère les packages Python (pip install <package>)");
            this.appendToTerminal("  ls         - Liste les fichiers et dossiers");
            this.appendToTerminal("  cd         - Change de répertoire");
            this.appendToTerminal("  cat        - Affiche le contenu d'un fichier");
            this.appendToTerminal("  mkdir      - Crée un nouveau dossier");
            this.appendToTerminal("  touch      - Crée un nouveau fichier vide");
            this.appendToTerminal("  rm         - Supprime un fichier");
            this.appendToTerminal("  rmdir      - Supprime un dossier vide");
            this.appendToTerminal("  pwd        - Affiche le chemin actuel");
            this.appendToTerminal("  echo       - Affiche du texte");
            this.appendToTerminal("  mv         - Déplace ou renomme un fichier/dossier");
            this.appendToTerminal("  cp         - Copie un fichier/dossier");
            this.appendToTerminal("  exit       - Quitte le terminal (simulation)");
        } else if (command === "pip help" || command === "pip" || command.trim() === "pip") {
            this.appendToTerminal("Guide des commandes pip:");
            this.appendToTerminal("  pip install <package>     - Installe un package Python");
            this.appendToTerminal("  pip install requests      - Exemple: installe le module requests");
            this.appendToTerminal("  pip install --upgrade pip - Met à jour pip vers la dernière version");
            this.appendToTerminal("  pip uninstall <package>   - Désinstalle un package");
            this.appendToTerminal("  pip list                  - Liste les packages installés");
        } else if (command === "clear") {
            this.clearTerminal();
        } else if (command === "exit") {
            this.appendToTerminal("Déconnecté. (Simulation)");
        } else if (command.startsWith("pip install ")) {
            const packageName = command.substring(12).trim();
            if (packageName) {
                this.installPythonPackage(packageName);
            } else {
                this.appendToTerminal("Veuillez spécifier un package à installer. Exemple: pip install requests", "error");
            }
        } else if (command.startsWith("pip uninstall ")) {
            const packageName = command.substring(14).trim();
            if (packageName) {
                this.appendToTerminal(`Désinstallation du package '${packageName}'...`);
                this.scrollToBottom();

                // Implémentation similaire à installPythonPackage mais pour la désinstallation
                fetch(this.getApiBasePath() + '/uninstall_package/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json'
                    },
                    body: new URLSearchParams({
                        'package': packageName,
                        'language': 'python'
                    })
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Erreur serveur: ${response.status}`);
                        }
                        const contentType = response.headers.get('content-type');
                        if (contentType && contentType.includes('application/json')) {
                            return response.json();
                        }
                        throw new Error('Réponse du serveur invalide: format JSON attendu');
                    })
                    .then(data => {
                        if (data.output) this.appendToTerminal(data.output);
                        if (data.error) this.appendToTerminal(data.error, "error");
                        if (data.success) {
                            this.appendToTerminal(`Package '${packageName}' désinstallé avec succès.`);
                        } else {
                            this.appendToTerminal(`Échec de la désinstallation du package '${packageName}'.`, "error");
                        }
                        this.scrollToBottom();
                    })
                    .catch(error => {
                        this.appendToTerminal(`Erreur: ${error.message}`, "error");
                        this.scrollToBottom();
                    });
            } else {
                this.appendToTerminal("Veuillez spécifier un package à désinstaller.", "error");
            }
        } else if (command === "pip list") {
            this.appendToTerminal("Liste des packages installés:");
            this.scrollToBottom();

            fetch(this.getApiBasePath() + '/list_packages/', {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erreur serveur: ${response.status}`);
                    }
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        return response.json();
                    }
                    throw new Error('Réponse du serveur invalide: format JSON attendu');
                })
                .then(data => {
                    if (data.packages && data.packages.length > 0) {
                        data.packages.forEach(pkg => {
                            this.appendToTerminal(`  ${pkg.name} (${pkg.version})`);
                        });
                    } else {
                        this.appendToTerminal("  Aucun package installé.");
                    }
                    this.scrollToBottom();
                })
                .catch(error => {
                    this.appendToTerminal(`Erreur: ${error.message}`, "error");
                    this.scrollToBottom();
                });
        } else if (command === "pip list") {
            this.appendToTerminal("Liste des packages installés:");

            fetch('/list_packages/', {
                method: 'GET',
            })
                .then(response => response.json())
                .then(data => {
                    if (data.packages && data.packages.length > 0) {
                        data.packages.forEach(pkg => {
                            this.appendToTerminal(`  ${pkg.name} (${pkg.version})`);
                        });
                    } else {
                        this.appendToTerminal("  Aucun package installé.");
                    }
                    this.scrollToBottom();
                })
                .catch(error => {
                    this.appendToTerminal(`Erreur: ${error}`, "error");
                    this.scrollToBottom();
                });
        } else if (command.startsWith("pip ")) {
            // Extraire la commande pip complète
            const pipCommand = command.substring(4).trim();

            if (pipCommand.startsWith("install ")) {
                const packageName = pipCommand.substring(8).trim();
                if (packageName) {
                    this.installPythonPackage(packageName);
                } else {
                    this.appendToTerminal("Veuillez spécifier un package à installer. Exemple: pip install requests", "error");
                }
            } else if (pipCommand.startsWith("uninstall ")) {
                const packageName = pipCommand.substring(10).trim();
                if (packageName) {
                    this.uninstallPythonPackage(packageName);
                } else {
                    this.appendToTerminal("Veuillez spécifier un package à désinstaller.", "error");
                }
            } else if (pipCommand === "list") {
                this.listPythonPackages();
            } else if (pipCommand === "--upgrade pip" || pipCommand === "install --upgrade pip") {
                // Cas spécial pour mettre à jour pip
                this.appendToTerminal("Mise à jour de pip...");
                this.installPythonPackage("--upgrade pip");
            } else {
                this.appendToTerminal(`Commande pip non reconnue: ${pipCommand}`, "error");
                this.appendToTerminal("Commandes pip supportées: install, uninstall, list", "info");
            }
        } else if (command.startsWith("python ")) {
            const fileName = command.substring(7).trim();
            const currentDir = window.FileSystem.getCurrentDirectory();

            if (currentDir[fileName]) {
                if (fileName.endsWith('.py')) {
                    // Vérifier qu'aucun programme n'est déjà en cours d'exécution
                    if (this.isRunning) {
                        this.appendToTerminal(`Un programme est déjà en cours d'exécution. Utilisez "Arrêter le processus" pour l'interrompre.`, "error");
                        return;
                    }

                    this.runPythonFile(fileName);
                } else {
                    this.appendToTerminal(`${fileName} n'est pas un fichier Python.`, "error");
                }
            } else {
                this.appendToTerminal(`Fichier non trouvé: ${fileName}`, "error");
            }
        } else if (command.startsWith("cd ")) {
            const dir = command.substring(3).trim();

            if (dir === "..") {
                if (window.currentPath.length > 1) {
                    window.currentPath.pop();
                    this.currentPrompt = window.FileSystem.updatePrompt();
                    this.appendToTerminal(`Changement de répertoire vers: ${window.currentPath.join('\\')}`);
                } else {
                    this.appendToTerminal("Vous êtes déjà à la racine.", "error");
                }
            } else if (dir === "~" || dir === "/") {
                window.currentPath.length = 0;
                window.currentPath.push("Users", "projet");
                this.currentPrompt = window.FileSystem.updatePrompt();
                this.appendToTerminal(`Changement de répertoire vers: ${window.currentPath.join('\\')}`);
            } else {
                const currentDir = window.FileSystem.getCurrentDirectory();

                if (currentDir[dir] && typeof currentDir[dir] === 'object') {
                    window.currentPath.push(dir);
                    this.currentPrompt = window.FileSystem.updatePrompt();
                    this.appendToTerminal(`Changement de répertoire vers: ${window.currentPath.join('\\')}`);
                } else {
                    this.appendToTerminal(`Répertoire non trouvé: ${dir}`, "error");
                }
            }
        } else if (command === "ls" || command === "dir") {
            const currentDir = window.FileSystem.getCurrentDirectory();
            const entries = Object.entries(currentDir);

            if (entries.length === 0) {
                this.appendToTerminal("(Répertoire vide)");
            } else {
                entries.forEach(([name, content]) => {
                    if (typeof content === 'object') {
                        this.appendToTerminal(`📁 ${name}/`);
                    } else {
                        this.appendToTerminal(`📄 ${name}`);
                    }
                });
            }
        } else if (command.startsWith("cat ")) {
            const fileName = command.substring(4).trim();
            const currentDir = window.FileSystem.getCurrentDirectory();

            if (currentDir[fileName] && typeof currentDir[fileName] === 'string') {
                this.appendToTerminal(currentDir[fileName]);
            } else {
                this.appendToTerminal(`Fichier non trouvé: ${fileName}`, "error");
            }
        } else if (command.startsWith("mkdir ")) {
            const dirName = command.substring(6).trim();
            const currentDir = window.FileSystem.getCurrentDirectory();

            if (dirName === "") {
                this.appendToTerminal("Nom de répertoire manquant.", "error");
            } else if (currentDir[dirName]) {
                this.appendToTerminal(`Le répertoire '${dirName}' existe déjà.`, "error");
            } else {
                currentDir[dirName] = {};
                this.appendToTerminal(`Répertoire '${dirName}' créé.`);

                // Mettre à jour l'explorateur de fichiers
                window.FileSystem.updateFileExplorer();
            }
        } else if (command.startsWith("touch ")) {
            const fileName = command.substring(6).trim();
            const currentDir = window.FileSystem.getCurrentDirectory();

            if (fileName === "") {
                this.appendToTerminal("Nom de fichier manquant.", "error");
            } else if (currentDir[fileName]) {
                this.appendToTerminal(`Le fichier '${fileName}' existe déjà.`, "error");
            } else {
                currentDir[fileName] = "";

                // Déterminer le chemin complet du fichier
                const fullPath = [...window.currentPath, fileName].join('/');
                window.files[fullPath] = "";  // Ajouter au système de fichiers global

                this.appendToTerminal(`Fichier '${fileName}' créé.`);

                // Mettre à jour l'explorateur de fichiers
                window.FileSystem.updateFileExplorer();
            }
        } else if (command.startsWith("rm ")) {
            const fileName = command.substring(3).trim();
            const currentDir = window.FileSystem.getCurrentDirectory();

            if (fileName === "") {
                this.appendToTerminal("Nom de fichier manquant.", "error");
            } else if (!currentDir[fileName]) {
                this.appendToTerminal(`Fichier non trouvé: ${fileName}`, "error");
            } else if (typeof currentDir[fileName] === 'object') {
                this.appendToTerminal(`'${fileName}' est un répertoire. Utilisez 'rmdir' pour supprimer un répertoire.`, "error");
            } else {
                delete currentDir[fileName];
                this.appendToTerminal(`Fichier '${fileName}' supprimé.`);

                // Supprimer l'onglet et l'éditeur si ouvert
                const fullPath = [...window.currentPath, fileName].join('/');
                const tab = document.querySelector(`.tab[data-path="${fullPath}"]`);
                if (tab) {
                    tab.remove();
                    document.querySelector(`.editor-panel[data-path="${fullPath}"]`).remove();
                }

                // Mettre à jour l'explorateur de fichiers
                window.FileSystem.updateFileExplorer();
            }
        } else if (command.startsWith("rmdir ")) {
            const dirName = command.substring(6).trim();
            const currentDir = window.FileSystem.getCurrentDirectory();

            if (dirName === "") {
                this.appendToTerminal("Nom de répertoire manquant.", "error");
            } else if (!currentDir[dirName]) {
                this.appendToTerminal(`Répertoire non trouvé: ${dirName}`, "error");
            } else if (typeof currentDir[dirName] !== 'object') {
                this.appendToTerminal(`'${dirName}' est un fichier. Utilisez 'rm' pour supprimer un fichier.`, "error");
            } else if (Object.keys(currentDir[dirName]).length > 0) {
                this.appendToTerminal(`Le répertoire '${dirName}' n'est pas vide.`, "error");
            } else {
                delete currentDir[dirName];
                this.appendToTerminal(`Répertoire '${dirName}' supprimé.`);

                // Mettre à jour l'explorateur de fichiers
                window.FileSystem.updateFileExplorer();
            }
        } else if (command.startsWith("mv ")) {
            const args = command.substring(3).trim().split(' ');
            if (args.length < 2) {
                this.appendToTerminal("Usage: mv source destination", "error");
            } else {
                const source = args[0];
                const destination = args[1];
                const currentDir = window.FileSystem.getCurrentDirectory();

                if (!currentDir[source]) {
                    this.appendToTerminal(`Source non trouvée: ${source}`, "error");
                } else {
                    // Déplacer vers un autre répertoire ou renommer
                    if (destination.includes('/')) {
                        // Déplacer vers un autre répertoire
                        const destParts = destination.split('/');
                        const destName = destParts.pop();
                        let destDir = window.fileSystem;

                        // Trouver le répertoire de destination
                        for (const part of destParts) {
                            if (!destDir[part] || typeof destDir[part] !== 'object') {
                                this.appendToTerminal(`Répertoire de destination non trouvé: ${destParts.join('/')}`, "error");
                                return;
                            }
                            destDir = destDir[part];
                        }

                        // Déplacer le fichier/dossier
                        const finalName = destName || source;
                        destDir[finalName] = currentDir[source];
                        delete currentDir[source];

                        this.appendToTerminal(`'${source}' déplacé vers '${destination}'.`);
                    } else {
                        // Renommer
                        if (currentDir[destination]) {
                            this.appendToTerminal(`La destination '${destination}' existe déjà.`, "error");
                            return;
                        }

                        currentDir[destination] = currentDir[source];
                        delete currentDir[source];
                        this.appendToTerminal(`'${source}' renommé en '${destination}'.`);
                    }

                    // Mettre à jour l'explorateur de fichiers
                    window.FileSystem.updateFileExplorer();
                }
            }
        } else if (command.startsWith("cp ")) {
            const args = command.substring(3).trim().split(' ');
            if (args.length < 2) {
                this.appendToTerminal("Usage: cp source destination", "error");
            } else {
                const source = args[0];
                const destination = args[1];
                const currentDir = window.FileSystem.getCurrentDirectory();

                if (!currentDir[source]) {
                    this.appendToTerminal(`Source non trouvée: ${source}`, "error");
                } else {
                    // Copier le contenu
                    const content = currentDir[source];

                    // Si la destination est un chemin
                    if (destination.includes('/')) {
                        const destParts = destination.split('/');
                        const destName = destParts.pop() || source;
                        let destDir = window.fileSystem;

                        // Trouver le répertoire de destination
                        for (const part of destParts) {
                            if (!destDir[part] || typeof destDir[part] !== 'object') {
                                this.appendToTerminal(`Répertoire de destination non trouvé: ${destParts.join('/')}`, "error");
                                return;
                            }
                            destDir = destDir[part];
                        }

                        // Copier le fichier/dossier
                        destDir[destName] = structuredClone(content); // Deep copy
                        this.appendToTerminal(`'${source}' copié vers '${destination}'.`);
                    } else {
                        // Copier dans le même répertoire
                        if (currentDir[destination]) {
                            this.appendToTerminal(`La destination '${destination}' existe déjà.`, "error");
                            return;
                        }

                        currentDir[destination] = structuredClone(content); // Deep copy
                        this.appendToTerminal(`'${source}' copié vers '${destination}'.`);
                    }

                    // Mettre à jour l'explorateur de fichiers
                    window.FileSystem.updateFileExplorer();
                }
            }
        } else if (command === "pwd") {
            this.appendToTerminal(`${window.currentPath.join('\\')}`);
        } else if (command.startsWith("echo ")) {
            const text = command.substring(5).trim();
            this.appendToTerminal(text);
        } else {
            this.appendToTerminal(`Commande non reconnue: ${command}`, "error");
            this.appendToTerminal("Tapez 'help' pour voir les commandes disponibles.");
        }

        // S'assurer que le terminal défile jusqu'en bas après chaque commande
        this.scrollToBottom();
    }
};