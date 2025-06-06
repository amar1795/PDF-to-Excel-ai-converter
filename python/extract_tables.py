from google import genai
from dotenv import load_dotenv
import os
import json
import pandas as pd
import re
import sys
from pdf2image import convert_from_path  # Import pdf2image
import shutil  # Import the shutil module for deleting folders

# This will be updated dynamically by the Electron app or packaging tool
# In production, it will be relative to where the bundled Poppler is.
# For development, you can set it to your local Poppler path
poppler_path = os.environ.get('POPPLER_PATH', None)
if poppler_path:
    os.environ["PATH"] += os.pathsep + poppler_path
    print(f"Added Poppler path to PATH: {poppler_path}")
else:
    print("POPPLER_PATH environment variable not set. pdf2image might rely on system PATH or fail.")



def verify_api_key(api_key):
    """Verify if the provided API key is valid by making a test request."""
    try:
        # Initialize the client with the provided API key
        test_client = genai.Client(api_key=api_key)
        
        # Try to make a simple content generation request
        # This is a more reliable test than just listing models
        response = test_client.models.generate_content(
            model="gemini-1.5-flash",  # Using a standard model
            contents="Hello, can you hear me?",  # Simple prompt
        )
        
        # Check if we got a valid response
        if response and hasattr(response, 'text') and response.text:
            print(f"Verification response: {response.text[:50]}...")
            return True, "API key verification successful! The key is valid."
        else:
            return False, "API key verification failed: Received empty response from API."
    except Exception as e:
        error_message = str(e)
        print(f"Verification error: {error_message}")
        if "401" in error_message or "authentication" in error_message.lower() or "authorized" in error_message.lower():
            return False, f"API key verification failed: Invalid or expired API key. Error: {error_message}"
        else:
            return False, f"API key verification failed: Error connecting to Google API. Error: {error_message}"

# Try to load API key from environment variable first, then fallback to .env file
api_key = os.getenv("API_KEY")
if not api_key:
    # Load the .env file as fallback
    load_dotenv()
    api_key = os.getenv("API_KEY")

if not api_key:
    print("Error: No API key provided. Please add your Google API key in the application.")
    sys.exit(1)

# Verify the API key before proceeding
is_valid, message = verify_api_key(api_key)
if not is_valid:
    print(message)
    sys.exit(1)
else:
    print(message)

# Check if this is a validation-only run
if len(sys.argv) > 1 and sys.argv[1] == '--validate':
    # We've already validated the API key above, so just exit successfully
    if is_valid:
        print("Validation-only mode: API key is valid")
    else:
        print(f"Validation-only mode: API key validation failed: {message}")
    sys.exit(0 if is_valid else 1)

# If we get here, we're doing a full PDF processing run
client = genai.Client(api_key=api_key)

# Get PDF path from command line arguments
# if len(sys.argv) <= 1:
#     print("Error: No PDF file specified.")
#     print("Usage: python extract_tables.py <pdf_file> [output_excel_file]")
#     print("Note: If output_excel_file is not specified, the input PDF filename will be used with .xlsx extension")
#     sys.exit(1)

# pdf_path = sys.argv[1]
# print(f"Processing PDF: {pdf_path}")

if len(sys.argv) <= 1:
    print("Error: No PDF file specified.")
    # === UPDATED USAGE MESSAGE ===
    print("Usage: python extract_tables.py <pdf_file> [output_excel_file] [image_temp_folder]")
    sys.exit(1)

pdf_path = sys.argv[1]
print(f"Processing PDF: {pdf_path}")

# Get the input file name without path and extension
input_filename = os.path.splitext(os.path.basename(pdf_path))[0]

# Get output Excel file path from command line arguments or use input filename
output_excel_file = sys.argv[2] if len(sys.argv) > 2 else f"{input_filename}.xlsx"
print(f"Output will be saved to: {output_excel_file}")

# image_folder = "ImageOutput"  # Specify the folder containing your images

image_folder = sys.argv[3] if len(sys.argv) > 3 else "ImageOutput_temp" # Provide a default for direct script testing
print(f"Temporary images will be stored in: {image_folder}")


# Ensure the image folder exists
os.makedirs(image_folder, exist_ok=True)

# Clear the contents of the image folder
for filename in os.listdir(image_folder):
    file_path = os.path.join(image_folder, filename)
    try:
        if os.path.isfile(file_path) or os.path.islink(file_path):
            os.unlink(file_path)
        elif os.path.isdir(file_path):
            shutil.rmtree(file_path)  # If there are subdirectories, remove them too
    except Exception as e:
        print(f"Error deleting item '{file_path}' in image folder: {e}")


def extract_images_from_pdf(pdf_path, output_folder):
    """Converts each page of a PDF into an image and saves them."""
    try:
        images = convert_from_path(pdf_path)
        if not images:
            print("No pages found in the PDF.")
            return False
        print(f"Successfully converted {len(images)} pages from PDF to images.")
        for idx, image in enumerate(images):
            img_path = os.path.join(output_folder, f"pdf_page_{idx+1}.jpg")
            image.save(img_path, "JPEG")
            print(f"Saved image: {img_path}")
        return True
    except Exception as e:
        print(f"Error converting PDF to images: {e}")
        return False


# Extract images from PDF
print(f"Extracting images from '{pdf_path}' to folder '{image_folder}'...")
if not extract_images_from_pdf(pdf_path, image_folder):
    print("Image extraction from PDF failed. Exiting.")
    exit()

# Get a sorted list of image files
image_files = sorted(
    [f for f in os.listdir(image_folder) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))],
    key=lambda x: int(re.search(r'(\d+)', x).group(1)) if re.search(r'(\d+)', x) else float('inf')
)

if not image_files:
    print(f"No image files found in the folder '{image_folder}'.")
    exit()

writer = pd.ExcelWriter(output_excel_file, engine='xlsxwriter')  # Use xlsxwriter for creating multiple sheets

for image_file in image_files:
    image_path = os.path.join(image_folder, image_file)
    try:
        my_file = client.files.upload(file=image_path)

        prompt = "Extract the table from the attached document. The table contains the following columns: [Column 1 name]: [data type/description], [Column 2 name]: [data type/description], ... Return the extracted data in JSON format, using an array of objects, where each object represents a row in the table. Ignore any irrelevant text or data outside the table. If a value is missing in the table, set it to null in the JSON output."

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[my_file, prompt],
        )

        response_text = response.text

        # Extract the valid JSON part using regex
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```', response_text)
        if json_match:
            json_string = json_match.group(1).strip()
        else:
            json_string = response_text.strip()

        data = json.loads(json_string)

        if data and isinstance(data, list) and len(data) > 0:
            df = pd.DataFrame(data)
            sheet_name = os.path.splitext(image_file)[0]  # Use filename without extension as sheet name
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            print(f"Data from {image_file} saved to sheet '{sheet_name}' in {output_excel_file}")
        else:
            print(f"No valid JSON data found for {image_file}.")

    except FileNotFoundError:
        print(f"Error: Image file '{image_path}' not found.")
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON for {image_file}: {e}")
        print(f"Raw response from API (after cleaning): {json_string}")
    except Exception as e:
        print(f"An error occurred while processing {image_file}: {e}")

writer.close()
print(f"All data saved to {output_excel_file}")