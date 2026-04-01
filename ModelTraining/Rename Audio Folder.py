import os
import re

# Define the target directory
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
target_dir = os.path.join(base_dir, "Training Audio")

# Iterate over each entry in the target directory
for entry in os.listdir(target_dir):
    # Construct full path
    entry_path = os.path.join(target_dir, entry)
    # Check if it is a directory
    if os.path.isdir(entry_path):
        # Remove numbers from the directory name and replace underscores with spaces
        new_name = re.sub(r'\d+', '', entry)
        new_name = new_name.replace('_', ' ')
        new_name = new_name.strip()  # Optionally trim surrounding whitespace
        # If the name has changed, rename the folder
        if new_name and new_name != entry:
            new_path = os.path.join(target_dir, new_name)
            print(f"Renaming '{entry}' to '{new_name}'")
            os.rename(entry_path, new_path)
