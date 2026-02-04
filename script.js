// ===== Firebase konfiguráció =====
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// Cseréld le a saját Firebase configodra!
const firebaseConfig = {
  apiKey: "AIzaSyBZ5Y9lEDEAIekj-gida0NfsBw_dpOgBVI",
  authDomain: "spotok-1b5e6.firebaseapp.com",
  databaseURL: "https://spotok-1b5e6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "spotok-1b5e6",
  storageBucket: "spotok-1b5e6.firebasestorage.app",
  messagingSenderId: "985168750789",
  appId: "1:985168750789:web:b232cab94c4d8cbfa228ac",
  measurementId: "G-567WP2X205"
};

// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ===== Nézetváltás =====
function mutat(mit) {
    ["kezdo", "bongeszes", "uj-feltoltes"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === mit ? "block" : "none");
    });
}

function vissza() {
    mutat("kezdo");
}

function vissza() {
    const panelok = ["kezdo", "bongeszes", "uj-feltoltes"];
    panelok.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = (id==="kezdo" ? "grid" : "none");
    });
}


// ===== ÚJ SPOT MENTÉSE =====
function spotMentese(feltoltesPanel = false) {
    const prefix = feltoltesPanel ? "feltolt_" : "";

    // Több évszak összegyűjtése
    const evszakElems = document.querySelectorAll("." + prefix + "evszak:checked");
    const evszakok = Array.from(evszakElems).map(e => e.value);

    const spot = {
        orszag: document.getElementById(prefix + "orszag").value.trim(),
        varos: document.getElementById(prefix + "varos").value.trim(),
        eszkoz: document.getElementById(prefix + "eszkoz").value.trim(),
        vonalak: document.getElementById(prefix + "vonalak").value.trim(),
        helyszin: document.getElementById(prefix + "helyszin").value.trim(),
        leiras: document.getElementById(prefix + "leiras").value.trim(),
        evszak: evszakok.join(","), // több évszak
        idopont: document.getElementById(prefix + "idopont").value,
        datum: new Date().toISOString().split("T")[0],
        torlesKerve: false
    };

    if (!spot.orszag || !spot.varos || !spot.eszkoz || evszakok.length === 0 || !spot.idopont) {
        alert("Kérlek töltsd ki az országot, várost, eszközt, legalább egy évszakot és időpontot!");
        return;
    }

    // Firebase mentés
    const newSpotRef = db.ref("spotok").push(); // új kulcs
    newSpotRef.set(spot)
        .then(() => {
            alert("Spot elmentve!");

            // mezők törlése
            Object.keys(spot).forEach(k => {
                const elem = document.getElementById(prefix + k);
                if (elem) elem.value = "";
            });

            // checkbox-ok törlése
            evszakElems.forEach(e => e.checked = false);

            // frissítjük a szűrőket és listát
            feltoltSzurok();
            listazas();
        })
        .catch(err => {
            console.error("Hiba a mentésnél:", err);
            alert("Hiba történt a mentés során!");
        });
}

// ===== SZŰRŐK FELTÖLTÉSE =====
function feltoltSzurok() {
    db.ref("spotok").once("value").then(snapshot => {
        const spotok = snapshot.val() ? Object.values(snapshot.val()) : [];

        feltoltSelect(document.getElementById("szuroOrszag"), spotok.map(s => s.orszag));
        feltoltSelect(document.getElementById("szuroVaros"), spotok.map(s => s.varos));
        feltoltSelect(document.getElementById("szuroEszkoz"), spotok.map(s => s.eszkoz));

        const szuroVonal = document.getElementById("szuroVonal");

        // Mindig töltsük fel a vonalakat
        const vonalakOsszes = [];
        spotok.forEach(s => {
            if (s.vonalak) s.vonalak.split(",").forEach(v => vonalakOsszes.push(v.trim()));
        });

        // Ha van város vagy eszköz kiválasztva, szűrjük a vonalakat
        const kivValos = document.getElementById("szuroVaros").value;
        const kivEszkoz = document.getElementById("szuroEszkoz").value;
        let szurtVonalak = vonalakOsszes;

        if (kivValos || kivEszkoz) {
            szurtVonalak = spotok
                .filter(s => (!kivValos || s.varos === kivValos) && (!kivEszkoz || s.eszkoz === kivEszkoz))
                .flatMap(s => s.vonalak ? s.vonalak.split(",").map(v => v.trim()) : []);
        }

        feltoltSelect(szuroVonal, szurtVonalak);
    });
}

// ===== Segédfüggvény select feltöltéséhez érték megőrzéssel =====
function feltoltSelect(select, adatok) {
    if (!select) return;

    // Jegyezzük meg a kiválasztott értéket
    const aktVal = select.value;

    const egyedi = [...new Set(adatok.filter(a => a && a.trim() !== ""))];
    select.innerHTML = `<option value="">Összes</option>`;
    egyedi.forEach(a => {
        const opt = document.createElement("option");
        opt.value = a;
        opt.textContent = a;
        select.appendChild(opt);
    });

    // Visszaállítjuk az előzőleg kiválasztott értéket, ha még benne van
    if (aktVal && egyedi.includes(aktVal)) {
        select.value = aktVal;
    }
}


