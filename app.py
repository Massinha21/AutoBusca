# app.py
import json
from flask import Flask, render_template, request, Response
from parsers_manager import ParsersManager

app = Flask(__name__)
# Instancia o gerenciador de parsers globais na inicialização do app
parsers_manager = ParsersManager()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/search")
def search():
    query = request.args.get("query", "").strip()
    
    if not query:
        return Response("data: {\"type\": \"error\", \"message\": \"Termo de busca vazio.\"}\n\n", mimetype="text/event-stream")

    def event_stream():
        try:
            # Consome o gerador de busca do ParsersManager e envia via Server-Sent Events (SSE)
            for event in parsers_manager.search_generator(query):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            err_event = {"type": "error", "message": f"Erro interno durante a busca: {str(e)}"}
            yield f"data: {json.dumps(err_event)}\n\n"

    return Response(event_stream(), mimetype="text/event-stream")

if __name__ == "__main__":
    # Roda o app localmente na porta 5000
    app.run(host="0.0.0.0", port=5000, debug=True)
