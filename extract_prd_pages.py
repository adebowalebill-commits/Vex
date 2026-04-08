import PyPDF2, os

os.chdir(r'c:\Users\Bill\Desktop\Vexium Verse')

reader = PyPDF2.PdfReader(r'Vexium Verse — Product Requirements Document (prd).pdf')

outdir = r'c:\Users\Bill\Desktop\Vexium Verse\vexium-verse'

for i, page in enumerate(reader.pages):
    path = os.path.join(outdir, f'prd_page_{i+1}.md')
    with open(path, 'w', encoding='utf-8-sig') as f:
        f.write(page.extract_text())
    print(f'Page {i+1}: {os.path.getsize(path)} bytes')

print('Done')
