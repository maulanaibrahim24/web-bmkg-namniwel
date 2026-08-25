import time
import requests
import sqlite3
import os
import json
import functools
from datetime import timedelta
from flask import Flask, render_template, request, jsonify, redirect, session, url_for
from werkzeug.utils import secure_filename

app = Flask(__name__)

# ==========================================
# SISTEM BRANKAS PASSWORD AMAN (TANPA .ENV)
# ==========================================
try:
    # Membaca password asli dari file config.py di server
    import config
    app.secret_key = config.SECRET_KEY
    ADMIN_USERNAME = config.ADMIN_USERNAME
    ADMIN_PASSWORD = config.ADMIN_PASSWORD
    TESTER_USERNAME = config.TESTER_USERNAME
    TESTER_PASSWORD = config.TESTER_PASSWORD
except ImportError:

    app.secret_key = 'rahasia_default_palsu'
    ADMIN_USERNAME = 'admin_palsu'
    ADMIN_PASSWORD = 'PasswordPalsu123!'
    TESTER_USERNAME = 'tester_palsu'
    TESTER_PASSWORD = 'PasswordPalsu123!'
# PENGATURAN DATABASE & UPLOAD FOTO

UPLOAD_FOLDER = 'static/img'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'} # Daftar ekstensi yang diizinkan

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = True      # Wajib HTTPS
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'   # Ekstra proteksi dari CSRF
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Fungsi validasi ekstensi file
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_db():
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'stasiun.db'))
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

