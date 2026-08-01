// Esta función corre en el servidor de Netlify, nunca en el navegador del cliente.
// Por eso las claves (JSONBIN_API_KEY, ADMIN_PASSWORD) están seguras acá:
// se configuran como "Environment variables" en el panel de Netlify, nunca en el código.

exports.handler = async function (event) {
  const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;
  const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // Leer el plato guardado — esto lo llama la app apenas se abre, no requiere clave
  if (event.httpMethod === "GET") {
    try {
      const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
        headers: { "X-Master-Key": JSONBIN_API_KEY },
      });
      const data = await res.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ plato: (data.record && data.record.plato) || null }),
      };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "No se pudo leer." }) };
    }
  }

  // Cambiar el plato — acá SÍ se valida la clave, del lado del servidor
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");

      if (!body.password || body.password !== ADMIN_PASSWORD) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: "Clave incorrecta." }) };
      }
      if (!body.plato || typeof body.plato !== "string" || !body.plato.trim()) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Falta el nombre del plato." }) };
      }

      const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": JSONBIN_API_KEY,
          "X-Bin-Versioning": "false", // no acumula versiones viejas
        },
        body: JSON.stringify({ plato: body.plato.trim() }),
      });

      if (!res.ok) throw new Error("jsonbin respondió con error");
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "No se pudo guardar." }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Método no permitido." }) };
};
