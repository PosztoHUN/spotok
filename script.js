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
    document.getElementById("kezdo").style.display = "none";
    document.getElementById("bongeszes").style.display = "none";
    document.getElementById("feltoltes").style.display = "none";

    document.getElementById(mit).style.display = "block";

    if (mit === "bongeszes") {
        feltoltSzurok();
        listazas();
    }
}

function vissza() {
    document.getElementById("bongeszes").style.display = "none";
    document.getElementById("feltoltes").style.display = "none";
    document.getElementById("kezdo").style.display = "grid";
}

// ===== ÚJ SPOT MENTÉSE =====
function spotMentese() {
    const spot = {
        orszag: document.getElementById("orszag").value,
        varos: document.getElementById("varos").value,
        eszkoz: document.getElementById("eszkoz").value,
        vonalak: document.getElementById("vonalak").value,
        helyszin: document.getElementById("helyszin").value,
        leiras: document.getElementById("leiras").value,
        datum: new Date().toISOString().split("T")[0]
    };

    const newSpotRef = db.ref("spotok").push();
    newSpotRef.set(spot).then(() => {
        alert("Spot elmentve!");
        feltoltSzurok();
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
        div.innerHTML = `
            <strong>${s.varos}</strong><br>
            <strong>Eszköz:</strong> ${s.eszkoz}<br>
            <strong>Vonal(ak):</strong> ${s.vonalak || "N/A"}<br>
            <strong>Helyszín:</strong> ${s.helyszin || "N/A"}<br>
            <p>${s.leiras}</p>
        `;
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

// ===== Eseményfigyelők, hogy a vonal szűrő frissüljön =====
document.getElementById("szuroVaros").addEventListener("change", feltoltSzurok);
document.getElementById("szuroEszkoz").addEventListener("change", feltoltSzurok);



