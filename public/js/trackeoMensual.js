// public/js/trackeoMensual.js
const monthNames = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];
const keys = [
  'caraACara','prelistings','prebuyings',
  'captaciones','transacciones','comisiones',
  'nuevosContactos','acm','reservas'
];
const labelMap = {
  caraACara:       'Cara a cara',
  prelistings:     'Pre listings',
  prebuyings:      'Pre buyings',
  captaciones:     'Captaciones',
  transacciones:   'Transacciones',
  comisiones:      'Comisiones',
  nuevosContactos: 'Nuevos contactos',
  acm:             'ACM',
  reservas:        'Reservas'
};

let isAdmin=false, currentUserId=null, currentDoc={};

window.addEventListener('DOMContentLoaded', async () => {
  const meRes = await fetch('/api/current-user');
  if (!meRes.ok) return window.location.href='/login.html';
  const me = await meRes.json();
  isAdmin = me.role==='administrador';
  currentUserId = me.id;

  if (isAdmin) {
    document.getElementById('userFilterLabel').style.display='block';
    const users = await (await fetch('/api/users')).json();
    const sel = document.getElementById('userSelect');
    sel.innerHTML = '<option value="">Todos</option>';
    users.forEach(u => {
      const o = document.createElement('option');
      o.value = u._id;
      o.textContent = `${u.nombre} ${u.apellido}`;
      sel.append(o);
    });
  }

  document.getElementById('viewBtn').onclick   = viewTable;
  document.getElementById('logoutBtn').onclick = async e => {
    e.preventDefault();
    await fetch('/logout');
    window.location = '/login.html';
  };
});

async function viewTable() {
  document.getElementById('message').textContent     = '';
  document.getElementById('tableContainer').innerHTML = '';
  currentDoc = {};

  const year   = +document.getElementById('year').value;
  const month  = +document.getElementById('month').value;
  const userId = isAdmin ? document.getElementById('userSelect').value : null;

  let url = `/api/trackeoMensual?year=${year}&month=${month}`;
  if (isAdmin && userId) url += `&userId=${userId}`;

  const res  = await fetch(url);
  const msgC = document.getElementById('message');
  if (!res.ok) {
    msgC.className   = 'text-danger';
    msgC.textContent = `No hay datos para ${monthNames[month-1]} ${year}.`;
    const ownerId = isAdmin ? userId : currentUserId;
    if (ownerId === currentUserId) {
      const btn = document.createElement('button');
      btn.textContent = 'Crear tabla';
      btn.className   = 'btn btn-success ms-2';
      btn.onclick     = () => createTable(year, month, ownerId);
      msgC.append(btn);
    }
    return;
  }

  const doc = await res.json();
  currentDoc = {
    id:       doc._id,
    ownerId:  doc.userId,
    year, month,
    valores:  doc.valores
  };
  renderTable(false);
  renderActions();
}

async function createTable(year, month, userId) {
  const days  = new Date(year, month, 0).getDate();
  const weeks = Math.ceil(days/7);
  const valores = {};
  keys.forEach(k => {
    for(let i=1;i<=weeks;i++) valores[`${k}_${i}`] = 0;
  });

  const res = await fetch('/api/trackeoMensual', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ year, month, valores })
  });
  const msgC = document.getElementById('message');
  if (res.ok) {
    msgC.className   = 'text-success';
    msgC.textContent = 'Tabla creada con éxito.';
    viewTable();
  } else {
    msgC.className   = 'text-danger';
    msgC.textContent = 'Error al crear la tabla.';
  }
}

function renderTable(editable) {
  const { year, month, valores } = currentDoc;
  const container = document.getElementById('tableContainer');
  const days  = new Date(year, month, 0).getDate();
  const weeks = Math.ceil(days/7);

  let html = `
    <div class="table-responsive">
      <table class="table table-striped table-hover align-middle mb-0">
        <thead>
          <tr>
            <th rowspan="2">Semana</th>
            <th rowspan="2">Rango días</th>
            <th colspan="3" class="acciones-header">Acciones</th>
            <th colspan="3" class="resultados-header">Resultados</th>
            <th colspan="3" class="metricas-header">Otras métricas</th>
          </tr>
          <tr class="table-secondary">
  `;
  keys.forEach(k => html += `<th>${labelMap[k]}</th>`);
  html += `</tr></thead><tbody>`;

  const totals = Array(keys.length).fill(0);
  for (let i = 1; i <= weeks; i++) {
    const start = (i-1)*7 + 1, end = Math.min(i*7, days);
    html += `<tr>
      <td>${i}</td>
      <td>${start} al ${end}</td>`;
    keys.forEach((k,j) => {
      const v = +valores[`${k}_${i}`] || 0;
      totals[j] += v;
      html += editable
        ? `<td><input type="number" value="${v}" style="width:60px"></td>`
        : `<td>${v}</td>`;
    });
    html += `</tr>`;
  }

  html += `</tbody><tfoot>
    <tr class="fw-bold">
      <td colspan="2" class="text-end">TOTAL MES</td>`;
  totals.forEach(t => html += `<td>${t}</td>`);
  html += `</tr></tfoot></table></div>`;

  container.innerHTML = html;
}

function renderActions() {
  const msgC = document.getElementById('message');
  msgC.innerHTML = '';

  if (currentDoc.ownerId === currentUserId) {
    const btn = document.createElement('button');
    btn.textContent = 'Editar';
    btn.className   = 'btn btn-primary me-2';
    btn.onclick     = () => {
      renderTable(true);
      renderSaveCancel();
    };
    msgC.append(btn);
  }

  if (currentDoc.ownerId === currentUserId || isAdmin) {
    const btn = document.createElement('button');
    btn.textContent = 'Eliminar';
    btn.className   = 'btn btn-danger';
    btn.onclick     = async() => {
      if (!confirm('¿Eliminar esta tabla?')) return;
      const res = await fetch(`/api/trackeoMensual/${currentDoc.id}`, { method:'DELETE' });
      msgC.className   = res.ok ? 'text-success':'text-danger';
      msgC.textContent = res.ok ? 'Eliminado.':'Error al eliminar.';
      document.getElementById('tableContainer').innerHTML = '';
    };
    msgC.append(btn);
  }
}

function renderSaveCancel() {
  const msgC = document.getElementById('message');
  msgC.innerHTML = '';

  const save = document.createElement('button');
  save.textContent = 'Guardar';
  save.className = 'btn btn-success me-2';
  save.onclick   = async() => {
    const inputs = Array.from(document.querySelectorAll('#tableContainer tbody input'));
    const valores = {};
    inputs.forEach((inp,idx) => {
      const week = Math.floor(idx/keys.length)+1;
      const key  = `${keys[idx%keys.length]}_${week}`;
      valores[key] = +inp.value;
    });
    const res = await fetch(`/api/trackeoMensual/${currentDoc.id}`, {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ valores })
    });
    if (res.ok) {
      msgC.className   = 'text-success';
      msgC.textContent = 'Guardado con éxito.';
      currentDoc.valores = valores;
      renderTable(false);
      renderActions();
    } else {
      msgC.className   = 'text-danger';
      msgC.textContent = 'Error al guardar.';
    }
  };

  const cancel = document.createElement('button');
  cancel.textContent = 'Cancelar';
  cancel.className = 'btn btn-secondary';
  cancel.onclick   = () => {
    renderTable(false);
    renderActions();
  };

  msgC.append(save, cancel);
}
