letters = dict()
letters['o'] = """
   █████████═╗   
███         ███═╗
███         ███ ║
███         ███ ║
███         ███ ║
███         ███ ║
███         ███ ║
███         ███ ║
 ╚═█████████ ╔══╝
    ╚════════╝   
"""

letters['d'] = """
████████████═╗   
███         ███═╗
███         ███ ║
███         ███ ║
███         ███ ║
███         ███ ║
███         ███ ║
███         ███ ║
████████████ ╔══╝
 ╚═══════════╝   
"""

letters['r'] = """
████████████═╗   
███         ███═╗
███         ███ ║
███         ███ ║
████████████ ╔══╝
███ ╔═══════███═╗
███ ║       ███ ║
███ ║       ███ ║
███ ║       ███ ║
 ╚══╝        ╚══╝
"""

letters['a'] = """
   █████████═╗   
███         ███═╗
███         ███ ║
███         ███ ║
███         ███ ║
███████████████ ║
███ ╔═══════███ ║
███ ║       ███ ║
███ ║       ███ ║
 ╚══╝        ╚══╝
"""

letters['e'] = """
████████████═╗
███ ╔════════╝
███ ║         
███ ║         
████████████═╗
███ ╔════════╝
███ ║         
███ ║         
████████████═╗
 ╚═══════════╝
"""

letters['v'] = """
███═╗     ███═╗
███ ║     ███ ║
███ ║     ███ ║
███ ║     ███ ║
███ ║     ███ ║
███ ║     ███ ║
  ███═╗ ███ ╔═╝
    █████ ╔═╝  
     ███ ╔╝    
      ╚══╝     
"""

letters['.'] = """
     
     
     
     
     
     
     
     
███═╗
 ╚══╝
"""

def remove_shadow(letter):
    letter = letter.replace("╔", " ")
    letter = letter.replace("╚", " ")
    letter = letter.replace("╗", " ")
    letter = letter.replace("╝", " ")
    letter = letter.replace("═", " ")
    letter = letter.replace("║", " ")
    return letter

def take_row(letter, row):
    return letter.split("\n")[row]

def print_text(text, no_shadow=False, html=False):
    result = ""
    for row in range(1, 11):
        if html:
            result += "<a>"
        for char in text:
            letter = letters[char]
            if no_shadow:
                letter = remove_shadow(letter)
            result += take_row(letter, row)
            result += "  "
        if html:
            result += "</a>"
        result += "\n"
    print(result)

text = "odra.dev"
print_text(text)
print_text(text, no_shadow=True)
print_text(text, html=True)
print_text(text, no_shadow=True, html=True)
