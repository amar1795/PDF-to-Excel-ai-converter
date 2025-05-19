from google import genai
from dotenv import load_dotenv
import os


# Load the .env file
load_dotenv()

api_key = os.getenv("API_KEY")

client = genai.Client(api_key=api_key)
my_file = client.files.upload(file="1.jpg")

prompt = "Extract the table from the attached document. The table contains the following columns: [Column 1 name]: [data type/description], [Column 2 name]: [data type/description], ... Return the extracted data in JSON format, using an array of objects, where each object represents a row in the table. Ignore any irrelevant text or data outside the table. If a value is missing in the table, set it to null in the JSON output."


response = client.models.generate_content(
        model="gemini-2.0-flash",

    contents=[my_file, prompt],
)
print(response.text)