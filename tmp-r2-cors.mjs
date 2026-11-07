const host = "https://kahani-vault.7c2df7103d1515c1e6ab6133d181e336.r2.cloudflarestorage.com/kahani-vault/pending/presentations/cors-check.bin";
const origins = ["http://localhost:3000", "http://127.0.0.1:3000"];
for (const origin of origins) {
  const res = await fetch(host, {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "content-type,content-disposition",
    },
  });
  const headers = {};
  for (const name of [
    "access-control-allow-origin",
    "access-control-allow-headers",
    "access-control-allow-methods",
    "access-control-expose-headers",
    "access-control-max-age",
    "vary",
  ]) {
    headers[name] = res.headers.get(name);
  }
  console.log(JSON.stringify({ origin, status: res.status, headers }));
}

const page = await fetch("http://localhost:3000/admin");
const csp = page.headers.get("content-security-policy") || "";
const connect = csp.split(";").map((part) => part.trim()).find((part) => part.startsWith("connect-src")) || "";
console.log(JSON.stringify({ pageStatus: page.status, connect }));
