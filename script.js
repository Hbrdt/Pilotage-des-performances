// --- GESTION DES ONGLETS ---
function switchTab(evt, tabId) {
    let i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) { tabcontent[i].classList.remove("active"); }
    tablinks = document.getElementsByClassName("tab-link");
    for (i = 0; i < tablinks.length; i++) { tablinks[i].classList.remove("active"); }
    document.getElementById(tabId).classList.add("active");
    evt.currentTarget.classList.add("active");
    if(tabId === 'tab-simulation' || tabId === 'tab-bilan') { runAll('tab_switch'); }
}

let chartPrixInstance = null, chartEvolInstance = null, chartSimuInstance = null;
let prixOptimal = "0.00 €", margeMax = "0.00 €";

// --- SYNCHRONISATION DES VARIABLES ---
function runAll(sourceId) {
    if (sourceId === 'pv_ht') { let v = document.getElementById('pv_ht').value; document.getElementById('v_p0').value = v; document.getElementById('sim_p0').value = v; }
    else if (sourceId === 'v_p0') { let v = document.getElementById('v_p0').value; document.getElementById('pv_ht').value = v; document.getElementById('sim_p0').value = v; }
    else if (sourceId === 'sim_p0') { let v = document.getElementById('sim_p0').value; document.getElementById('pv_ht').value = v; document.getElementById('v_p0').value = v; }

    if (sourceId === 'q_total') { let v = document.getElementById('q_total').value; document.getElementById('v_q0').value = v; document.getElementById('sim_q0').value = v; }
    else if (sourceId === 'v_q0') { let v = document.getElementById('v_q0').value; document.getElementById('q_total').value = v; document.getElementById('sim_q0').value = v; }
    else if (sourceId === 'sim_q0') { let v = document.getElementById('sim_q0').value; document.getElementById('q_total').value = v; document.getElementById('v_q0').value = v; }

    calculGlobal(); 
    calculSimulation(); 
    updateBilan();
}

// --- UTILITAIRE BILAN COMPTABLE ---
function val(id) {
    let v = parseFloat(document.getElementById(id).value);
    return isNaN(v) ? 0 : v;
}

function calculerBilan() {
    let actifImm = val('a_incorporel') + val('a_corporel') + val('a_financier');
    let actifCirc = val('a_stocks') + val('a_creances') + val('a_treso');
    let totalActif = actifImm + actifCirc;

    let capPropres = val('p_capital') + val('p_reserves') + val('p_resultat');
    let dettes = val('p_emprunts') + val('p_fournisseurs') + val('p_etat');
    let totalPassif = capPropres + dettes;

    document.getElementById('total_actif').innerText = totalActif.toFixed(2) + " €";
    document.getElementById('total_passif').innerText = totalPassif.toFixed(2) + " €";

    let ecart = totalActif - totalPassif;
    let alertBox = document.getElementById('bilan_alert');
    
    if (ecart === 0) {
        alertBox.className = "balance-alert balance-ok";
        alertBox.innerText = "✅ Bilan Équilibré (Actif = Passif)";
    } else {
        alertBox.className = "balance-alert balance-ko";
        alertBox.innerText = "❌ Bilan Déséquilibré ! Écart de : " + Math.abs(ecart).toFixed(2) + " €";
    }
}

