import os
import glob
import re

directory = 'src'
files = glob.glob(directory + '/**/*.jsx', recursive=True) + glob.glob(directory + '/**/*.js', recursive=True)

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if 'http://localhost:8000' in content:
        # For strings like 'http://localhost:8000/api/...' -> change to `\${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/...`
        # Wait, if they have 'http://localhost:8000/api', changing it to a template string:
        content = re.sub(r"'http://localhost:8000(/.*?)'", r"`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}\1`", content)
        
        # For strings like "http://localhost:8000/api/..." -> change to `\${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/...`
        content = re.sub(r'"http://localhost:8000(.*?)"', r"`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}\1`", content)
        
        # For strings already in template literals: `http://localhost:8000/api/${topicId}`
        # Replace just the http://localhost:8000 part with ${import.meta.env.VITE_API_URL || 'http://localhost:8000'}
        content = content.replace("`http://localhost:8000", "`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}")
        
        # Finally, any raw instances of http://localhost:8000 that were missed
        content = content.replace("http://localhost:8000", "${import.meta.env.VITE_API_URL || 'http://localhost:8000'}")
        
        with open(filepath, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f"Updated {filepath}")
