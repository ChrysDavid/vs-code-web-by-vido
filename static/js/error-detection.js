// error-detection.js
// Module pour la détection d'erreurs dans l'éditeur selon le langage

window.ErrorDetection = {
    // Variable pour stocker le langage actuel
    currentLanguage: 'python',
    
    // Configuration des linters pour différents langages
    linters: {
        python: {
            loaded: false,
            worker: null,
            rules: {
                indentation: true,
                syntax: true,
                imports: true,
                undefined_vars: true
            }
        },
        javascript: {
            loaded: false,
            worker: null,
            rules: {
                semi: true,
                quotes: true,
                vars: true,
                eqeqeq: true
            }
        },
        java: {
            loaded: false,
            worker: null,
            rules: {
                syntax: true,
                braces: true,
                naming: true
            }
        },
        c: {
            loaded: false,
            worker: null,
            rules: {
                syntax: true,
                pointers: true,
                memory: true
            }
        }
    },
    
    // Initialisation du module
    initialize: function() {
        // Trouver le langage actuel
        const langSelect = document.getElementById("language-select");
        if (langSelect) {
            this.currentLanguage = langSelect.value;
            langSelect.addEventListener("change", (e) => {
                this.setLanguage(e.target.value);
            });
        }
        
        // Initialiser le linter pour le langage actuel
        this.loadLinter(this.currentLanguage);
        
        console.log("Module de détection d'erreurs initialisé pour:", this.currentLanguage);
    },
    
    // Changer de langage et réinitialiser l'analyse d'erreurs
    setLanguage: function(language) {
        if (this.currentLanguage !== language) {
            this.currentLanguage = language;
            this.loadLinter(language);
            
            // Analyser le code actuel avec le nouveau linter
            const activeEditor = window.EditorManager.getActiveEditor();
            if (activeEditor) {
                this.checkForErrors(activeEditor);
            }
            
            console.log("Langage de détection d'erreurs changé pour:", language);
        }
    },
    
    // Charger le linter approprié selon le langage
    loadLinter: function(language) {
        if (!this.linters[language]) {
            console.warn("Aucun linter disponible pour:", language);
            return;
        }
        
        // Si le linter est déjà chargé, ne pas le recharger
        if (this.linters[language].loaded) {
            return;
        }
        
        // Création du worker approprié selon le langage
        switch (language) {
            case 'python': 
                this.loadPythonLinter();
                break;
            case 'javascript':
                this.loadJavaScriptLinter();
                break;
            case 'java':
                this.loadJavaLinter();
                break;
            case 'c':
                this.loadCLinter();
                break;
            default:
                console.warn("Aucun linter spécifique pour:", language);
        }
    },
    
    // Charger le linter Python
    loadPythonLinter: function() {
        // On simule le chargement d'un linter Python
        fetch('/webide/static/js/linters/python-linter.js')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Impossible de charger le linter Python');
                }
                // Créer un web worker pour l'analyse en arrière-plan
                const blob = new Blob([
                    `
                    self.onmessage = function(e) {
                        const code = e.data.code;
                        const errors = analyzePythonCode(code);
                        self.postMessage({errors: errors});
                    };
                    
                    function analyzePythonCode(code) {
                        const errors = [];
                        
                        // Analyser les indentations
                        const lines = code.split('\\n');
                        let expectedIndent = 0;
                        let indentStack = [0];
                        
                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i];
                            
                            // Ignorer les lignes vides
                            if (line.trim() === '') continue;
                            
                            // Calculer l'indentation actuelle
                            const currentIndent = line.search(/\\S|$/);
                            
                            // Vérifier si la ligne contient une erreur de syntaxe évidente
                            if (line.includes(':') && (
                                line.trim().startsWith('if') || 
                                line.trim().startsWith('for') || 
                                line.trim().startsWith('while') || 
                                line.trim().startsWith('def') || 
                                line.trim().startsWith('class')
                            )) {
                                // Vérifier si les deux-points sont présents à la fin
                                if (!line.trim().endsWith(':')) {
                                    errors.push({
                                        line: i + 1,
                                        ch: line.length,
                                        message: "Les blocs Python doivent se terminer par ':'",
                                        severity: 'error'
                                    });
                                }
                                
                                // La prochaine ligne devrait être indentée
                                expectedIndent = currentIndent + 4;
                                indentStack.push(expectedIndent);
                            }
                            
                            // Vérifier la fermeture des blocs
                            if (currentIndent < indentStack[indentStack.length - 1]) {
                                // Dépiler jusqu'à trouver le bon niveau d'indentation
                                while (indentStack.length > 1 && currentIndent < indentStack[indentStack.length - 1]) {
                                    indentStack.pop();
                                }
                            }
                            
                            // Vérifier les erreurs d'indentation
                            if (currentIndent !== 0 && currentIndent !== indentStack[indentStack.length - 1]) {
                                errors.push({
                                    line: i + 1,
                                    ch: 0,
                                    message: "Indentation incorrecte",
                                    severity: 'warning'
                                });
                            }
                            
                            // Vérification simplifiée des parenthèses/crochets non fermés
                            let openParens = 0;
                            let openBrackets = 0;
                            let openBraces = 0;
                            
                            for (let j = 0; j < line.length; j++) {
                                const char = line[j];
                                if (char === '(') openParens++;
                                else if (char === ')') openParens--;
                                else if (char === '[') openBrackets++;
                                else if (char === ']') openBrackets--;
                                else if (char === '{') openBraces++;
                                else if (char === '}') openBraces--;
                                
                                if (openParens < 0 || openBrackets < 0 || openBraces < 0) {
                                    errors.push({
                                        line: i + 1,
                                        ch: j,
                                        message: "Parenthèse/crochet/accolade fermante sans ouvrante correspondante",
                                        severity: 'error'
                                    });
                                    break;
                                }
                            }
                            
                            if (openParens > 0 || openBrackets > 0 || openBraces > 0) {
                                errors.push({
                                    line: i + 1,
                                    ch: line.length,
                                    message: "Parenthèse/crochet/accolade ouvrante non fermée",
                                    severity: 'error'
                                });
                            }
                        }
                        
                        return errors;
                    }
                    `
                ], { type: 'application/javascript' });
                
                const workerUrl = URL.createObjectURL(blob);
                this.linters.python.worker = new Worker(workerUrl);
                this.linters.python.loaded = true;
                
                // Configuration du handler pour recevoir les messages du worker
                this.linters.python.worker.onmessage = (e) => {
                    const errors = e.data.errors;
                    this.displayErrors(errors);
                };
                
                console.log("Linter Python chargé");
            })
            .catch(error => {
                console.error("Erreur lors du chargement du linter Python:", error);
            });
    },
    
    // Charger le linter JavaScript
    loadJavaScriptLinter: function() {
        // Simulation similaire pour JavaScript
        this.linters.javascript.loaded = true;
        
        // Créer un blob pour le worker JavaScript
        const blob = new Blob([
            `
            self.onmessage = function(e) {
                const code = e.data.code;
                const errors = analyzeJavaScriptCode(code);
                self.postMessage({errors: errors});
            };
            
            function analyzeJavaScriptCode(code) {
                const errors = [];
                
                // Analyser les lignes
                const lines = code.split('\\n');
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    
                    // Ignorer les lignes vides
                    if (line.trim() === '') continue;
                    
                    // Vérifier les points-virgules manquants
                    if (!line.trim().endsWith(';') && 
                        !line.trim().endsWith('{') && 
                        !line.trim().endsWith('}') &&
                        !line.trim().endsWith(':') &&
                        !line.trim().startsWith('//') &&
                        !line.trim().startsWith('if') &&
                        !line.trim().startsWith('for') &&
                        !line.trim().startsWith('while') &&
                        !line.trim().startsWith('function') &&
                        !line.trim().endsWith('*/')) {
                        
                        errors.push({
                            line: i + 1,
                            ch: line.length,
                            message: "Point-virgule manquant",
                            severity: 'warning'
                        });
                    }
                    
                    // Vérification des parenthèses/crochets/accolades
                    let openParens = 0;
                    let openBrackets = 0;
                    let openBraces = 0;
                    
                    for (let j = 0; j < line.length; j++) {
                        const char = line[j];
                        if (char === '(') openParens++;
                        else if (char === ')') openParens--;
                        else if (char === '[') openBrackets++;
                        else if (char === ']') openBrackets--;
                        else if (char === '{') openBraces++;
                        else if (char === '}') openBraces--;
                        
                        if (openParens < 0 || openBrackets < 0 || openBraces < 0) {
                            errors.push({
                                line: i + 1,
                                ch: j,
                                message: "Parenthèse/crochet/accolade fermante sans ouvrante correspondante",
                                severity: 'error'
                            });
                            break;
                        }
                    }
                    
                    if (openParens > 0 || openBrackets > 0 || openBraces > 0) {
                        errors.push({
                            line: i + 1,
                            ch: line.length,
                            message: "Parenthèse/crochet/accolade ouvrante non fermée",
                            severity: 'error'
                        });
                    }
                    
                    // Détecter l'utilisation de == au lieu de ===
                    if (line.includes('==') && !line.includes('===') && !line.includes('!==')) {
                        const position = line.indexOf('==');
                        errors.push({
                            line: i + 1,
                            ch: position,
                            message: "Utilisez === au lieu de == pour une comparaison stricte",
                            severity: 'warning'
                        });
                    }
                }
                
                return errors;
            }
            `
        ], { type: 'application/javascript' });
        
        const workerUrl = URL.createObjectURL(blob);
        this.linters.javascript.worker = new Worker(workerUrl);
        
        // Configuration du handler pour recevoir les messages du worker
        this.linters.javascript.worker.onmessage = (e) => {
            const errors = e.data.errors;
            this.displayErrors(errors);
        };
        
        console.log("Linter JavaScript chargé");
    },
    
    // Charger le linter Java
    loadJavaLinter: function() {
        // Version simplifiée pour Java
        this.linters.java.loaded = true;
        console.log("Linter Java chargé (simulé)");
    },
    
    // Charger le linter C
    loadCLinter: function() {
        // Version simplifiée pour C
        this.linters.c.loaded = true;
        console.log("Linter C chargé (simulé)");
    },
    
    // Vérifier le code pour erreurs
    checkForErrors: function(editor) {
        const code = editor.getValue();
        const language = this.currentLanguage;
        
        if (!this.linters[language] || !this.linters[language].loaded || !this.linters[language].worker) {
            console.warn(`Linter pour ${language} non disponible`);
            return;
        }
        
        // Envoyer le code au worker pour analyse
        this.linters[language].worker.postMessage({
            code: code
        });
    },
    
    // Afficher les erreurs dans l'éditeur
    displayErrors: function(errors) {
        // Effacer les marqueurs d'erreur précédents
        this.clearErrors();
        
        // Obtenir l'éditeur actif
        const editor = window.EditorManager.getActiveEditor();
        if (!editor) return;
        
        // Ajouter les nouvelles erreurs
        errors.forEach(error => {
            const line = error.line - 1; // CodeMirror est à base 0
            const ch = error.ch;
            
            // Créer un marqueur d'erreur
            const marker = document.createElement('div');
            marker.className = `error-marker ${error.severity}`;
            marker.title = error.message;
            marker.innerHTML = `<i class="fas fa-exclamation-circle"></i>`;
            
            // Ajouter le marqueur à l'éditeur
            editor.setGutterMarker(line, "error-gutter", marker);
            
            // Souligner le texte problématique
            editor.markText(
                {line: line, ch: ch},
                {line: line, ch: ch + 1},
                {
                    className: `error-underline ${error.severity}`,
                    title: error.message
                }
            );
        });
        
        // Mettre à jour le statut
        this.updateErrorStatus(errors.length);
    },
    
    // Effacer toutes les erreurs
    clearErrors: function() {
        const editor = window.EditorManager.getActiveEditor();
        if (!editor) return;
        
        // Effacer tous les marqueurs de gouttière
        for (let i = 0; i < editor.lineCount(); i++) {
            editor.setGutterMarker(i, "error-gutter", null);
        }
        
        // Effacer tous les surlignages
        const marks = editor.getAllMarks();
        marks.forEach(mark => {
            if (mark.className && mark.className.includes('error-underline')) {
                mark.clear();
            }
        });
        
        // Réinitialiser le statut
        this.updateErrorStatus(0);
    },
    
    // Mettre à jour l'affichage du nombre d'erreurs
    updateErrorStatus: function(errorCount) {
        const statusElement = document.querySelector('.status-item.errors');
        
        if (!statusElement) {
            // Créer un élément de statut s'il n'existe pas
            const statusBar = document.querySelector('.status-bar');
            if (statusBar) {
                const newStatusElement = document.createElement('div');
                newStatusElement.className = 'status-item errors';
                
                if (errorCount > 0) {
                    newStatusElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${errorCount} erreur(s)`;
                    newStatusElement.classList.add('has-errors');
                } else {
                    newStatusElement.innerHTML = `<i class="fas fa-check-circle"></i> Aucune erreur`;
                    newStatusElement.classList.add('no-errors');
                }
                
                statusBar.appendChild(newStatusElement);
            }
        } else {
            // Mettre à jour l'élément existant
            if (errorCount > 0) {
                statusElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${errorCount} erreur(s)`;
                statusElement.className = 'status-item errors has-errors';
            } else {
                statusElement.innerHTML = `<i class="fas fa-check-circle"></i> Aucune erreur`;
                statusElement.className = 'status-item errors no-errors';
            }
        }
    }
};