# Fungsi untuk membuat tabel database otomatis saat pertama kali dijalankan
def init_db():
    with app.app_context():
        db = get_db()
        # Tabel Konten (Berita, Visi Misi, Artikel)
        db.execute('''CREATE TABLE IF NOT EXISTS konten 
                      (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                       kategori TEXT, 
                       judul TEXT, 
                       isi TEXT, 
                       foto TEXT, 
                       tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
        db.commit()

init_db()

# ==========================================
# SISTEM CACHE CUACA
# ==========================================

CACHE_CUACA = None
WAKTU_FETCH_TERAKHIR = 0
DURASI_CACHE = 1800  # 30 menit dalam detik

# ==========================================
# ROUTE UTAMA (FRONTEND)
# ==========================================

@app.route("/")
def home():
    db = get_db()
    # Mengambil berita terbaru
    berita_terbaru = db.execute("SELECT * FROM konten ORDER BY tanggal DESC").fetchall()
    
    # MENGHITUNG JUMLAH PEGAWAI OTOMATIS DARI DATABASE
    jumlah_pegawai = db.execute("SELECT COUNT(*) FROM konten WHERE kategori = 'Pegawai'").fetchone()[0]
    
    return render_template("index.html", 
                           jumlah_pegawai=jumlah_pegawai, 
                           berita=berita_terbaru)

@app.route("/pegawai")
def pegawai():
    db = get_db()
    # MENGAMBIL DATA PEGAWAI DARI PANEL ADMIN
    data_pegawai = db.execute("SELECT * FROM konten WHERE kategori = 'Pegawai' ORDER BY id ASC").fetchall()
    
    hasil = []
    for p in data_pegawai:
        hasil.append({
            "nama": p["judul"],          # Judul di form admin dijadikan Nama
            "jabatan": p["isi"],         # Isi Konten di form admin dijadikan Jabatan
            "nip": "-", 
            "email": "-", 
            "foto": p["foto"]            # Foto dari upload admin
        })
    return jsonify(hasil)
@app.route("/api/cuaca_all")
def cuaca_all():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    cache_file = os.path.join(base_dir, 'data_cuaca.json')
    
    try:
        with open(cache_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        print(f"Error membaca file JSON lokal: {e}")
        return jsonify({}), 500
# SISTEM KEAMANAN (LOGIN & LOGOUT)
# ==========================================

# Fungsi untuk mengunci halaman (Hanya bisa diakses jika sudah login)
def login_required(f):
    @functools.wraps(f)
    def wrap(*args, **kwargs):
        if 'logged_in' in session:
            return f(*args, **kwargs)
        else:
            return redirect(url_for('login'))
    return wrap

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        input_user = request.form['username']
        input_pass = request.form['password']
        
        # 1. Mengecek login Admin Utama
        if input_user == ADMIN_USERNAME and input_pass == ADMIN_PASSWORD:
            session.permanent = True
            session['logged_in'] = True
            session['role'] = 'admin'  # Menandai bahwa ini Admin
            session['csrf_token'] = os.urandom(24).hex()
            return redirect(url_for('admin'))
            
        # 2. Mengecek login Non-Admin (Tim Pentest)
        elif input_user == TESTER_USERNAME and input_pass == TESTER_PASSWORD:
            session.permanent = True
            session['logged_in'] = True
            session['role'] = 'non_admin' # Menandai bahwa ini Non-Admin
            session['csrf_token'] = os.urandom(24).hex()
            return redirect(url_for('admin'))
            
        else:
            return "Username atau Password salah!", 401
    
    # Tampilan form login sederhana
    return '''
        <div style="display:flex; justify-content:center; align-items:center; height:100vh; background-color:#f8f9fa;">
            <form method="post" style="background:white; padding:40px; border-radius:10px; box-shadow:0px 4px 10px rgba(0,0,0,0.1); text-align:center; font-family:sans-serif;">
                <h2 style="color:#004a8f; margin-bottom:20px;">Gembok Admin</h2>
                <input type="text" name="username" placeholder="Username" required style="width:100%; padding:10px; margin-bottom:15px; border:1px solid #ccc; border-radius:5px;"><br>
                <input type="password" name="password" placeholder="Password" required style="width:100%; padding:10px; margin-bottom:20px; border:1px solid #ccc; border-radius:5px;"><br>
                <input type="submit" value="Masuk ke Panel" style="background:#004a8f; color:white; padding:10px 20px; border:none; border-radius:5px; cursor:pointer; width:100%; font-weight:bold;">
            </form>
        </div>
    '''

@app.route("/logout")
def logout():
    session.clear() # Menghapus data sesi
    return redirect(url_for('home'))


# ==========================================
# ROUTE ADMIN (HALAMAN CMS)
# ==========================================

@app.route("/admin")
@login_required # <-- Gembok proteksi admin
def admin():
    # Mengambil semua data untuk ditampilkan di tabel admin
    db = get_db()
    semua_konten = db.execute("SELECT * FROM konten ORDER BY tanggal DESC").fetchall()
    return render_template("admin.html", daftar_konten=semua_konten)

@app.route("/api/update_konten", methods=["POST"])
@login_required # <-- Gembok proteksi admin
def update_konten():

    if request.form.get('csrf_token') != session.get('csrf_token'):
        return "AKSES DITOLAK: Pemalsuan perintah (CSRF) terdeteksi!", 403
    if session.get('role') != 'admin':
        return "AKSES DITOLAK: Akun Non-Admin tidak diizinkan mengubah database!", 403

    kategori = request.form.get('kategori')
    judul = request.form.get('judul')
    isi = request.form.get('isi')
    file = request.files.get('foto')
    
    filename = ""
    if file and file.filename != '':
        # Pengecekan file berbahaya
        if allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # File disimpan ke folder static/img
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
        else:
            return "DITOLAK: Ekstensi file tidak valid! Hanya diperbolehkan JPG, JPEG, atau PNG.", 400

    db = get_db()
    db.execute("INSERT INTO konten (kategori, judul, isi, foto) VALUES (?, ?, ?, ?)",
                 (kategori, judul, isi, filename))
    db.commit()
    
    return redirect(url_for('admin')) # Otomatis kembali ke admin

@app.route("/api/hapus_konten/<int:id>", methods=["POST"])
@login_required # <-- Gembok proteksi admin
def hapus_konten(id):

    if request.form.get('csrf_token') != session.get('csrf_token'):
        return "AKSES DITOLAK: Pemalsuan perintah (CSRF) terdeteksi!", 403
    if session.get('role') != 'admin':
        return "AKSES DITOLAK: Akun Non-Admin tidak diizinkan mengubah database!", 403

    db = get_db()
    
    # 1. Cek file foto untuk dihapus dari folder static/img
    konten = db.execute("SELECT foto FROM konten WHERE id = ?", (id,)).fetchone()
    if konten and konten['foto']:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], konten['foto'])
        if os.path.exists(filepath):
            try:
                os.remove(filepath) # Menghapus file gambar fisik
            except Exception as e:
                print(f"Gagal menghapus file gambar {filepath}: {e}")
            
    # 2. Hapus data dari database
    db.execute("DELETE FROM konten WHERE id = ?", (id,))
    db.commit()
    
    # 3. Kembali ke halaman admin secara otomatis
    return redirect("/admin")

@app.route("/api/edit_konten/<int:id>", methods=["POST"])
@login_required # <-- Gembok proteksi admin
def edit_konten(id):

    if request.form.get('csrf_token') != session.get('csrf_token'):
        return "AKSES DITOLAK: Pemalsuan perintah (CSRF) terdeteksi!", 403
    if session.get('role') != 'admin':
        return "AKSES DITOLAK: Akun Non-Admin tidak diizinkan mengubah database!", 403
    kategori = request.form.get('kategori')
    judul = request.form.get('judul')
    isi = request.form.get('isi')
    file = request.files.get('foto')
    
    db = get_db()
    
    # Jika admin mengupload foto baru
    if file and file.filename != '':
        if allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            # Update seluruh data beserta nama foto baru
            db.execute("UPDATE konten SET kategori=?, judul=?, isi=?, foto=? WHERE id=?", 
                       (kategori, judul, isi, filename, id))
        else:
            return "DITOLAK: Ekstensi file tidak valid! Hanya diperbolehkan JPG, JPEG, atau PNG.", 400
    else:
        # Jika admin TIDAK mengupload foto baru (pertahankan foto lama)
        db.execute("UPDATE konten SET kategori=?, judul=?, isi=? WHERE id=?", 
                   (kategori, judul, isi, id))
        
    db.commit()
    return redirect(url_for('admin'))

@app.route("/test-bmkg")
def test_bmkg():
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        # Kita tembak 1 kecamatan saja (Namlea) untuk tes
        r = requests.get("https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=81.04.01.2001", headers=headers, timeout=10)
        
        # Jika sukses atau gagal, kita cetak status aslinya ke layar
        return f"<h1>Status BMKG: {r.status_code}</h1><p><b>Balasan dari BMKG:</b> {r.text[:500]}</p>"
        
    except Exception as e:
        print(f"Error internal BMKG API: {str(e)}") 

        return "<h1>Gagal Terhubung</h1><p>Maaf, layanan sedang gangguan. Silakan coba lagi nanti.</p>", 500

# HEADER KEAMANAN TAMBAHAN (ANTI CLICKJACKING)

@app.after_request
def add_security_headers(response):
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    
    # Melonggarkan CSP agar desain CSS (Bootstrap/Eksternal) dan Javascript bisa dimuat
    response.headers['Content-Security-Policy'] = "default-src * 'unsafe-inline' 'unsafe-eval'; img-src * data:;"
    return response

if __name__ == "__main__":
    app.run(debug=False, host='127.0.0.1', port=5000)