from google import genai
from dotenv import load_dotenv
import os
import json
import pandas as pd
import re
import sys
from pdf2image import convert_from_path  # Import pdf2image
import shutil  # Import the shutil module for deleting folders

# Load the .env file
load_dotenv()

api_key = os.getenv("API_KEY")

client = genai.Client(api_key=api_key)

# Get PDF path from command line arguments or use default
pdf_path = sys.argv[1] if len(sys.argv) > 1 else "VNHPL FY21.pdf"
print(f"Processing PDF: {pdf_path}")

# Get output Excel file path from command line arguments or use default
output_excel_file = sys.argv[2] if len(sys.argv) > 2 else "output.xlsx"
print(f"Output will be saved to: {output_excel_file}")

image_folder = "ImageOutput"  # Specify the folder containing your images



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

image_files = [f for f in os.listdir(image_folder) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]

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