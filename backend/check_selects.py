import os

def find_missing_onchange():
    base_dir = r"c:\Users\MUHAMMAD SHAMIL CV\PycharmProjects\crm-saas\frontend\src\app"
    for root, dirs, files in os.walk(base_dir):
        for f in files:
            if f.endswith(".tsx"):
                path = os.path.join(root, f)
                with open(path, "r", encoding="utf-8") as file:
                    content = file.read()
                    
                    # Very naive check: split by "<select"
                    parts = content.split("<select")
                    for i in range(1, len(parts)):
                        # Look at the tag up to ">"
                        tag_content = parts[i].split(">")[0]
                        if "onChange" not in tag_content:
                            print(f"Missing onChange in {path}")

find_missing_onchange()
