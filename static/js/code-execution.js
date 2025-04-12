// code-execution.js
// Gestion de l'exécution du code

// Namespace pour l'exécution de code
window.CodeExecution = {
    // Simuler l'exécution du code Python côté client
    executePythonCode: function(code) {
        const lines = code.split('\n');
        const outputBuffer = {};
        let i = 0;
        let executionPaused = false;

        function processNextLine() {
            if (executionPaused) return;

            if (i >= lines.length) {
                window.Terminal.appendToTerminal("\nExécution terminée", "output");
                
                // Réinitialiser les variables d'état
                window.Terminal.isRunning = false;
                window.Terminal.currentProcess = null;
                window.Terminal.waitingForInput = false;

                // Créer un délai léger pour que le message d'exécution terminée soit visible
                setTimeout(() => {
                    // IMPORTANT: Supprimer tous les champs d'entrée en ligne existants
                    const inlineInputs = document.querySelectorAll(".terminal-inline-input");
                    if (inlineInputs.length > 0) {
                        inlineInputs.forEach(input => {
                            const parent = input.closest('.terminal-line');
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
                            promptElement.textContent = window.Terminal.currentPrompt;
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
                    const terminal = document.getElementById("terminal-content");
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

                window.Terminal.appendToTerminal(output);
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
                const terminal = document.getElementById("terminal-content");
                terminal.appendChild(inputLine);

                // Scroll au bas du terminal
                terminal.scrollTop = terminal.scrollHeight;

                // Extraire le nom de variable
                const variableName = line.split('=')[0].trim();

                // Mettre en pause l'exécution et attendre l'entrée utilisateur
                executionPaused = true;
                window.Terminal.waitingForInput = true;

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
                        window.Terminal.waitingForInput = false;
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
                window.Terminal.appendToTerminal(`[Simulation d'import: ${line}]`, "output");
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
    },

    // Fonction pour simuler l'exécution d'un script de web scraping
    simulateWebScraping: function(url) {
        // Créer un dossier 'scraped_content' s'il n'existe pas
        const currentDir = window.FileSystem.getCurrentDirectory();
        if (!currentDir["scraped_content"]) {
            currentDir["scraped_content"] = {};
        }
        
        // Nettoyer le terminal
        window.Terminal.clearTerminal();
        
        // Simuler l'exécution
        window.Terminal.appendToTerminal(`Exécution de web_scraper.py...`);
        window.Terminal.appendToTerminal(`[Simulation d'import: import os]`);
        window.Terminal.appendToTerminal(`[Simulation d'import: import requests]`);
        window.Terminal.appendToTerminal(`[Simulation d'import: from bs4 import BeautifulSoup]`);
        window.Terminal.appendToTerminal(`[Simulation d'import: from urllib.parse import urljoin, urlparse]`);
        window.Terminal.appendToTerminal(`Entrez l'URL à scraper: ${url}`);
        
        // Masquer l'invite du terminal
        document.querySelector(".terminal-input-line").style.display = "none";
        
        // Simulation du scraping
        setTimeout(() => {
            window.Terminal.appendToTerminal(`Scraping de ${url}...`);
            window.Terminal.appendToTerminal(`Downloaded: ${url}`);
            
            setTimeout(() => {
                window.Terminal.appendToTerminal(`Downloaded: ${url}/css/style.css`);
                window.Terminal.appendToTerminal(`Downloaded: ${url}/js/script.js`);
                
                setTimeout(() => {
                    window.Terminal.appendToTerminal(`Downloaded: ${url}/images/logo.png`);
                    window.Terminal.appendToTerminal(`Scraping linked page: ${url}/about.html`);
                    
                    setTimeout(() => {
                        window.Terminal.appendToTerminal(`Downloaded: ${url}/about.html`);
                        window.Terminal.appendToTerminal(`Scraping terminé.`);
                        
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
                        window.FileSystem.updateFileExplorer();
                        
                        // Réafficher l'invite du terminal
                        document.querySelector(".terminal-input-line").style.display = "flex";
                        window.Terminal.resetTerminalState();
                        
                        // Notification
                        Utils.showNotification("Web scraping terminé avec succès!");
                    }, 1000);
                }, 1000);
            }, 1000);
        }, 1000);
    },

    // Ajouter la fonctionnalité de web scraping
    addWebScrapingFunctionality: function() {
        // Ajouter un fichier de script de scraping si celui-ci n'existe pas
        const currentDir = window.FileSystem.getCurrentDirectory();
        if (!currentDir["web_scraper.py"]) {
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

            currentDir["web_scraper.py"] = scrapingScript;
            window.files["web_scraper.py"] = scrapingScript;
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
                window.EditorManager.openFile("web_scraper.py");
                
                // Demander l'URL à scraper
                const url = prompt("Entrez l'URL à scraper:", "https://example.com");
                if (url) {
                    // Simuler l'exécution du script de scraping
                    this.simulateWebScraping(url);
                }
            });
        }
    }
};