// --- CALCULS GLOBAUX ---
function calculGlobal() {
    let pCat = parseFloat(document.getElementById('p_catalogue').value) || 0;
    let rem = parseFloat(document.getElementById('p_remise').value) || 0;
    let fLiv = parseFloat(document.getElementById('f_livraison').value) || 0;
    let fEmb = parseFloat(document.getElementById('f_emballage').value) || 0;

    let paNet = pCat * (1 - rem/100);
    let cRevient = paNet + fLiv + fEmb;
    document.getElementById('r_panet').innerText = paNet.toFixed(2) + " €";
    document.getElementById('r_crevient').innerText = cRevient.toFixed(2) + " €";
    document.getElementById('sim_cout').value = cRevient.toFixed(2);

    let pvHt = parseFloat(document.getElementById('pv_ht').value) || 0;
    let tva = parseFloat(document.getElementById('t_tva').value) || 0;
    let pvTtc = pvHt * (1 + tva / 100);
    let marge = pvHt - cRevient;
    let tMarque = pvHt > 0 ? (marge / pvHt) * 100 : 0;
    
    document.getElementById('r_pvnet_ht').innerText = pvHt.toFixed(2) + " €";
    document.getElementById('r_pvttc').innerText = pvTtc.toFixed(2) + " €";
    document.getElementById('r_marge').innerText = marge.toFixed(2) + " €";
    document.getElementById('r_tmarque').innerText = tMarque.toFixed(2) + " %";

    let ce = parseFloat(document.getElementById('c_entres').value) || 0;
    let cs = parseFloat(document.getElementById('c_servis').value) || 0;
    let qTot = parseFloat(document.getElementById('q_total').value) || 0;
    let tTrans = ce > 0 ? (cs / ce) * 100 : 0;
    let caGlobal = pvHt * qTot;
    
    document.getElementById('r_ttrans').innerText = tTrans.toFixed(2) + " %";
    document.getElementById('r_ca_global').innerText = caGlobal.toFixed(2) + " €";

    let p0 = parseFloat(document.getElementById('v_p0').value) || 0, p1 = parseFloat(document.getElementById('v_p1').value) || 0;
    let q0 = parseFloat(document.getElementById('v_q0').value) || 0, q1 = parseFloat(document.getElementById('v_q1').value) || 0;
    let varP = p0 > 0 ? (p1 - p0) / p0 : 0, varQ = q0 > 0 ? (q1 - q0) / q0 : 0;
    let elast = varP !== 0 ? (varQ / varP) : 0;
    document.getElementById('r_elasticite').innerText = elast.toFixed(2);
    if (varP !== 0 && !isNaN(elast) && elast !== 0) { document.getElementById('sim_elast').value = elast.toFixed(2); }

    let cf = parseFloat(document.getElementById('sr_cf').value) || 0, cv = parseFloat(document.getElementById('sr_cv').value) || 0;
    let resultat = (caGlobal - cv) - cf;
    let elRes = document.getElementById('r_resultat');
    elRes.innerText = resultat.toFixed(2) + " €"; elRes.className = resultat < 0 ? "value-alert" : "value";

    if (chartPrixInstance) { chartPrixInstance.data.datasets[0].data = [cRevient, marge, pvHt*(tva/100), 0]; chartPrixInstance.update(); } 
    else { chartPrixInstance = new Chart(document.getElementById('chartPrix').getContext('2d'), { type: 'doughnut', data: { labels: ['Coût', 'Marge', 'TVA', 'Taxe Locale'], datasets: [{ data: [cRevient, marge, pvHt*(tva/100), 0], backgroundColor: ['#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6'] }] }, options: { responsive: true, maintainAspectRatio: false } }); }

    if (chartEvolInstance) { chartEvolInstance.data.datasets[0].data = [p0*q0, p1*q1]; chartEvolInstance.data.datasets[1].data = [(p0-cRevient)*q0, (p1-cRevient)*q1]; chartEvolInstance.update(); } 
    else { chartEvolInstance = new Chart(document.getElementById('chartEvolution').getContext('2d'), { type: 'bar', data: { labels: ['P0', 'P1'], datasets: [{ label: 'CA', data: [p0*q0, p1*q1], backgroundColor: '#3498db' }, { label: 'Marge', data: [(p0-cRevient)*q0, (p1-cRevient)*q1], backgroundColor: '#2ebe71' }] }, options: { responsive: true, maintainAspectRatio: false } }); }
}

