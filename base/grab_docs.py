# grab_docs.py - Add Chrome args to bypass CORS
from playwright.sync_api import sync_playwright
import yaml
import sys
import re
from pathlib import Path


# Add custom representer BEFORE any yaml operations
def represent_str(dumper, data):
    if '\n' in data:
        # Use literal block style for multiline strings
        return dumper.represent_scalar('tag:yaml.org,2002:str', data, style='|')
    return dumper.represent_scalar('tag:yaml.org,2002:str', data)

# Register the custom representer
yaml.add_representer(str, represent_str)

# Add a custom representer for the 'None' type
def represent_none(dumper, data):
    # This tells the dumper to represent the data as a scalar node with an empty string
    return dumper.represent_scalar('tag:yaml.org,2002:null', '')

# Register the custom representer for the None type
yaml.add_representer(type(None), represent_none)


def parse_gen_docs_declaration(html_content):
    """Find window.genDocs = ["alex", "bob", "billboard"] declaration"""
    
    pattern = r'window\.genDocs\s*=\s*\[(.*?)\]'
    match = re.search(pattern, html_content, re.DOTALL)
    
    if not match:
        return []
    
    # Extract widget names from the array
    array_content = match.group(1)
    widget_names = re.findall(r'["\']([^"\']+)["\']', array_content)
    
    print(f"🔍 Found genDocs declaration: {widget_names}")
    return widget_names


def inject_doc_generation(html_in, html_out, widget_names):
    """Inject window.doc generation for specified widgets"""
    
    doc_entries = [f'"{name}": {name}.getAPITree()' for name in widget_names]
    """global_assignments = [f'    window.{name} = {name};' for name in widget_names]
        // Auto-generated from window.genDocs declaration
{chr(10).join(global_assignments)}
    """
    
    injection_code = f'''    
window.doc = {{
{',{}'.format(chr(10)).join(doc_entries)}
}};
    
console.log("📋 Generated docs for:", Object.keys(window.doc));
    '''
    
    # Inject before last </script>
    
    html_path_in = Path(html_in)
    html_path_out = Path(html_out)
    content = html_path_in.read_text()
    
    # Check if already injected
    if 'window.doc = {' in content:
        print("✅ window.doc generation already present")
        return True
    
    last_script_tag_index = content.rfind('</script>')
    
    if last_script_tag_index != -1:
        new_content = (
            content[:last_script_tag_index] +
            injection_code +
            content[last_script_tag_index:]
        )
    else:
        # Handle the case where no </script> tag is found
        # You might append the content at the end of the file or handle it as an error.
        print("No </script> tag found.")
        return False
    
    # Write back
    html_path_out.write_text(new_content)
    print(f"✅ Injected docs generation for {len(widgets)} widgets")
    return True


def grab_docs(html_file, output_file="api-docs.yaml"):
    with sync_playwright() as p:
        # Launch Chrome with CORS disabled
        browser = p.chromium.launch(
            headless=True,
            args=[
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--allow-file-access-from-files',
                '--disable-dev-shm-usage',
                '--no-sandbox'
            ]
        )
        
        context = browser.new_context()
        page = context.new_page()
        
        # Capture console messages
        page.on("console", lambda msg: print(f"🖥️ {msg.text}"))
        page.on("pageerror", lambda exc: print(f"🚨 {exc}"))
        
        try:
            print(f"🔄 Loading {html_file}...")
            page.goto(f"{html_file}")
            
            # Wait for window.doc to be created
            print("⏳ Waiting for modules and window.doc...")
            
            try:
                page.wait_for_function(
                    "() => window.doc && Object.keys(window.doc).length > 0",
                    timeout=15000
                )
                print("✅ window.doc detected!")
                
                docs = page.evaluate("() => window.doc")
                print(">>>")
                print(docs) 
                print("<<<")
                
                if docs:
                    print(f"✅ Found {len(docs)} objects: {list(docs.keys())}")
                    
                    with open(output_file, 'w') as f:
                        
                        yaml.dump(docs, f, 
                                default_flow_style=False,
                                indent=2,
                                sort_keys=False,
                                allow_unicode=True,
                                width=float('inf')  # Prevent line wrapping
                        )
                        
                    print(f"✅ Saved to {output_file}")
                    return True
                else:
                    print("❌ window.doc is empty")
                    return False
                    
            except Exception as timeout_error:
                print(f"⚠️ Timeout waiting for window.doc: {timeout_error}")
                
                # Try to get what we can
                fallback = page.evaluate("""
                    () => ({
                        hasDoc: typeof window.doc !== 'undefined',
                        hasAlex: typeof window.alex !== 'undefined',
                        hasBob: typeof window.bob !== 'undefined',
                        errors: window.jsErrors || []
                    })
                """)
                print(f"Fallback status: {fallback}")
                return False
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
        finally:
            browser.close()

if __name__ == "__main__":
    html_file = sys.argv[1]
    
    html_path = Path(html_file)
    if not html_path.exists():
        print(f"❌ File not found: {html_file}")
        sys.exit(2)
    
    # 1. Parse the HTML to find widget declarations
    print("🔍 Parsing HTML for widget declarations...")
    content = html_path.read_text()
    widgets = parse_gen_docs_declaration(content)
    
    if not widgets:
        print("❌ No widget declarations found")
        print("💡 Expected format: const alex = new BallPlayer(\"alex\");")
        sys.exit(2)
    
    print(f"✅ Found {len(widgets)} widget declarations")

    fname = "./tmp.html"
    inject_doc_generation(html_file, fname, widgets)
    grab_docs(f"file://{Path(fname).absolute()}")
    
    #success = grab_docs("tmp.html", "api-docs.yaml")
    #sys.exit(0 if success else 1)

