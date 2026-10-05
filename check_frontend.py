import httpx

r = httpx.get("http://localhost:5173/")
print(f"Status: {r.status_code}")
print(f"Title found: {'<title>' in r.text}")
print(f"Root div found: {'id=\"root\"' in r.text}")
print(f"Script tag found: {'<script' in r.text}")
print(f"Content length: {len(r.text)} bytes")

# Show a snippet
idx = r.text.find("<title>")
if idx >= 0:
    end = r.text.find("</title>", idx)
    print(f"Title: {r.text[idx:end+8]}")
