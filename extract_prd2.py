import PyPDF2
import os

os.chdir(r'c:\Users\Bill\Desktop\Vexium Verse')

reader = PyPDF2.PdfReader(r'Vexium Verse — Product Requirements Document (prd).pdf')

output_path = r'c:\Users\Bill\Desktop\Vexium Verse\vexium-verse\prd_extracted.txt'

with open(output_path, 'w', encoding='utf-8') as f:
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        f.write(f'\n=== PAGE {i+1} ===\n')
        f.write(text)

print(f'Extracted {len(reader.pages)} pages to {output_path}')
