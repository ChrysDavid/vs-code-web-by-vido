// main.js
// Point d'entrée principal de l'application

// Fonction d'initialisation principale
function initializeIDE() {
    // Initialiser les composants principaux
    window.EditorManager.initialize();
    window.FileSystem.initialize();
    window.Terminal.initialize();
    
    // Ajouter les fonctionnalités supplémentaires
    window.CodeExecution.addWebScrapingFunctionality();
    
    // Configurer les interactions utilisateur
    Utils.setupGlobalShortcuts();
    Utils.setupTerminalResize();
    Utils.setupContextMenu();
    Utils.setupDialogs();
    Utils.setupRunButton();
    
    // Charger l'espace de travail précédent si disponible
    window.FileSystem.loadWorkspace();
    
    // Configurer la sauvegarde automatique
    setInterval(window.FileSystem.saveWorkspace, 30000);  // Toutes les 30 secondes

    // Sauvegarder avant de quitter la page
    window.addEventListener("beforeunload", window.FileSystem.saveWorkspace);
    
    console.log("IDE initialisé avec succès.");
}

// Exécuter l'initialisation lorsque le DOM est chargé
document.addEventListener("DOMContentLoaded", initializeIDE);