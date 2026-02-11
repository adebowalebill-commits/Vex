import PyPDF2
import sys
import os

os.chdir(r'c:\Users\Bill\Desktop\Vexium Verse')

reader = PyPDF2.PdfReader(r'Vexium Verse — Product Requirements Document (prd).pdf')

with open(r'c:\Users\Bill\Desktop\Vexium Verse\Vex\prd_full.txt', 'w', encoding='utf-8') as f:
    for page in reader.pages:
        text = page.extract_text()
        f.write(text + '\n\n---PAGE BREAK---\n\n')

print('Done')