// --- SIMULATION ---
function calculSimulation() {
    let cout = parseFloat(document.getElementById('sim_cout').value) || 0, p0 = parseFloat(document.getElementById('sim_p0').value) || 0;
    let q0 = parseFloat(document.getElementById('sim_q0').value) || 0, elast = parseFloat(document.getElementById('sim_elast').value) || 0;
    if (p0 <= 0) return;
    
    let matrixBody = document.getElementById('matrixBody'); matrixBody.innerHTML = "";
    let step = Math.max(1, Math.round(p0 * 0.05)), minPrice = Math.max(0, cout - (cout * 0.2)), maxPrice = p0 * 2.5;
    let dataMargeGlobale = [], labelsPrices = [], scenarios = [];

    for (let p = minPrice; p <= maxPrice; p += step) {
        let qSimule = Math.max(0, q0 * (1 + ((p - p0) / p0) * elast));
        let mg = (p - cout) * qSimule;
        scenarios.push({ p: p, q: Math.round(qSimule), ca: p * qSimule, mg: mg });
        dataMargeGlobale.push(mg); labelsPrices.push(p.toFixed(0) + " €");
    }

    let bestMarge = Math.max(...dataMargeGlobale);
    prixOptimal = "Non défini"; margeMax = "0.00 €";

    scenarios.forEach(sc => {
        let isOpti = sc.mg === bestMarge && bestMarge > 0;
        if(isOpti) { prixOptimal = sc.p.toFixed(2) + " €"; margeMax = sc.mg.toFixed(2) + " €"; }
        matrixBody.innerHTML += `<tr class="${isOpti ? 'optimal' : (sc.mg < 0 ? 'deficit' : '')}"><td>${sc.p.toFixed(2)} € ${isOpti ? '⭐' : ''}</td><td>${sc.q}</td><td>${sc.ca.toFixed(0)} €</td><td>${sc.mg.toFixed(0)} €</td></tr>`;
    });

    if (chartSimuInstance) { chartSimuInstance.data.labels = labelsPrices; chartSimuInstance.data.datasets[0].data = dataMargeGlobale; chartSimuInstance.update(); } 
    else { chartSimuInstance = new Chart(document.getElementById('chartSimulation').getContext('2d'), { type: 'line', data: { labels: labelsPrices, datasets: [{ label: 'Marge Globale', data: dataMargeGlobale, borderColor: '#2ecc71', backgroundColor: 'rgba(46, 204, 113, 0.2)', borderWidth: 3, fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false } }); }
}

// --- BILAN & EXPORT ---
function updateBilan() {
    document.getElementById('b_cout').innerText = document.getElementById('r_crevient').innerText;
    document.getElementById('b_pvht').innerText = document.getElementById('r_pvnet_ht').innerText;
    document.getElementById('b_marge').innerText = document.getElementById('r_marge').innerText;
    document.getElementById('b_tmarque').innerText = document.getElementById('r_tmarque').innerText;
    document.getElementById('b_q').innerText = document.getElementById('q_total').value;
    document.getElementById('b_ttrans').innerText = document.getElementById('r_ttrans').innerText;
    document.getElementById('b_ca').innerText = document.getElementById('r_ca_global').innerText;
    
    let res = document.getElementById('r_resultat').innerText;
    document.getElementById('b_resultat').innerText = res; 
    document.getElementById('b_resultat').style.color = res.includes('-') ? '#c0392b' : '#27ae60';
    
    document.getElementById('b_prix_opti').innerText = prixOptimal; 
    document.getElementById('b_marge_max').innerText = margeMax;
}

function exporterBilan() {
    html2canvas(document.getElementById('capture-zone'), { scale: 2 }).then(canvas => {
        let link = document.createElement('a'); 
        link.download = 'Bilan_Performances.png'; 
        link.href = canvas.toDataURL("image/png"); 
        link.click();
    });
}

// --- INITIALISATION ---
window.onload = function() { 
    runAll('init'); 
    calculerBilan(); 
};
