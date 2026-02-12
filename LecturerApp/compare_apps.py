import os

def get_files(directory):
    file_set = set()
    for root, dirs, files in os.walk(directory):
        for file in files:
            rel_path = os.path.relpath(os.path.join(root, file), directory)
            if not rel_path.endswith('.DS_Store'):
                file_set.add(rel_path)
    return file_set

lecturer_app_dir = '/Users/ahmad-m4/Documents/Taalomy/AppX/LecturerApp/app'
web_lecturer_app_dir = '/Users/ahmad-m4/Documents/Taalomy/webLecturerApp/app'

lecturer_files = get_files(lecturer_app_dir)
web_files = get_files(web_lecturer_app_dir)

missing_files = lecturer_files - web_files

print("Files in LecturerApp but missing in webLecturerApp:")
for file in sorted(missing_files):
    print(file)
