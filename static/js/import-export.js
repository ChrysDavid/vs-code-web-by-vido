// import-export.js
// Gestion de l'importation et de l'exportation de projets

window.ProjectManager = {
    // Initialiser le gestionnaire de projets
    initialize: function() {
        // Ajouter les boutons d'importation/exportation à l'interface
        this.addImportExportButtons();
        
        // Configurer les événements
        this.setupEventListeners();
        
        console.log("Gestionnaire de projets initialisé");
    },
    
    // Ajouter les boutons d'importation/exportation
    addImportExportButtons: function() {
        // Trouver l'élément parent pour les boutons
        const headerActions = document.querySelector('.file-actions');
        
        if (headerActions) {
            // Ajouter les boutons d'importation et d'exportation
            headerActions.insertAdjacentHTML('beforeend', `
                <button id="import-project-btn" title="Importer un projet">
                    <i class="fas fa-file-import"></i>
                </button>
                <button id="export-project-btn" title="Exporter le projet">
                    <i class="fas fa-file-export"></i>
                </button>
            `);
        }
        
        // Ajouter une entrée au menu contextuel pour l'exportation
        const contextMenu = document.getElementById('file-context-menu');
        if (contextMenu) {
            contextMenu.insertAdjacentHTML('beforeend', `
                <button id="context-export"><i class="fas fa-file-export"></i> Exporter</button>
            `);
        }
        
        // Créer la boîte de dialogue d'importation
        document.body.insertAdjacentHTML('beforeend', `
            <div class="dialog" id="import-project-dialog">
                <h3>Importer un projet</h3>
                <p>Sélectionnez un fichier ZIP contenant votre projet</p>
                <form id="import-form" enctype="multipart/form-data">
                    <input type="file" id="import-file" accept=".zip">
                    <div class="dialog-buttons">
                        <button type="button" id="cancel-import">Annuler</button>
                        <button type="submit" class="primary" id="confirm-import">Importer</button>
                    </div>
                </form>
            </div>
        `);
    },
    
    // Configurer les écouteurs d'événements
    setupEventListeners: function() {
        // Bouton d'importation
        const importBtn = document.getElementById('import-project-btn');
        if (importBtn) {
            importBtn.addEventListener('click', this.showImportDialog.bind(this));
        }
        
        // Bouton d'exportation
        const exportBtn = document.getElementById('export-project-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', this.exportCurrentProject.bind(this));
        }
        
        // Option d'exportation dans le menu contextuel
        const contextExport = document.getElementById('context-export');
        if (contextExport) {
            contextExport.addEventListener('click', this.exportSelectedItem.bind(this));
        }
        
        // Formulaire d'importation
        const importForm = document.getElementById('import-form');
        if (importForm) {
            importForm.addEventListener('submit', this.importProject.bind(this));
        }
        
        // Bouton d'annulation d'importation
        const cancelImport = document.getElementById('cancel-import');
        if (cancelImport) {
            cancelImport.addEventListener('click', this.hideImportDialog.bind(this));
        }
    },
    
    // Afficher la boîte de dialogue d'importation
    showImportDialog: function() {
        const dialog = document.getElementById('import-project-dialog');
        const backdrop = document.getElementById('backdrop');
        
        if (dialog && backdrop) {
            backdrop.style.display = 'block';
            dialog.style.display = 'block';
        }
    },
    
    // Masquer la boîte de dialogue d'importation
    hideImportDialog: function() {
        const dialog = document.getElementById('import-project-dialog');
        const backdrop = document.getElementById('backdrop');
        
        if (dialog && backdrop) {
            backdrop.style.display = 'none';
            dialog.style.display = 'none';
            
            // Réinitialiser le champ de fichier
            const fileInput = document.getElementById('import-file');
            if (fileInput) {
                fileInput.value = '';
            }
        }
    },
    
    // Importer un projet depuis un fichier ZIP
    importProject: function(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('import-file');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            alert('Veuillez sélectionner un fichier ZIP.');
            return;
        }
        
        const file = fileInput.files[0];
        if (!file.name.endsWith('.zip')) {
            alert('Le fichier doit être au format ZIP.');
            return;
        }
        
        // Créer un objet FormData pour envoyer le fichier
        const formData = new FormData();
        formData.append('file', file);
        
        // Afficher un indicateur de chargement
        const importBtn = document.getElementById('confirm-import');
        if (importBtn) {
            importBtn.disabled = true;
            importBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importation...';
        }
        
        // Envoyer la requête au serveur
        fetch('/webide/import_project/', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Fermer la boîte de dialogue
                this.hideImportDialog();
                
                // Afficher un message de succès
                alert('Projet importé avec succès.');
                
                // Mettre à jour l'explorateur de fichiers
                window.FileSystem.updateFileExplorer();
            } else {
                alert(`Erreur lors de l'importation: ${data.error}`);
            }
        })
        .catch(error => {
            alert(`Erreur lors de l'importation: ${error}`);
        })
        .finally(() => {
            // Réinitialiser le bouton
            if (importBtn) {
                importBtn.disabled = false;
                importBtn.innerHTML = 'Importer';
            }
        });
    },
    
    // Exporter le projet actuel
    exportCurrentProject: function() {
        // Définir le chemin actuel comme cible d'exportation
        const currentPath = window.currentPath.join('/');
        this.exportProject(currentPath);
    },
    
    // Exporter un élément sélectionné
    exportSelectedItem: function() {
        // Obtenir l'élément sélectionné dans le menu contextuel
        const selectedItem = window.FileSystem.getContextMenuTarget();
        if (!selectedItem) {
            alert('Aucun élément sélectionné.');
            return;
        }
        
        // Obtenir le chemin de l'élément
        const itemPath = selectedItem.dataset.path;
        if (!itemPath) {
            alert('Impossible de déterminer le chemin de l\'élément.');
            return;
        }
        
        this.exportProject(itemPath);
    },
    
    // Exporter un projet ou un dossier
    exportProject: function(path) {
        // Vérifier que le chemin n'est pas vide
        if (!path) {
            alert('Chemin invalide pour l\'exportation.');
            return;
        }
        
        // Créer un formulaire temporaire pour la soumission
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/webide/export_project/';
        
        // Ajouter le token CSRF si nécessaire
        const csrfToken = this.getCSRFToken();
        if (csrfToken) {
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = 'csrfmiddlewaretoken';
            csrfInput.value = csrfToken;
            form.appendChild(csrfInput);
        }
        
        // Ajouter le chemin du projet
        const pathInput = document.createElement('input');
        pathInput.type = 'hidden';
        pathInput.name = 'path';
        pathInput.value = path;
        form.appendChild(pathInput);
        
        // Soumettre le formulaire
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    },
    
    // Obtenir le token CSRF pour les requêtes POST
    getCSRFToken: function() {
        // Chercher le token dans les cookies
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith('csrftoken=')) {
                return cookie.substring('csrftoken='.length);
            }
        }
        return null;
    }
};