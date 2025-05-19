# Gemini AI Desktop App

A cross-platform desktop application built using **Electron** (for the frontend) and **Python** (for backend logic), powered by **Google's Gemini AI**. This app processes documents like PDFs and spreadsheets with AI-driven intelligence.


## Prerequisites

Before you begin, ensure you have the following installed:
* [Node.js and npm](https://nodejs.org/)
* [Python 3.x](https://www.python.org/downloads/)

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

## Contributing

[Optional: Add guidelines for how others can contribute to your project, if applicable.]

## License

[Optional: Specify the license for your project, e.g., MIT License.]
