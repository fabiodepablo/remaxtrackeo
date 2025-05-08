// public/js/trackeoFactores.js

const monthNames = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

let isAdmin = false;
let currentUserId = null;

window.addEventListener('DOMContentLoaded', init);

async function init() {
  // 1) Detectar usuario y rol
  const me = await (await fetch('/api/current-user')).json();
  isAdmin = me.role === 'administrador';
  currentUserId = me.id;

  // 2) Logout
  document.getElementById('logoutBtn').onclick = async e => {
    e.preventDefault();
    await fetch('/logout');
    window.location = '/login.html';
  };

  // 3) Si admin, poblar filtro de usuarios
  if (isAdmin) {
    const sel = document.getElementById('userSelect');
    document.getElementById('userFilterLabel').style.display = 'inline-block';
    sel.innerHTML = '<option value="">Todos</option>';
    const users = await (await fetch('/api/users')).json();
    users.forEach(u => {
      const o = document.createElement('option');
      o.value = u._id;
      o.textContent = `${u.nombre} ${u.apellido}`;
      sel.appendChild(o);
    });
    sel.onchange = renderFactors;
  }

  // 4) Botón Ver
  document.getElementById('viewBtn').onclick = renderFactors;
}

async function renderFactors() {
  // Limpiar mensaje y tabla
  document.getElementById('message').textContent = '';
  document.getElementById('tableContainer').innerHTML = '';

  const year = +document.getElementById('year').value;
  let userId = currentUserId;
  if (isAdmin) {
    const sel = document.getElementById('userSelect').value;
    if (sel) userId = sel;
  }

  // 5) Traer todos los meses en paralelo
  const datos = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      fetch(`/api/trackeoMensual?year=${year}&month=${i+1}&userId=${userId}`)
        .then(r => r.ok ? r.json() : null)
    )
  );

  // 6) Calcular totales por mes
  const resumen = datos.map(doc => {
    if (!doc) return null;
    const vals = doc.valores;
    const tot  = {
      caraACara:0, prelistings:0, prebuyings:0,
      captaciones:0, transacciones:0, comisiones:0, acm:0
    };
    Object.entries(vals).forEach(([k,v]) => {
      const n = Number(v) || 0;
      if (k.startsWith('caraACara_'))    tot.caraACara    += n;
      if (k.startsWith('prelistings_'))  tot.prelistings  += n;
      if (k.startsWith('prebuyings_'))   tot.prebuyings   += n;
      if (k.startsWith('captaciones_'))  tot.captaciones  += n;
      if (k.startsWith('transacciones_'))tot.transacciones+= n;
      if (k.startsWith('comisiones_'))   tot.comisiones   += n;
      if (k.startsWith('acm_'))          tot.acm          += n;
    });
    return tot;
  });

  // 7) Construir tabla
  let html = `
    <table class="table table-sm table-bordered">
      <thead>
        <tr class="group">
          <th>Mes</th>
          <th colspan="3">FACTORES CAPTACIÓN</th>
          <th colspan="3">FACTORES TRANSACCIÓN</th>
        </tr>
        <tr class="labels">
          <th></th>
          <th>Cara a cara / prelisting</th>
          <th>Prelistings / captación</th>
          <th>Captaciones x 10 / ACM</th>
          <th>Prelistings+Prebuyings / transacción</th>
          <th>Efectividad %</th>
          <th>Comisión prom. transacción</th>
        </tr>
      </thead>
      <tbody>`;

  resumen.forEach((m,i) => {
    html += `<tr><td>${monthNames[i]}</td>`;
    if (m) {
      // factor1
      const f1 = m.prelistings>0 ? (m.caraACara/m.prelistings).toFixed(2) : '-';
      // factor2
      const f2 = m.captaciones>0 ? (m.prelistings/m.captaciones).toFixed(2) : '-';
      // factor3: captaciones/prelistings *10
      const base3 = m.prelistings>0 ? (m.captaciones/m.prelistings) : 0;
      const f3 = (base3*10).toFixed(2);
      // factor4 sum PP
      const sumPP = m.prelistings + m.prebuyings;
      const f4 = m.transacciones>0 ? (sumPP/m.transacciones).toFixed(2) : '-';
      // factor5 efectividad
      const f5 = f4>0 ? ((1/Number(f4))*100).toFixed(2)+'%' : '-';
      // factor6 comision promedio
      const f6 = m.transacciones>0
        ? '$ '+(m.comisiones/m.transacciones).toFixed(2)
        : '-';

      [f1,f2,f3,f4,f5,f6].forEach(c => {
        html += `<td>${c}</td>`;
      });
    } else {
      html += `<td>-</td><td>-</td><td>0.00</td>
               <td>-</td><td>-</td><td>-</td>`;
    }
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  document.getElementById('tableContainer').innerHTML = html;
}
