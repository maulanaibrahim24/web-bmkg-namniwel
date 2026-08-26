import time
import requests
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_FILE = os.path.join(BASE_DIR, 'data_cuaca.json')

KODE_BMKG = {
    "Namlea": "81.04.01.2001", "Air Buaya": "81.04.06.2001", 
    "Waeapo": "81.04.03.2001", "Waplau": "81.04.06.2001", 
    "Batabual": "81.04.10.2001", "Lolong Guba": "81.04.11.2001",
    "Waelata": "81.04.12.2001", "Fena Leisela": "81.04.13.2001", 
    "Teluk Kaiely": "81.04.14.2001", "Lilialy": "81.04.15.2001"
}

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"
}

# Baca data lama
data_existing = {}
if os.path.exists(CACHE_FILE):
    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            data_existing = json.load(f)
    except Exception:
        pass

print("Mulai menarik data 10 Kecamatan secara perlahan...")

# Tarik semua kecamatan secara berurutan
for kec, kode in KODE_BMKG.items():
    try:
        r = requests.get(f"https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={kode}", headers=headers, timeout=15)
        if r.status_code == 200:
            data_json = r.json()
            cuaca_list = data_json["data"][0]["cuaca"]
            hasil_kec = []
            
            for i in range(min(8, len(cuaca_list))):
                hari = cuaca_list[i]
                if not hari: continue
                
                temps = [int(jam.get("t", 0)) for jam in hari if jam.get("t")]
                rhs = [int(jam.get("hu", 0)) for jam in hari if jam.get("hu")]
                
                # Ambil tanggal dari data BMKG (contoh: "2026-08-25")
                tanggal_data = hari[0].get("local_datetime", "").split(" ")[0]
                
                suhu_min_baru = min(temps) if temps else "-"
                suhu_max_baru = max(temps) if temps else "-"
                rh_min_baru = min(rhs) if rhs else "-"
                rh_max_baru = max(rhs) if rhs else "-"
                
                # LOGIKA MEMORI: Ingat suhu terpanas siang hari meskipun ditarik pada malam hari
                if i == 0 and kec in data_existing and len(data_existing[kec]) > 0:
                    old_data = data_existing[kec][0]
                    # Jika masih di tanggal yang sama, kombinasikan dengan data tadi siang
                    if old_data.get("tanggal") == tanggal_data:
                        old_s_min = old_data.get("suhu_min", "-")
                        old_s_max = old_data.get("suhu_max", "-")
                        
                        if old_s_min != "-" and suhu_min_baru != "-":
                            suhu_min_baru = min(int(old_s_min), suhu_min_baru)
                        if old_s_max != "-" and suhu_max_baru != "-":
                            suhu_max_baru = max(int(old_s_max), suhu_max_baru)
                
                idx = 0 if i == 0 else len(hari) // 2
                jam_data = hari[idx]
                
                hasil_kec.append({
                    "tanggal": tanggal_data,  # Simpan tanggal untuk referensi memori
                    "cuaca": jam_data.get("weather_desc", "-"),
                    "suhu": jam_data.get("t", "-"),
                    "rh": jam_data.get("hu", "-"),
                    "angin": jam_data.get("ws", "-"),
                    "suhu_min": suhu_min_baru,
                    "suhu_max": suhu_max_baru,
                    "rh_min": rh_min_baru,
                    "rh_max": rh_max_baru
                })
            
            # Simpan data kecamatan ini
            data_existing[kec] = hasil_kec
            print(f"BERHASIL: {kec}")
        else:
            print(f"GAGAL: {kec} (Code: {r.status_code})")
    except Exception as e:
        print(f"ERROR: {kec} - {e}")
    
    time.sleep(15)

# Simpan semuanya ke dalam file json
with open(CACHE_FILE, 'w', encoding='utf-8') as f:
    json.dump(data_existing, f, indent=2)

print("Proses update seluruh wilayah selesai!")