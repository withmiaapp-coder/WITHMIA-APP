import urllib.request, json

api_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZjOTE2Ny0zZTA4LTRkN2QtYTY5ZC1iOTUxZjY0MWJiZGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5NTY0MTg1fQ.WqFWOnWwuTLMJHaKme8d3gyfaHNjC2oMqpujb9Xp9tY"

# Get the RAG withmia workflow
req = urllib.request.Request("https://n8n-production-00dd.up.railway.app/api/v1/workflows/zDqy6hoBbUv5YVyI")
req.add_header("X-N8N-API-KEY", api_key)
r = json.loads(urllib.request.urlopen(req).read())

print(f"Name: {r['name']}")
print(f"Active: {r.get('active')}")
print(f"Nodes: {len(r.get('nodes', []))}")

# Get webhook path
for node in r.get("nodes", []):
    if node["type"] == "n8n-nodes-base.webhook":
        print(f"Webhook path: {node['parameters'].get('path')}")

# Check last executions for errors
req2 = urllib.request.Request(f"https://n8n-production-00dd.up.railway.app/api/v1/executions?workflowId=zDqy6hoBbUv5YVyI&limit=5")
req2.add_header("X-N8N-API-KEY", api_key)
r2 = json.loads(urllib.request.urlopen(req2).read())
print(f"\nRecent executions:")
for ex in r2.get("data", []):
    print(f"  ID: {ex['id']} | Status: {ex['status']} | Finished: {ex.get('stoppedAt', 'N/A')}")

# Check if there are error executions
errors = [e for e in r2.get("data", []) if e["status"] == "error"]
if errors:
    # Get details of most recent error
    eid = errors[0]["id"]
    req3 = urllib.request.Request(f"https://n8n-production-00dd.up.railway.app/api/v1/executions/{eid}")
    req3.add_header("X-N8N-API-KEY", api_key)
    r3 = json.loads(urllib.request.urlopen(req3).read())
    
    # Find the failed node
    rd = r3.get("data", {}).get("resultData", {})
    run_data = rd.get("runData", {})
    for node_name, node_runs in run_data.items():
        for run in node_runs:
            if run.get("error"):
                err = run["error"]
                print(f"\n  ERROR in '{node_name}': {err.get('message', str(err)[:200])}")
