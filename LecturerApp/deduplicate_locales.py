
import json
import collections

def deduplicate_json(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            # Load with object_pairs_hook to capture duplicates if needed, 
            # but standard json.load keeps the *last* value for a repeated key, 
            # effectively removing duplicates but we might want to be aware or just clean it.
            # actually json.load automatically takes the last occurrence of a key.
            # So simply loading and dumping back will remove duplicates!
            data = json.load(f)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"Successfully deduplicated {file_path}")
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

deduplicate_json('/Users/ahmadzuhair/Documents/AnKode/Sig/AppX/Lecturer App/src/i18n/locales/en.json')
deduplicate_json('/Users/ahmadzuhair/Documents/AnKode/Sig/AppX/Lecturer App/src/i18n/locales/ar.json')
