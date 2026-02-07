import json
import os

locale_files = [
    '/Users/ahmadzuhair/Documents/AnKode/Sig/AppX/Lecturer App/src/i18n/locales/en.json',
    '/Users/ahmadzuhair/Documents/AnKode/Sig/AppX/Lecturer App/src/i18n/locales/ar.json'
]

for file_path in locale_files:
    if os.path.exists(file_path):
        print(f"Processing {file_path}...")
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                # helper to detect duplicates? standard json.load takes last one.
                # To be improved, we just want to remove syntax errors for duplicates.
                # If we want to preserve specific ones, we'd need a custom parser,
                # but assuming last-write-wins is acceptable for my recent additions.
                data = json.load(f)
            
            # Write back with indentation
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            print(f"Cleaned {file_path}")
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
    else:
        print(f"File not found: {file_path}")
