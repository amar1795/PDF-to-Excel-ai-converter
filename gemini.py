from google import genai
from dotenv import load_dotenv
import os
import json
import csv
import re


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
# print(response.text)

json_output = response.text
response_text = response.text
json_output= response.text

# Save the response text to a file
# output_file = "api_response.txt"
# try:
#     with open(output_file, "w", encoding="utf-8") as f:
#         f.write(response_text)
#     print(f"API response saved to: {output_file}")
# except Exception as e:
#     print(f"An error occurred while saving the response to a file: {e}")

# Extract the valid JSON part using regex
json_match = re.search(r'```json\s*([\s\S]*?)\s*```', response_text)
if json_match:
    json_string = json_match.group(1).strip()
else:
    json_string = response_text.strip()  # Try the whole response if no ```json``` block


try:
    data = json.loads(json_string)

    if data and isinstance(data, list) and len(data) > 0:
        # Extract header from the first dictionary's keys
        header = list(data[0].keys())

        with open("output.csv", "w", newline="", encoding="utf-8") as csvfile:
            writer = csv.writer(csvfile)

            # Write the header row
            writer.writerow(header)

            # Write the data rows
            for row_dict in data:
                writer.writerow([row_dict.get(col, None) for col in header])

        print("JSON data successfully converted to output.csv")
    else:
        print("No valid JSON data or empty list received from the API.")

except json.JSONDecodeError as e:
    print(f"Error decoding JSON: {e}")
    print(f"Raw response from API: {json_string}")
except Exception as e:
    print(f"An error occurred during CSV conversion: {e}")