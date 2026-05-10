import os
import json
import datetime
from curl_cffi import requests as cffi_requests
import requests
from bs4 import BeautifulSoup

def clean_text(text):
    """Hapus karakter Unicode yang tidak bisa di-encode"""
    if not text:
        return ""
    return text.encode("utf-8", errors="ignore").decode("utf-8")

def scrape_taaft():
    url = "https://theresanaiforthat.com/"
    
    response = cffi_requests.get(url, impersonate="chrome")
    
    if response.status_code != 200:
        print(f"Gagal mengambil halaman. Status: {response.status_code}")
        return
    
    soup = BeautifulSoup(response.text, "html.parser")
    
    ai_items = soup.find_all("li", class_="li")
    
    tools = []
    
    for item in ai_items:
        nama_ai = item.get("data-name")
        tipe_ai = item.get("data-task")
        link_akses = item.get("data-url")
        
        ai_link_tag = item.find("a", class_="ai_link")
        if ai_link_tag and ai_link_tag.get("href"):
            link_internal = "https://theresanaiforthat.com" + ai_link_tag.get("href")
        else:
            link_internal = url
            
        if nama_ai and link_akses:
            tools.append({
                "name": clean_text(nama_ai),
                "url": clean_text(link_akses),
                "description": clean_text(f"Tool untuk {tipe_ai}. Selengkapnya di {link_internal}"),
                "category": "Productivity",
                "pricing_type": "freemium"
            })
            
    payload = {
        "tools": tools,
        "scraped_at": datetime.datetime.now(datetime.UTC).isoformat().replace("+00:00", "Z"),
        "source": "theresanaiforthat.com"
    }

    print(f"Berhasil mengekstrak {len(tools)} AI. Mengirim ke webhook...")

    webhook_url = "http://localhost:8000/api/internal/scraper-webhook"
    secret_key = os.environ.get("SCRAPER_SECRET_KEY", "secret123")

    try:
        json_data = json.dumps(payload, ensure_ascii=True)
        res = requests.post(
            webhook_url,
            data=json_data,
            headers={
                "X-Scraper-Secret": secret_key,
                "Content-Type": "application/json"
            }
        )
        print("Response API:", res.status_code, res.text)
    except Exception as e:
        print("Gagal mengirim data ke API:", e)

if __name__ == "__main__":
    scrape_taaft()
