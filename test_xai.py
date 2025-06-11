from openai import OpenAI
import os
from dotenv import load_dotenv

# Carga las variables de entorno desde .env.local o .env
load_dotenv()

# Obtén la clave API desde las variables de entorno
XAI_API_KEY = os.getenv("GROK_API_KEY")
if not XAI_API_KEY:
    raise ValueError("La clave GROK_API_KEY no está configurada en el archivo .env")

# Inicializa el cliente con la API de xAI
client = OpenAI(
    api_key=XAI_API_KEY,
    base_url="https://api.x.ai/v1",
)

# Crea una solicitud de chat
try:
    completion = client.chat.completions.create(
        model="grok-2",  # Usa grok-2
        messages=[
            {"role": "user", "content": "¿Cuál es el sentido de la vida?"}
        ]
    )
    print(completion.choices[0].message.content)
except Exception as e:
    print(f"Error: {e}")