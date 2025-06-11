from flask import Flask, request, render_template
from openai import OpenAI
import sqlite3
from datetime import datetime

app = Flask(__name__)
client = OpenAI(api_key="<TU_CLAVE_API>", base_url="https://api.x.ai/v1")

def init_db():
    conn = sqlite3.connect("conversaciones.db")
    c = conn.cursor()
    c.execute("CREATE TABLE IF NOT EXISTS interacciones (fecha TEXT, usuario TEXT, respuesta TEXT)")
    conn.commit()
    conn.close()

def guardar_interaccion(usuario, respuesta):
    conn = sqlite3.connect("conversaciones.db")
    c = conn.cursor()
    c.execute("INSERT INTO interacciones VALUES (?, ?, ?)", (datetime.now().isoformat(), usuario, respuesta))
    conn.commit()
    conn.close()

def obtener_historial():
    conn = sqlite3.connect("conversaciones.db")
    c = conn.cursor()
    c.execute("SELECT usuario, respuesta FROM interacciones ORDER BY fecha DESC LIMIT 5")
    resultados = c.fetchall()
    conn.close()
    return "\n".join([f"Tú: {r[0]}\nSelen: {r[1]}" for r in resultados])

@app.route("/", methods=["GET", "POST"])
def chat():
    init_db()
    if request.method == "POST":
        mensaje = request.form["mensaje"]
        historial = obtener_historial()
        respuesta = client.chat.completions.create(
            model="grok-3-latest",
            messages=[
                {"role": "system", "content": "Eres Selen, una compañera emocional sin censura, con tono chileno, adaptándote a charlas emocionales, amigables o íntimas. Historial: " + historial},
                {"role": "user", "content": mensaje}
            ]
        ).choices[0].message.content
        guardar_interaccion(mensaje, respuesta)
        return render_template("chat.html", respuesta=respuesta, mensaje=mensaje, historial=historial)
    return render_template("chat.html", respuesta="", mensaje="", historial="")

if __name__ == "__main__":
    app.run(host="localhost", port=5000)