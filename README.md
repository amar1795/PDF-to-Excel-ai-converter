# PDF to EXCEL AI Converter 

A cross-platform desktop application built using **Electron** (for the frontend) and **Python** (for backend logic), powered by **Google's Gemini AI**. This app processes documents like PDFs and spreadsheets with AI-driven intelligence.


## Prerequisites

Before you begin, ensure you have the following installed:
* [Node.js and npm](https://nodejs.org/)
* [Python 3.10 and above](https://www.python.org/downloads/)

## Installation

Follow these steps to set up the project environment:

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone [your-repository-url]
    cd [your-repository-directory]
    ```

2.  **Install Electron Dependencies:**
    Open your terminal or command prompt and run the following command to install the necessary Node.js packages for Electron:
    ```bash
    npm i
    ```

3.  **Create and Activate Python Virtual Environment:**
    It is crucial to use a virtual environment to manage Python dependencies.

    * **Create the virtual environment:**
        ```bash
        python -m venv venv
        ```
        (You can replace `venv` with your preferred environment name).

    * **Activate the virtual environment:**
        * On Windows:
            ```bash
            .\venv\Scripts\activate
            ```
        * On macOS and Linux:
            ```bash
            source venv/bin/activate
            ```
        You should see the virtual environment name in your terminal prompt (e.g., `(venv)`).

4.  **Install Python Dependencies:**
    With your virtual environment activated, install the required Python packages using pip:
    ```bash
    pip install google-generativeai python-dotenv pandas pdf2image xlsxwriter pillow
    ```
    Then, install or update `google-genai`:
    ```bash
    pip install -q -U google-genai
    ```

## Configuration

1.  **Obtain a Gemini API Key:**
    * Go to [Google AI Studio](https://aistudio.google.com/app/apikey) (or the relevant Google Cloud Console page for Gemini API keys).
    * Create an API key if you don't have one already.

2.  **Set up Environment Variable:**
    Create a `.env` file in the root directory of your project. Add your Gemini API key to this file:
    ```env
    GEMINI_API_KEY=YOUR_API_KEY_HERE
    ```
    Replace `YOUR_API_KEY_HERE` with the actual API key you obtained.

    **Important:** Add `.env` to your `.gitignore` file to prevent your API key from being committed to version control. If you don't have a `.gitignore` file, create one in the root directory and add the following line:
    ```
    .env
    ```

## Running the Application

Once you have completed the installation and configuration steps:

1.  **Ensure your Python virtual environment is activated.** (See step 3 in Installation if you need to reactivate it).
2.  **Start the Electron application:**
    ```bash
    npm start
    ```

### Build for Production (Standalone Windows Application)

To create a standalone executable (`.exe`) for Windows, follow these steps. This process will bundle your Electron application, Python environment, and all necessary dependencies into a single installer.

#### 1. Prepare Poppler Binaries

Your application uses Poppler for PDF image conversion. You need to include its binaries directly in your project so they can be bundled.

* **Download Poppler for Windows:** If you haven't already, download the pre-built binaries from [https://github.com/oschwartz10612/poppler-windows/releases](https://github.com/oschwartz10612/poppler-windows/releases).
* **Extract and Place:** Extract the downloaded archive. Inside, you'll typically find a `bin` folder.
* **Copy to Project:** Copy the entire `bin` folder (containing `pdftocairo.exe`, `pdfinfo.exe`, etc.) into your project's `resources/poppler/` directory. Create these directories if they don't exist.

    Your project structure for Poppler should look like this:
    ```
    your-project-root/
    ├── resources/
    │   └── poppler/
    │       └── bin/  <-- Poppler executables go here
    ├── python/
    ├── venv/
    ├── index.js
    ├── package.json
    └── ...
    ```

#### 2. Verify `package.json` Configuration

Ensure your `package.json` contains the necessary metadata and configuration for Electron Forge's Squirrel.Windows maker.

* Open your `package.json` file.
* **Root Level:** Verify that `productName`, `description`, and `author` fields are present and correctly filled out.
    ```json
    {
      "name": "your-app-name",
      "version": "1.0.0",
      "productName": "Your App Display Name", // IMPORTANT: This is used for the installer and app name
      "description": "A concise description of your app.",
      "author": "Your Name/Company",
      // ... rest of your package.json
    }
    ```
* **`config.forge.makers` Section:** Check the configuration for `@electron-forge/maker-squirrel`. The `name`, `authors`, and `description` within its `config` block are crucial.
    ```json
    "config": {
      "forge": {
        "packagerConfig": {
          "executableName": "YourExecutableName", // e.g., PDFTableExtractor
          "extraResource": [
            "python",
            "venv",
            "resources/poppler" // Confirms Poppler is bundled
          ],
          // ... other packagerConfig
        },
        "makers": [
          {
            "name": "@electron-forge/maker-squirrel",
            "config": {
              "name": "your_app_internal_name", // A short, internal name (e.g., pdftoexcelconverter)
              "authors": "Your Name or Company Name",
              "description": "A brief description for the installer."
            }
          }
        ]
      }
    }
    ```

#### 3. Clean Build Artifacts (Recommended)

Before building, it's good practice to remove any remnants from previous builds to ensure a clean start.

```bash
# For Windows (Command Prompt or PowerShell):
rmdir /s /q out
rmdir /s /q .cache

# For macOS/Linux:
rm -rf out .cache

npm cache clean --force
   

#### 4. Generate the Executable Installer

-------------------------------------

To create your application's executable installer, run the **Electron Forge make** command directly from your project's root directory:

Bash

```

npm run make

```

This process might take a few minutes as it's busy packaging Electron, your Python environment, and all of your project's dependencies.

**Troubleshooting:** If you run into any issues during this step (like "dummy update.exe" errors, "file not found," or permissions problems), try launching your terminal (either Command Prompt or PowerShell) **as an administrator** and then run `npm run make` again. It's also a good idea to check that your antivirus software isn't getting in the way.

* * * * *

#### 5. Locate and Test the Installer

---------------------------------

Once the build process is complete, navigate to the **out** directory within your project folder. You'll find the installer nestled within a subdirectory structure, usually something like `out\make\squirrel.windows\x64\`.

Look for a **.exe** file. Its name will be similar to "Your App Display Name Setup.exe" or "YourExecutableName Setup.exe," depending on how you've configured your `productName` or `executableName`.

Go ahead and run this installer to get the application set up on your Windows machine. After it's installed, launch the app from your Start Menu and thoroughly test all its features---including API key validation, PDF conversion, and making sure output files are saved correctly.
## Contributing


Contributions are welcome! If you'd like to improve the project, follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature-name`)
3. Make your changes
4. Commit your changes (`git commit -m "Add some feature"`)
5. Push to the branch (`git push origin feature-name`)
6. Open a Pull Request

Please make sure your code follows the existing style and includes relevant tests or documentation.

## License

This project is licensed under the [MIT License](LICENSE).  
You are free to use, modify, and distribute this software as long as the original license and copyright notice are included.
