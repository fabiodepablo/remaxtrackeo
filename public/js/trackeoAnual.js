// public/js/trackeoAnual.js

// Nombres de los meses
const monthNames = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

// Claves y mapeo a etiquetas legibles
const actionKeys = ['caraACara','prelistings','prebuyings'];
const resultKeys = ['captaciones','transacciones','comisiones'];
const labelMap = {
  caraACara:      'Cara a cara',
  prelistings:    'Pre listings',
  prebuyings:     'Pre buyings',
  captaciones:    'Captaciones',
  transacciones:  'Transacciones',
  comisiones:     'Comisiones'
};

let isAdmin = false;
let currentUserId = null;

window.addEventListener('DOMContentLoaded', init);

async function init() {
  // 1) Verificar sesión y rol
  const meRes = await fetch('/api/current-user');
  if (!meRes.ok) return window.location.href = '/login.html';
  const me = await meRes.json();
  isAdmin = me.role === 'administrador';
  currentUserId = me.id;

  // 2) Mostrar filtro de usuario si soy admin
  const userFilterContainer = document.getElementById('userFilterContainer');
  if (isAdmin) {
    userFilterContainer.style.display = 'block';
    const users = await (await fetch('/api/users')).json();
    const sel = document.getElementById('userSelect');
    sel.innerHTML = '<option value="">Todos</option>';
    users.forEach(u => {
      sel.append(new Option(`${u.nombre} ${u.apellido}`, u._id));
    });
  } else {
    userFilterContainer.style.display = 'none';
  }

  // 3) Enlazar botones
  document.getElementById('viewBtn').onclick   = renderAnnual;
  document.getElementById('logoutBtn').onclick = async e => {
    e.preventDefault();
    await fetch('/logout');
    window.location = '/login.html';
  };
}

async function renderAnnual() {
  // Recoger año y usuario
  const year   = +document.getElementById('year').value;
  const userId = isAdmin
    ? document.getElementById('userSelect').value
    : currentUserId;

  // 4) Traer paralelamente cada mes
  const resultados = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      fetch(`/api/trackeoMensual?year=${year}&month=${i+1}&userId=${userId}`)
        .then(r => r.ok ? r.json() : null)
    )
  );

  // 5) Mapear a totales por mes
  const resumen = resultados.map(doc => {
    if (!doc) return null;
    const vals = doc.valores;
    const tot = { caraACara:0, prelistings:0, prebuyings:0,
                  captaciones:0, transacciones:0, comisiones:0 };
    Object.entries(vals).forEach(([k,v]) => {
      const n = Number(v)||0;
      if (k.startsWith('caraACara_'))      tot.caraACara     += n;
      if (k.startsWith('prelistings_'))    tot.prelistings   += n;
      if (k.startsWith('prebuyings_'))     tot.prebuyings    += n;
      if (k.startsWith('captaciones_'))    tot.captaciones   += n;
      if (k.startsWith('transacciones_'))  tot.transacciones += n;
      if (k.startsWith('comisiones_'))     tot.comisiones    += n;
    });
    return tot;
  });

  // 6) Construir e inyectar la tabla
  const container = document.getElementById('summaryContainer');
  container.innerHTML = buildTableHTML(resumen);
}

function buildTableHTML(resumen) {
  // Encabezado con dos niveles
  let html = `
  <div class="table-responsive">
    <table class="table table-striped table-hover align-middle mb-0">
      <thead>
        <tr>
          <th rowspan="2">Mes</th>
          <th colspan="${actionKeys.length}" class="table-danger text-center">Acciones</th>
          <th colspan="${resultKeys.length}" class="table-primary text-center">Resultados</th>
        </tr>
        <tr class="table-light">
  `;
  actionKeys.forEach(k => html += `<th>${labelMap[k]}</th>`);
  resultKeys.forEach(k => html += `<th>${labelMap[k]}</th>`);
  html += `
        </tr>
      </thead>
      <tbody>
  `;

  // Filas por mes
  resumen.forEach((m,i) => {
    html += `<tr><td>${monthNames[i]}</td>`;
    if (m) {
      actionKeys.concat(resultKeys).forEach(k => {
        html += `<td>${m[k].toLocaleString()}</td>`;
      });
    } else {
      actionKeys.concat(resultKeys).forEach(() => {
        html += `<td class="text-muted">-</td>`;
      });
    }
    html += `</tr>`;
  });

  // Pie con totales anuales
  const totA = resumen.reduce((a,m) => {
    if (!m) return a;
    actionKeys.concat(resultKeys).forEach(k => a[k] += m[k]);
    return a;
  }, actionKeys.concat(resultKeys).reduce((o,k)=> (o[k]=0,o), {}));

  html += `</tbody><tfoot>
    <tr class="fw-bold table-secondary">
      <td>Total año</td>
  `;
  actionKeys.concat(resultKeys).forEach(k => {
    html += `<td>${totA[k].toLocaleString()}</td>`;
  });
  html += `
    </tr>
  </tfoot>
  </table>
  </div>
  `;

  return html;
}
