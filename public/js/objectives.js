// public/js/objectives.js

const monthNames = [
  '—','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

let createModal, editModal, editingId;

window.addEventListener('DOMContentLoaded', init);

async function init() {
  // Inicializar modales
  createModal = new bootstrap.Modal(document.getElementById('createModal'));
  editModal   = new bootstrap.Modal(document.getElementById('editModal'));

  // 1) Sesión
  const meRes = await fetch('/api/current-user');
  if (!meRes.ok) return window.location.href = '/login.html';
  const me = await meRes.json();
  const isAdmin = me.role === 'administrador';

  // 2) Nuevo Objetivo abre modal
  document.getElementById('newBtn').addEventListener('click', () => {
    resetCreateForm();
    createModal.show();
  });

  // 3) Llenar dropdown de usuarios
  const sel = document.getElementById('userFilter');
  sel.innerHTML = '<option value="">Todos</option>';
  (await (await fetch('/api/users')).json())
    .forEach(u => sel.append(new Option(`${u.nombre} ${u.apellido}`, u.username)));
  if (!isAdmin) document.getElementById('userFilterContainer').style.display = 'none';

  // 4) Eventos generales
  document.getElementById('filterBtn').onclick    = loadList;
  document.getElementById('logoutBtn').onclick    = async e => {
    e.preventDefault();
    await fetch('/logout');
    window.location = '/login.html';
  };

  // 5) Crear Objetivo: toggle mes
  setupModalToggle(
    'typeCreate','monthGroupCreate','monthCreate'
  );
  // 6) Envío crear
  document.getElementById('modalFormCreate')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      const res  = await fetch('/api/objectives', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(data)
      });
      const msg = document.getElementById('modalMessageCreate');
      if (res.ok) {
        msg.innerHTML = '<div class="alert alert-success">Creado con éxito.</div>';
        loadList();
        setTimeout(()=>createModal.hide(),800);
      } else {
        const err = await res.json();
        msg.innerHTML = `<div class="alert alert-danger">${err.error||'Error.'}</div>`;
      }
    });

  // 7) Preparar toggle mes en edit
  setupModalToggle(
    'typeEdit','monthGroupEdit','monthEdit'
  );
  // 8) Envío editar
  document.getElementById('modalFormEdit')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      const res  = await fetch(`/api/objectives/${editingId}`, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(data)
      });
      const msg = document.getElementById('modalMessageEdit');
      if (res.ok) {
        msg.innerHTML = '<div class="alert alert-success">Actualizado.</div>';
        loadList();
        setTimeout(()=>editModal.hide(),800);
      } else {
        const err = await res.json();
        msg.innerHTML = `<div class="alert alert-danger">${err.error||'Error.'}</div>`;
      }
    });

  // 9) Carga inicial
  loadList();
}

function setupModalToggle(typeId, monthContainerId, monthId) {
  document.getElementById(typeId).addEventListener('change', e => {
    const show = e.target.value === 'mensual';
    document.getElementById(monthContainerId)
      .classList.toggle('d-none', !show);
    document.getElementById(monthId).required = show;
  });
}

async function loadList() {
  const user = document.getElementById('userFilter').value;
  let url = '/api/objectives';
  if (user) url += `?user=${encodeURIComponent(user)}`;
  const data = await (await fetch(url)).json();
  renderTable(data);
}

function renderTable(data) {
  const container = document.querySelector('#listContainer .card-body');
  if (!Array.isArray(data) || !data.length) {
    container.innerHTML = '<div class="p-3 text-center">No hay objetivos.</div>';
    return;
  }
  let html = `<div class="table-responsive"><table class="table table-striped mb-0">
    <thead class="table-light"><tr>
      <th>Usuario</th><th>Tipo</th><th>Año</th><th>Mes</th>
      <th>Cap.Excl.</th><th>Anual</th><th>Premio</th><th>Comisión</th>
      <th>Tx Nec.</th><th>Suma x Tx</th><th>Total Anual</th>
      <th>Total Mensual</th><th>Fecha</th><th class="text-center">Acc</th>
    </tr></thead><tbody>`;
  data.forEach(o => {
    const f = new Date(o.createdAt).toLocaleString();
    html += `<tr>
      <td>${o.createdBy}</td>
      <td>${o.type==='mensual'?'Mensual':'Anual'}</td>
      <td>${o.year}</td>
      <td>${o.type==='mensual'?monthNames[o.month]:'—'}</td>
      <td>${o.captacionExclusiva}</td>
      <td>${o.objetivoAnual}</td>
      <td>${o.premioConvencion}</td>
      <td>${o.comisionPromedioTransaccion}</td>
      <td>${o.transaccionesNecesarias}</td>
      <td>${o.sumaPrelistings}</td>
      <td>${o.totalAnualPrelistings}</td>
      <td>${o.totalMensualPrelistings}</td>
      <td>${f}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary btn-edit" data-id="${o._id}">✎</button>
        <button class="btn btn-sm btn-outline-danger btn-del" data-id="${o._id}">🗑️</button>
      </td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  container.innerHTML = html;

  // editar
  container.querySelectorAll('.btn-edit').forEach(btn => {
    btn.onclick = async () => {
      editingId = btn.dataset.id;
      resetEditForm();
      const o = await (await fetch(`/api/objectives/${editingId}`)).json();
      // poblar campos
      document.getElementById('typeEdit').value = o.type;
      document.getElementById('typeEdit').dispatchEvent(new Event('change'));
      document.getElementById('yearEdit').value = o.year;
      if (o.type==='mensual') document.getElementById('monthEdit').value = o.month;
      document.getElementById('captExEdit').value = o.captacionExclusiva;
      document.getElementById('objAnualEdit').value = o.objetivoAnual;
      document.getElementById('premConvEdit').value = o.premioConvencion;
      document.getElementById('comTransEdit').value = o.comisionPromedioTransaccion;
      document.getElementById('sumPreEdit').value = o.sumaPrelistings;
      editModal.show();
    };
  });

  // eliminar
  container.querySelectorAll('.btn-del').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('¿Eliminar?')) return;
      await fetch(`/api/objectives/${btn.dataset.id}`,{method:'DELETE'});
      loadList();
    };
  });
}

// limpia modal crear
function resetCreateForm() {
  document.getElementById('modalFormCreate').reset();
  document.getElementById('modalMessageCreate').innerHTML = '';
  document.getElementById('monthGroupCreate').classList.add('d-none');
}

// limpia modal editar
function resetEditForm() {
  document.getElementById('modalFormEdit').reset();
  document.getElementById('modalMessageEdit').innerHTML = '';
  document.getElementById('monthGroupEdit').classList.add('d-none');
}