// ===== LISTÁZÁS / SZŰRÉS =====
async function listazas() {
    const snapshot = await db.ref("spotok").once("value");
    const spotok = snapshot.val()
        ? Object.entries(snapshot.val()).map(([id, s]) => ({ id, ...s }))
        : [];

    const o = document.getElementById("szuroOrszag").value;
    const v = document.getElementById("szuroVaros").value;
    const e = document.getElementById("szuroEszkoz").value;
    const vonalSzuro = document.getElementById("szuroVonal").value;

    const lista = document.getElementById("lista");
    lista.innerHTML = "";

    const szurt = spotok.filter(s => {
        if (o && s.orszag !== o) return false;
        if (v && s.varos !== v) return false;
        if (e && s.eszkoz !== e) return false;
        if (vonalSzuro) {
            const tomb = s.vonalak
                ? s.vonalak.split(",").map(x => x.trim())
                : [];
            if (!tomb.includes(vonalSzuro)) return false;
        }
        return true;
    });

    if (szurt.length === 0) {
        lista.innerHTML = "<p>Nincs találat.</p>";
        return;
    }

    szurt.forEach(s => {
        const div = document.createElement("div");
        div.className = "card";
        if (s.torlesKerve) div.classList.add("torles-kerve");

        div.innerHTML = `
            <strong>${s.varos}</strong><br>
            <strong>Eszköz:</strong> ${s.eszkoz}<br>
            <strong>Vonal(ak):</strong> ${s.vonalak || "N/A"}<br>
            <strong>Helyszín:</strong> ${s.helyszin || "N/A"}<br>
            <strong>Évszak:</strong> ${s.evszak || "—"}<br>
            <strong>A fent írt évszakban ekkor biztos jó:</strong> ${s.idopont || "—"}<br>
            <strong>Leírás:</strong><p>${s.leiras}</p>

            <button onclick="torlesKerese('${s.id}')">
                Törlés kérése
            </button>

            <button onclick="torlesElutasitasa('${s.id}')">
                Törlés elutasítása
            </button>

            <button onclick="veglegesTorles('${s.id}')">
                Törlés
            </button>`;
        lista.appendChild(div);
    });
}

// ===== Törlés kérése funkció =====
function torlesKerese(id, btn) {
    // Szöveg pirosra
    btn.style.color = "red";
    btn.textContent = "Törlés kérve!";

    // Új "Elutasítva" gomb létrehozása
    const elutasitBtn = document.createElement("button");
    elutasitBtn.textContent = "Elutasítva";
    elutasitBtn.style.marginLeft = "10px";
    elutasitBtn.onclick = () => elutasitas(id, elutasitBtn);

    btn.parentNode.appendChild(elutasitBtn);

    // A törlés kérése gomb már nem nyomható
    btn.disabled = true;
}

// ===== Elutasítás funkció jelszóval =====
function elutasitas(id, btn) {
    const jelszo = "admin123"; // saját jelszó
    const beirt = prompt("Add meg a jelszót az elutasításhoz:");
    if (beirt !== jelszo) {
        alert("Hibás jelszó!");
        return;
    }

    // Spot törlése az adatbázisból
    remove(ref(db, "spotok/" + id)).then(() => {
        listazas();
    });
}

// ===== Segédfüggvény select feltöltéséhez =====
function feltoltSelect(select, adatok) {
    if (!select) return;
    const egyedi = [...new Set(adatok.filter(a => a && a.trim() !== ""))];
    select.innerHTML = `<option value="">Összes</option>`;
    egyedi.forEach(a => {
        const opt = document.createElement("option");
        opt.value = a;
        opt.textContent = a;
        select.appendChild(opt);
    });
}

function torlesKerese(id) {
    db.ref("spotok/" + id).update({
        torlesKerve: true
    }).then(listazas);
}
function torlesElutasitasa(id) {
    const jelszo = prompt("Add meg a jelszót:");

    if (jelszo !== "BPO561") {
        alert("Hibás jelszó!");
        return;
    }

    db.ref("spotok/" + id).update({
        torlesKerve: false
    }).then(listazas);
}
function veglegesTorles(id) {
    const jelszo = prompt("Add meg a jelszót a törléshez:");

    if (jelszo !== "BPO561") {
        alert("Hibás jelszó!");
        return;
    }

    if (!confirm("Biztosan törlöd ezt a bejegyzést?")) return;

    db.ref("spotok/" + id).remove()
        .then(listazas);
}


// ===== Eseményfigyelők, hogy a vonal szűrő frissüljön =====
// document.getElementById("szuroVaros").addEventListener("change", feltoltSzurok);
// document.getElementById("szuroEszkoz").addEventListener("change", feltoltSzurok);



