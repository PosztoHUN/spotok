// ===== Firebase konfiguráció =====
firebase.initializeApp({
  apiKey: "AIzaSyBZ5Y9lEDEAIekj-gida0NfsBw_dpOgBVI",
  authDomain: "spotok-1b5e6.firebaseapp.com",
  databaseURL: "https://spotok-1b5e6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "spotok-1b5e6",
  storageBucket: "spotok-1b5e6.firebasestorage.app",
  messagingSenderId: "985168750789",
  appId: "1:985168750789:web:b232cab94c4d8cbfa228ac",
  measurementId: "G-567WP2X205"
});
const db = firebase.database();

// ===== Nézetváltás =====
function mutat(mit) {
    ["kezdo","bongeszes","feltoltes"].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = (id===mit?"block":"none");
    });
    if(mit==="bongeszes"){ feltoltSzurok(); listazas(); }
}
function vissza(){ mutat("kezdo"); }

// ===== Spot mentése =====
function spotMentese() {
    const getVal = id => document.getElementById(id)?.value.trim() || "";
    const spot = {
        orszag: getVal("orszag"),
        varos: getVal("varos"),
        eszkoz: getVal("eszkoz"),
        vonalak: getVal("vonalak"),
        helyszin: getVal("helyszin"),
        leiras: getVal("leiras"),
        evszak: getVal("evszak"),
        idopont: getVal("idopont"),
        datum: new Date().toISOString().split("T")[0],
        torlesKerve: false
    };
    if(!spot.orszag || !spot.varos || !spot.eszkoz || !spot.evszak || !spot.idopont){
        alert("Kérlek töltsd ki az országot, várost, eszközt, évszakot és időpontot!"); return;
    }
    db.ref("spotok").push().set(spot).then(()=>{
        alert("Spot elmentve!");
        ["orszag","varos","eszkoz","vonalak","helyszin","leiras","evszak","idopont"].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=""; });
        feltoltSzurok(); listazas();
    });
}

// ===== Szűrők feltöltése =====
function feltoltSzurok() {
    db.ref("spotok").once("value").then(snapshot=>{
        const spotok = snapshot.val()?Object.values(snapshot.val()):[];
        const fill = (id,data)=>{ const el=document.getElementById(id); if(!el) return; const akt=el.value; const egyedi=[...new Set(data.filter(a=>a&&a.trim()!==""))]; el.innerHTML='<option value="">Összes</option>'; egyedi.forEach(a=>{ const opt=document.createElement("option"); opt.value=a; opt.textContent=a; el.appendChild(opt); }); if(akt && egyedi.includes(akt)) el.value=akt; };
        fill("szuroOrszag",spotok.map(s=>s.orszag));
        fill("szuroVaros",spotok.map(s=>s.varos));
        fill("szuroEszkoz",spotok.map(s=>s.eszkoz));
        const szuroVonal = document.getElementById("szuroVonal");
        if(szuroVonal){
            let vonalak = spotok.flatMap(s=>s.vonalak?s.vonalak.split(",").map(v=>v.trim()):[]);
            const kivValos=document.getElementById("szuroVaros")?.value;
            const kivEszkoz=document.getElementById("szuroEszkoz")?.value;
            if(kivValos||kivEszkoz){
                vonalak = spotok.filter(s=>(!kivValos||s.varos===kivValos)&&(!kivEszkoz||s.eszkoz===kivEszkoz)).flatMap(s=>s.vonalak?s.vonalak.split(",").map(v=>v.trim()):[]);
            }
            fill("szuroVonal",vonalak);
        }
    });
}

// ===== Lista / szűrés =====
async function listazas() {
    const snapshot = await db.ref("spotok").once("value");
    const spotok = snapshot.val()?Object.entries(snapshot.val()).map(([id,s])=>({id,...s})):[];

    const getVal = id=>document.getElementById(id)?.value||"";
    const o=getVal("szuroOrszag"), v=getVal("szuroVaros"), e=getVal("szuroEszkoz"), vonalSzuro=getVal("szuroVonal");

    const lista=document.getElementById("lista");
    if(!lista) return;
    lista.innerHTML="";

    const szurt = spotok.filter(s=>{
        if(o && s.orszag!==o) return false;
        if(v && s.varos!==v) return false;
        if(e && s.eszkoz!==e) return false;
        if(vonalSzuro){ const tomb=s.vonalak?s.vonalak.split(",").map(x=>x.trim()):[]; if(!tomb.includes(vonalSzuro)) return false; }
        return true;
    });

    if(szurt.length===0){ lista.innerHTML="<p>Nincs találat.</p>"; return; }

    szurt.forEach(s=>{
        const div=document.createElement("div");
        div.className="card "+(s.torlesKerve?"torles-kerve":"");
        div.innerHTML=`
            <strong>${s.varos}</strong><br>
            <strong>Eszköz:</strong> ${s.eszkoz}<br>
            <strong>Vonal(ak):</strong> ${s.vonalak||"N/A"}<br>
            <strong>Évszak:</strong> ${s.evszak||"—"}<br>
            <strong>Időpont:</strong> ${s.idopont||"—"}<br>
            <strong>Helyszín:</strong> ${s.helyszin||"N/A"}<br>
            <p>${s.leiras}</p>
            <button onclick="torlesKerese('${s.id}',this)">Törlés kérése</button>
            <button onclick="torlesElutasitasa('${s.id}')">Törlés elutasítása</button>
            <button onclick="veglegesTorles('${s.id}')">Törlés</button>
        `;
        lista.appendChild(div);
    });
}

// ===== Törlés gombok =====
function torlesKerese(id,btn){
    if(btn){ btn.style.color="red"; btn.textContent="Törlés kérve!"; btn.disabled=true; const elutasitBtn=document.createElement("button"); elutasitBtn.textContent="Elutasítva"; elutasitBtn.style.marginLeft="10px"; elutasitBtn.onclick=()=>torlesElutasitasa(id,elutasitBtn); btn.parentNode.appendChild(elutasitBtn); }
    db.ref("spotok/"+id).update({torlesKerve:true}).then(listazas);
}
function torlesElutasitasa(id,btn){
    const jelszo=prompt("Add meg a jelszót:");
    if(jelszo!=="BPO561"){ alert("Hibás jelszó!"); return; }
    db.ref("spotok/"+id).update({torlesKerve:false}).then(listazas);
}
function veglegesTorles(id){
    const jelszo=prompt("Add meg a jelszót a törléshez:");
    if(jelszo!=="BPO561"){ alert("Hibás jelszó!"); return; }
    if(!confirm("Biztosan törlöd ezt a bejegyzést?")) return;
    db.ref("spotok/"+id).remove().then(listazas);
}
