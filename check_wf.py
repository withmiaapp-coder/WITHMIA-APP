import urllib.request, json

api_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZjOTE2Ny0zZTA4LTRkN2QtYTY5ZC1iOTUxZjY0MWJiZGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5NTY0MTg1fQ.WqFWOnWwuTLMJHaKme8d3gyfaHNjC2oMqpujb9Xp9tY"

# List all workflows
req = urllib.request.Request("https://n8n-production-00dd.up.railway.app/api/v1/workflows")
req.add_header("X-N8N-API-KEY", api_key)
r = json.loads(urllib.request.urlopen(req).read())

print("=== All workflows ===")
for w in r.get("data", []):
    wid = w["id"]
    name = w["name"]
    active = w.get("active", False)
    print(f"  {wid} | {name} | Active: {active}")

# Check if there's a RAG for withmia
rag_withmia = [w for w in r.get("data", []) if "RAG" in w["name"] and "withmia" in w["name"]]
print(f"\nRAG workflows for withmia: {len(rag_withmia)}")
for w in rag_withmia:
    print(f"  {w['id']} | {w['name']}")
