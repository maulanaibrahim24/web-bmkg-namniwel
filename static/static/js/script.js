"use strict";


window.dataCuacaGlobal = null;

function bersihkanTeks(str) {
    if (!str) return "-";
    return str.toString().replace(/[&<>'"]/g, function(tag) {
        const chars = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
        return chars[tag] || tag;
    });
}

function getIconCuaca(teksCuaca) {
    if (!teksCuaca || teksCuaca === "-") return "❓"; // Jika data kosong
    
    // Ubah ke huruf kecil semua agar mudah dideteksi
    const cuaca = teksCuaca.toLowerCase(); 

    if (cuaca.includes("petir") || cuaca.includes("kilat") || cuaca.includes("lebat")) return "⛈️";
    if (cuaca.includes("sedang")) return "🌧️";
    if (cuaca.includes("ringan") || cuaca.includes("lokal")) return "🌦️";
    if (cuaca.includes("tebal")) return "☁️";
    if (cuaca.includes("cerah berawan")) return "⛅";
    if (cuaca.includes("cerah")) return "☀️";
    if (cuaca.includes("berawan")) return "☁️";
    if (cuaca.includes("kabut") || cuaca.includes("kabur")) return "🌫️";
    
    return "🌤️"; // Logo default jika teks tidak dikenali
}

function formatWaktu(w) {
    if (!w || w.length < 10) return "-";
    return `${w.slice(6, 8)}/${w.slice(4, 6)} ${w.slice(8, 10)}:00`;
}

// ================== LOAD DATA PEGAWAI (Super Rapi & Sejajar) ==================
async function loadPegawai() {
    const el = document.getElementById("pegawaiList");
    if (!el) return;
    try {
        const r = await fetch("/pegawai");
        if (!r.ok) throw new Error("Gagal fetch data");
        const data = await r.json();
        
        let html = '<div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4 justify-content-center">';
        data.forEach(p => {
            const nama = bersihkanTeks(p.nama || "Tanpa Nama");
            const jabatan = bersihkanTeks(p.jabatan || "-");
            const email = bersihkanTeks(p.email || "-");
            
            let fotoPath = "/static/img/default_pegawai.png"; 
            if (p.foto) {
                fotoPath = p.foto.startsWith('http') ? p.foto : `/static/img/${p.foto}`;
            }

            const nipAman = bersihkanTeks(p.nip || "-");
            let htmlNip = "";
            if (nipAman !== "-" && nipAman.trim() !== "") {
                htmlNip = `<small class="text-muted d-block text-truncate fw-semibold" title="NIP: ${nipAman}">NIP. ${nipAman}</small>`;
            }
            // ------------------------------------

            html += `
                <div class="col">
                    <div class="card shadow-sm h-100 text-center p-4 border-0 rounded-4 d-flex flex-column align-items-center">
                        
                        <!-- 1. FOTO -->
                        <img src="${fotoPath}" alt="${nama}" class="rounded-circle mx-auto mb-3 border border-3 border-primary shadow-sm" style="width: 100px; height: 100px; object-fit: cover; flex-shrink: 0;">
                        
                        <!-- 2. NAMA (Dijamin selalu di tengah dan simetris) -->
                        <div class="flex-grow-1 d-flex flex-column justify-content-center w-100 px-2 mb-3">
                            <h5 class="card-title fw-bold text-dark mb-0 text-center" style="font-size: 1.05rem; line-height: 1.5; word-break: break-word;">
                                ${nama}
                            </h5>
                        </div>
                        
                        <!-- 3. JABATAN (Dengan garis abu di atasnya) -->
                        <div class="mt-auto w-100 pt-3 border-top border-secondary border-opacity-25 mb-2">
                            <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2 rounded-pill fw-bold text-wrap" style="font-size: 0.85rem; line-height: 1.4;">
                                ${jabatan}
                            </span>
                        </div>
                        
                        <!-- 4. BAWAH (NIP / Email kosong jika tidak ada) -->
                        <div class="w-100 text-center">
                            ${htmlNip}
                            ${email !== "-" ? `<small class="text-muted d-block text-truncate mt-1" title="Email: ${email}">${email}</small>` : ""}
                        </div>

                    </div>
                </div>`;
        });
        html += '</div>';
        el.innerHTML = html;
    } catch (e) {
        el.innerHTML = "<p class='text-danger text-center'>Gagal memuat data pegawai. Pastikan server Flask berjalan.</p>";
    }
}

