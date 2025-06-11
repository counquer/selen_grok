import requests
import os
from dotenv import load_dotenv

# Carga las variables de entorno desde .env.local
load_dotenv()

# Obtén la URL, headers y data
url = "http://localhost:3000/api/selen"
headers = {"Content-Type": "application/json"}
data = {"trigger": "selen"}

# Realiza la solicitud POST
response = requests.post(url, headers=headers, json=data)

# Imprime la respuesta
print(response.json().get("data", {}).get("respuesta"))