function loadCuacaUtama() {
    const elHariIni = document.getElementById("cuacaHariIniContainer");
    const el7Hari = document.getElementById("cuaca7HariContainer");
    
    fetch("/api/cuaca_all")
        .then(r => r.json())
        .then(data => {
            window.dataCuacaGlobal = data;

            // 1. LOGIKA DETEKSI CUACA EKSTREM UNTUK LINTAS KECAMATAN (KOTAK UTAMA)
            let kecamatanEkstrem = [];
            let jenisHujan = "";

            for (const [nama, hariArray] of Object.entries(data)) {
                if (!Object.prototype.hasOwnProperty.call(data, nama)) continue;
                
                const cuacaHariIni = hariArray[0].cuaca.toLowerCase();
                if (cuacaHariIni.includes("petir") || cuacaHariIni.includes("kilat") || cuacaHariIni.includes("lebat") || cuacaHariIni.includes("sedang")) {
                    kecamatanEkstrem.push(`<strong>Kec. ${nama}</strong>`);
                    if (!jenisHujan) jenisHujan = hariArray[0].cuaca;
                }
            }

            let narasiHtml = "";
            const elKotakNarasi = document.getElementById("narasiHariIni");

            if (kecamatanEkstrem.length > 0) {
                if (elKotakNarasi) {
                    elKotakNarasi.parentElement.classList.remove("alert-primary");
                    elKotakNarasi.parentElement.classList.add("alert-warning");
                    elKotakNarasi.parentElement.querySelector("i").className = "bi bi-exclamation-triangle-fill fs-3 text-warning";
                }
                narasiHtml = `⚠️ <strong>PERINGATAN DINI CUACA LOKAL:</strong> Waspada potensi terjadinya kondisi <strong>${jenisHujan}</strong> pada hari ini di wilayah ${kecamatanEkstrem.join(", ")} serta area sekitarnya. Masyarakat dihimbau untuk tetap berhati-hati terhadap dampak penurunan jarak pandang dan jalanan licin.`;
            } else {
                if (elKotakNarasi) {
                    elKotakNarasi.parentElement.classList.remove("alert-warning");
                    elKotakNarasi.parentElement.classList.add("alert-primary");
                    elKotakNarasi.parentElement.querySelector("i").className = "bi bi-megaphone-fill fs-3 text-primary";
                }
                if (data["Namlea"]) {
                    const n = data["Namlea"][0];
                    narasiHtml = `Berdasarkan pantauan model sinoptik BMKG, kondisi cuaca di seluruh wilayah Kabupaten Buru pada hari ini secara umum terpantau aman dan kondusif, didominasi oleh indikasi <strong>${n.cuaca}</strong>. Untuk wilayah pusat kota (Namlea), rentang suhu udara berada di angka <strong>${n.suhu_min}°C - ${n.suhu_max}°C</strong> dengan tingkat kelembapan berkisar antara <strong>${n.rh_min}% - ${n.rh_max}%</strong>.`;
                }
            }

            if (elKotakNarasi) elKotakNarasi.innerHTML = narasiHtml;

            // 2. RENDER GRID HARI INI
            let htmlHariIni = '<div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">';
            
            // 3. RENDER AKORDEON 2 HARI KEDEPAN + NARASI LOKAL KECAMATAN
            let html7Hari = `<div class="accordion shadow-sm rounded-4" id="accordionCuaca7Hari">`;
            let idx = 0;

            for (const [nama, hariArray] of Object.entries(data)) {
                const hariIni = hariArray[0];
                const iconHariIni = getIconCuaca(hariIni.cuaca);

                // --- Kartu Hari Ini ---
                htmlHariIni += `
                    <div class="col">
                        <div class="card h-100 shadow-sm border-0 rounded-4 overflow-hidden bg-white">
                            <div class="card-header text-white text-center fw-bold py-3" style="background-color: #0B2447;">
                                Kec. ${nama}
                            </div>
                            <div class="card-body p-4 text-center">
                                <span class="fs-1 d-block mb-1">${iconHariIni}</span>
                                <h5 class="fw-bold text-dark mb-3">${hariIni.cuaca === "-" ? "N/A" : hariIni.cuaca}</h5>
                                
                                <div class="d-flex justify-content-center gap-2 mb-3 bg-light rounded-pill py-2 px-3 mx-auto" style="font-size: 0.85rem; max-width: 180px;">
                                    <span class="text-danger fw-bold"><i class="bi bi-arrow-up"></i> Max ${hariIni.suhu_max}°</span>
                                    <span class="text-muted">|</span>
                                    <span class="text-info fw-bold"><i class="bi bi-arrow-down"></i> Min ${hariIni.suhu_min}°</span>
                                </div>

                                <div class="text-start border-top pt-3 mt-2" style="font-size: 0.85rem; color: #4b5563;">
                                    <div class="mb-2 d-flex align-items-center">
                                        <i class="bi bi-droplet-fill text-primary me-2 fs-6"></i> 
                                        <span>Kelembapan (RH): <b>${hariIni.rh}%</b></span>
                                    </div>
                                    <div class="d-flex align-items-center">
                                        <i class="bi bi-wind text-success me-2 fs-6"></i> 
                                        <span>Kecepatan Angin: <b>${hariIni.angin} km/j</b></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;

                // --- Logika Pembuat Narasi Otomatis Per Kecamatan ---
                const besok = hariArray[1] || hariIni;
                const lusa = hariArray[2] || hariIni;
                
                let teksNarasiKecamatan = `Secara keseluruhan, wilayah <strong>Kecamatan ${nama}</strong> dalam dua hari ke depan diproyeksikan mengalami dinamika cuaca yang bervariasi. `;
                
                if (besok.cuaca.toLowerCase().includes("hujan") || lusa.cuaca.toLowerCase().includes("hujan")) {
                    teksNarasiKecamatan += `Masyarakat dihimbau mengantisipasi kondisi <strong>${besok.cuaca}</strong> yang berpotensi turun, terutama pada hari ${new Date(Date.now() + 86400000).toLocaleDateString('id-ID', {weekday: 'long'})}. Siapkan payung atau jas hujan bagi yang beraktivitas di luar ruangan.`;
                } else {
                    teksNarasiKecamatan += `Kondisi cuaca terpantau cukup bersahabat didominasi oleh langit <strong>${besok.cuaca}</strong> hingga <strong>${lusa.cuaca}</strong>. Sangat ideal untuk aktivitas luar ruangan maupun sektor transportasi logistik lokal.`;
                }
                teksNarasiKecamatan += ` Suhu udara rata-rata akan berkisar di angka <strong>${besok.suhu_min}°C</strong> hingga maksimal <strong>${besok.suhu_max}°C</strong>.`;

                // --- Desain Akordeon Baru (Membagi Kolom Kartu & Narasi) ---
                html7Hari += `
                <div class="accordion-item border-0 border-bottom">
                    <h2 class="accordion-header">
                        <button class="accordion-button ${idx === 0 ? '' : 'collapsed'} fw-bold text-dark" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${idx}" style="background-color: #f8f9fa;">
                            Kecamatan ${nama}
                        </button>
                    </h2>
                    <div id="collapse${idx}" class="accordion-collapse collapse ${idx === 0 ? 'show' : ''}" data-bs-parent="#accordionCuaca7Hari">
                        <div class="accordion-body p-4">
                            <div class="row align-items-center g-4">
                                
                                <div class="col-xl-5 col-lg-6">
                                    <div class="d-flex overflow-auto pb-2 gap-3" style="scrollbar-width: thin;">`;
                
                for(let i = 1; i < Math.min(8, hariArray.length); i++) {
                    const h = hariArray[i];
                    const tgl = new Date();
                    tgl.setDate(tgl.getDate() + i);
                    const namaHari = tgl.toLocaleDateString('id-ID', {weekday: 'long'});
                    const tglAngka = tgl.toLocaleDateString('id-ID', {day: '2-digit', month: 'short'});

                    html7Hari += `
                                        <div class="card border border-primary border-opacity-25 shadow-sm flex-shrink-0 text-center bg-white" style="width: 155px; border-radius: 14px;">
                                            <div class="card-header bg-gradient text-white py-2" style="font-size: 0.85rem; background-color: #004a8f;">
                                                <strong>${namaHari}</strong><br><small class="opacity-75">${tglAngka}</small>
                                            </div>
                                            <div class="card-body p-3">
                                                <span class="fs-2 d-block mb-1">${getIconCuaca(h.cuaca)}</span>
                                                <small class="d-block text-dark fw-bold mb-3" style="font-size: 0.78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${h.cuaca}">${h.cuaca}</small>
                                                
                                                <div class="d-flex justify-content-center gap-2 mb-3 bg-light rounded-pill py-1 px-2" style="font-size: 0.8rem;">
                                                    <span class="text-danger fw-bold"><i class="bi bi-arrow-up"></i>${h.suhu_max}°</span>
                                                    <span class="text-muted">|</span>
                                                    <span class="text-info fw-bold"><i class="bi bi-arrow-down"></i>${h.suhu_min}°</span>
                                                </div>

                                                <div class="text-start border-top pt-2" style="font-size: 0.75rem; color: #555;">
                                                    <div class="mb-1"><i class="bi bi-droplet text-primary me-1"></i> RH: <b>${h.rh}%</b></div>
                                                    <div><i class="bi bi-wind text-success me-1"></i> Angin: <b>${h.angin} km/j</b></div>
                                                </div>
                                            </div>
                                        </div>`;
                }

                html7Hari += `
                                    </div>
                                </div>

                                <div class="col-xl-7 col-lg-6">
                                    <div class="p-4 rounded-4 border-start border-primary border-4 shadow-sm" style="background-color: #f0f7ff;">
                                        <h6 class="fw-bold text-primary mb-2"><i class="bi bi-journal-text me-2"></i>Analisis & Tinjauan Cuaca</h6>
                                        <p class="text-secondary mb-0" style="font-size: 0.95rem; line-height: 1.6; text-align: justify;">
                                            ${teksNarasiKecamatan}
                                        </p>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>`;
                idx++;
            }
            
            htmlHariIni += '</div>';
            html7Hari += '</div>';

            if (elHariIni) elHariIni.innerHTML = htmlHariIni;
            if (el7Hari) el7Hari.innerHTML = html7Hari;

            if (data["Namlea"]) {
                const n = data["Namlea"][0];
                if (document.getElementById("cuacaSekarang")) document.getElementById("cuacaSekarang").innerText = n.cuaca !== "-" ? n.cuaca : "Belum Tersedia";
                if (document.getElementById("suhu")) document.getElementById("suhu").innerText = n.cuaca !== "-" ? `${n.suhu} °C` : "--";
                if (document.getElementById("rh")) document.getElementById("rh").innerText = n.cuaca !== "-" ? `${n.rh} %` : "--";
            }
        })
            .catch(e => {});
}

// GEMPA 
// ================== GEMPA (Tampilan Alert & Urgensi) ==================
function loadGempa() {
    fetch("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json")
        .then(r => r.json())
        .then(d => {
            let g = d.Infogempa.gempa;
            
            // Sanitasi data dari API BMKG agar aman dari XSS
            const wilayahAman = bersihkanTeks(g.Wilayah);
            const potensiAman = bersihkanTeks(g.Potensi);
            const magAman = bersihkanTeks(g.Magnitude);
            const tglAman = bersihkanTeks(g.Tanggal);
            const jamAman = bersihkanTeks(g.Jam);

            // Update teks singkat di header/sidebar jika ada
            if (document.getElementById("gempaSingkat")) {
                document.getElementById("gempaSingkat").innerText = `${magAman} SR | ${wilayahAman}`;
            }

            if (document.getElementById("gempaData")) {
                document.getElementById("gempaData").innerHTML = `
                    <div class="p-2">
                        <div class="d-flex align-items-center border-bottom border-danger border-opacity-25 pb-3 mb-4">
                            <div class="bg-danger text-white rounded-3 d-flex align-items-center justify-content-center me-3 shadow-sm pulse-animation" style="width: 45px; height: 45px;">
                                <i class="bi bi-exclamation-triangle-fill fs-4"></i>
                            </div>
                            <div>
                                <h4 class="fw-bold mb-0 text-danger" style="letter-spacing: -0.5px;">Gempabumi Terkini</h4>
                                <small class="text-muted fw-bold text-uppercase" style="font-size: 0.7rem;">⚠️ Sumber Resmi TEWS BMKG</small>
                            </div>
                        </div>

                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <div class="p-4 rounded-4 h-100 border border-danger border-opacity-25" style="background-color: #fff5f5;">
                                    <small class="text-danger text-uppercase fw-bold" style="letter-spacing: 1px; font-size: 0.75rem;">Magnitudo</small>
                                    <div class="display-5 fw-800 text-danger mt-1">${magAman} <span class="fs-5 text-dark fw-normal">SR</span></div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="p-4 bg-light rounded-4 h-100 border border-secondary border-opacity-10">
                                    <small class="text-muted text-uppercase fw-bold" style="letter-spacing: 1px; font-size: 0.75rem;">Waktu Kejadian</small>
                                    <div class="fs-5 fw-bold text-dark mt-2">${tglAman}</div>
                                    <div class="text-muted fw-semibold"><i class="bi bi-clock me-1"></i> ${jamAman}</div>
                                </div>
                            </div>
                        </div>

                        <div class="p-4 bg-light rounded-4 mb-3 border-start border-danger border-5 shadow-sm">
                            <small class="text-muted text-uppercase fw-bold" style="letter-spacing: 1px; font-size: 0.75rem;">Lokasi / Wilayah</small>
                            <div class="fs-5 fw-bold text-dark mt-2" style="line-height: 1.5;">${wilayahAman}</div>
                        </div>

                        <div class="p-4 rounded-4 border border-danger border-opacity-25" style="background: #fff8f8;">
                            <small class="text-danger text-uppercase fw-bold" style="letter-spacing: 1px; font-size: 0.75rem;">Status Potensi</small>
                            <div class="fs-6 text-dark mt-2 fw-bold italic">
                                <i class="bi bi-info-circle-fill me-2 text-danger"></i>${potensiAman}
                            </div>
                        </div>
                    </div>
                `;
            }
        })
        .catch(e => {});
}
// = NAVIGASI SPA 
function showPage(id) {

    document.querySelectorAll(".konten").forEach(c => c.classList.remove("aktif"));

    const target = document.getElementById(id);
    if (target) target.classList.add("aktif");

    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("active");
    });


    let btnTarget = document.getElementById("btn-" + id);
    
    // PERBAIKAN: Jika yang diklik adalah submenu dropdown, aktifkan menu utama "Profil"
    if (!btnTarget && (id === 'tentang-bmkg' || id === 'stasiun' || id === 'profil-pegawai')) {
        btnTarget = document.getElementById("btn-profil-main");
    }
    // Logika tombol aktif untuk Dropdown Cuaca
    if (!btnTarget && (id === 'cuaca-hari-ini' || id === 'cuaca-kedepan')) {
        btnTarget = document.getElementById("btn-cuaca-main");
    }
    
    if (btnTarget) {
        btnTarget.classList.add("active");
    }

    // 4. Jalankan fungsi tambahan jika diperlukan
    if (id === "profil-pegawai") loadPegawai(); // PERBAIKAN: Berubah jadi profil-pegawai
    if (id === "gempa") loadGempa();
    if (id === "beranda" && window.map) {
        setTimeout(() => window.map.invalidateSize(), 300);
    }
}

// ================== INITIALIZATION & MAP SETUP ==================
document.addEventListener("DOMContentLoaded", function() {
    
// 1. Fungsi Jam Realtime (Terpisah Tanggal & Jam)
    function updateJam() {
        const elTanggal = document.getElementById("tanggalHari");
        const elWIT = document.getElementById("jamWIT");
        const elUTC = document.getElementById("jamUTC");
        const sekarang = new Date();

        // Format khusus untuk Tanggal (Contoh: Jumat, 15 Mei 2026)
        if (elTanggal) {
            elTanggal.innerText = sekarang.toLocaleString("id-ID", { 
                timeZone: 'Asia/Jayapura', 
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            });
        }

        // Format khusus untuk Jam WIT (Contoh: 17:46:50 WIT)
        if (elWIT) {
            let jamLokal = sekarang.toLocaleString("id-ID", { 
                timeZone: 'Asia/Jayapura', 
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            }).replace(/\./g, ':'); // Mengubah titik jadi titik dua agar lebih standar
            elWIT.innerText = jamLokal + " WIT";
        }

        // Format khusus untuk Jam UTC (Contoh: 08:46:50 UTC)
        if (elUTC) {
            let jamGlobal = sekarang.toLocaleString("id-ID", { 
                timeZone: 'UTC', 
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            }).replace(/\./g, ':');
            elUTC.innerText = jamGlobal + " UTC";
        }
    }

    // Panggil fungsi jam langsung di awal
    updateJam(); 
    // Putar fungsi jam setiap 1 detik
    setInterval(updateJam, 1000);

    // 2. Load Data Awal
    loadGempa();
    loadCuacaUtama();

    // 3. Setup Peta (Leaflet)
    const mapContainer = document.getElementById("map");
    if (mapContainer) {
        const bounds = [[-4.5, 125.0], [-2.5, 128.5]];

        // Deteksi otomatis: Jika dibuka di HP (lebar layar < 768px), zoom jadi 8 agar pulau kelihatan penuh
        const levelZoom = window.innerWidth < 768 ? 8 : 9;

        window.map = L.map("map", {
            center: [-3.45, 126.55], 
            zoom: levelZoom,
            
            // --- PENGATURAN BATAS ZOOM ---
            minZoom: 8, 
            maxZoom: 12, 
            maxBounds: bounds, 
            maxBoundsViscosity: 1.0,

            zoomControl: true,       
            scrollWheelZoom: true,  
            dragging: true,           
            touchZoom: true,       
            doubleClickZoom: true,  
            
            boxZoom: false,            
            keyboard: false
        });

        L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
            attribution: "Tiles © Esri", 
            noWrap: true
        }).addTo(window.map);

        // KOORDINAT YANG SUDAH DIPERBAIKI (Tersebar merata)
        const kecamatanBuru = [
            // Sisi Timur Laut (Area Padat)
            {nama:"Namlea", lat:-3.2444, lon:127.0872},
            {nama:"Lilialy", lat:-3.2100, lon:127.0300},
            
            // Sisi Utara & Barat Laut
            {nama:"Waplau", lat:-3.1256, lon:126.6567},
            {nama:"Air Buaya", lat:-3.2325, lon:126.1367},
            
            // Sisi Tengah & Barat Daya (Pedalaman & Danau Rana)
            {nama:"Fena Leisela", lat:-3.4500, lon:126.3500},
            {nama:"Lolong Guba", lat:-3.4211, lon:126.7022},
            
            // Sisi Tengah ke Timur
            {nama:"Waelata", lat:-3.3211, lon:126.8522},
            {nama:"Waeapo", lat:-3.3762, lon:127.0275},
            
            // Sisi Tenggara & Teluk
            {nama:"Teluk Kaiely", lat:-3.3600, lon:127.1100},
            {nama:"Batabual", lat:-3.5356, lon:127.2056}
        ];

        let timerTutupPopup;

        kecamatanBuru.forEach(k => {
            let marker = L.marker([k.lat, k.lon]).addTo(window.map);

            marker.bindPopup("⏳ Menunggu data...", { 
                closeButton: false, 
                autoPan: true, 
                autoPanPadding: [50, 50], // Diperbesar agar jarak saat auto-pan lebih lega
                className: 'custom-popup-cuaca'
            });

            marker.on("mouseover", function() {
                clearTimeout(timerTutupPopup); 

                // KUNCI PERBAIKAN: Jika popup sudah terbuka, hentikan fungsi agar tidak nge-glitch
                if (marker.isPopupOpen()) return; 

                if (!window.dataCuacaGlobal || !window.dataCuacaGlobal[k.nama]) {
                    marker.setPopupContent("⏳ Menunggu data...");
                    marker.openPopup();
                    return;
                }

                const hariIni = window.dataCuacaGlobal[k.nama][0]; 
                const tempDisplay = bersihkanTeks(hariIni.suhu === "-" ? "--" : hariIni.suhu);
                const rhDisplay = bersihkanTeks(hariIni.rh === "-" ? "--" : hariIni.rh);
                const anginDisplay = bersihkanTeks(hariIni.angin === "-" ? "--" : hariIni.angin);
                const namaKecAman = bersihkanTeks(k.nama);

                // 2. Gunakan namaKecAman pada bagian tooltip-header
                let isiTooltip = `
                    <div class="tooltip-pro" style="min-width: 140px;">
                        <div class="tooltip-header" style="font-weight:bold; color:#004a8f; font-size:14px;">Kec. ${namaKecAman}</div>
                        <div class="tooltip-status" style="font-size:10px; background:#e1effe; color:#004a8f; padding:2px 6px; border-radius:8px; margin:5px 0; display:inline-block;">HARI INI</div>
                        <div class="tooltip-main" style="margin:8px 0;">
                            <span style="font-size:24px; vertical-align:middle;">🌤️</span>
                            <span style="font-size:22px; font-weight:bold; color:#333; margin-left:5px; vertical-align:middle;">${tempDisplay}°C</span>
                        </div>
                        <div class="tooltip-footer" style="font-size:11px; color:#555; border-top:1px solid #eee; padding-top:6px; text-align:left;">
                            💧 RH: <b>${rhDisplay}%</b><br>
                            💨 Angin: <b>${anginDisplay} km/j</b>
                        </div>
                    </div>
                `;
                
                marker.setPopupContent(isiTooltip);
                marker.openPopup();
            });
            marker.on("mouseout", function() {

                timerTutupPopup = setTimeout(() => {
                    marker.closePopup();
                }, 1200); 
            });
        });

        window.map.on('popupopen', function(e) {
            let nodePopup = e.popup.getElement();
            if (nodePopup) {
                nodePopup.addEventListener('mouseenter', () => clearTimeout(timerTutupPopup));
                nodePopup.addEventListener('mouseleave', () => {
                    // Diperpanjang ke 1200ms agar konsisten
                    timerTutupPopup = setTimeout(() => window.map.closePopup(e.popup), 1200);
                });
            }
        });
    }
});
