document.addEventListener('DOMContentLoaded', init);

let isAdmin = false;
let currentUserId = null;
let editingId = null;

async function init() {
  // Usuario y rol
  const meRes = await fetch('/api/current-user');
  if (!meRes.ok) return window.location = '/login.html';
  const me = await meRes.json();
  isAdmin = me.role === 'administrador';
  currentUserId = me.id;

  // Logout
  document.getElementById('logoutBtn').onclick = async e => {
    e.preventDefault();
    await fetch('/logout');
    window.location = '/login.html';
  };

  // Si admin, poblar filtro
  if (isAdmin) {
    const sel = document.getElementById('userSelect');
    document.getElementById('userFilterLabel').style.display = 'block';
    sel.innerHTML = '<option value="">Todos</option>';
    const users = await (await fetch('/api/users')).json();
    users.forEach(u => sel.append(new Option(`${u.nombre} ${u.apellido}`, u._id)));
    sel.onchange = () => { loadList(); updateNewButton(); };
  }

  // Nuevo
  document.getElementById('newBtn').onclick = () => showForm();

  // Carga inicial
  await loadList();
  updateNewButton();
}

function apiUrl() {
  let url = '/api/trackeoPropiedades';
  if (isAdmin) {
    const uid = document.getElementById('userSelect').value;
    if (uid) url += `?userId=${uid}`;
  }
  return url;
}

// Carga y muestra tabla
async function loadList() {
  clearForm();
  document.getElementById('message').textContent = '';
  const arr = await (await fetch(apiUrl())).json();
  const body = document.getElementById('listBody');
  body.innerHTML = '';

  arr.forEach(d => {
    const diff = ((d.precioPublicacion / d.precioAcm) - 1) * 100;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.tipo}</td>
      <td>${d.propiedad}</td>
      <td>${d.contrato}</td>
      <td>${d.precioPublicacion.toLocaleString()}</td>
      <td>${d.precioAcm.toLocaleString()}</td>
      <td>${diff.toFixed(2)}%</td>
      <td>${new Date(d.fechaCarga).toLocaleDateString()}</td>
      <td>${d.valor}</td>
      <td class="text-center">
        ${(d.userId === currentUserId || isAdmin)
          ? `<button class="btn btn-sm btn-outline-primary editBtn" data-id="${d._id}">✎</button>
             <button class="btn btn-sm btn-outline-danger delBtn" data-id="${d._id}">🗑️</button>`
          : ''
        }
      </td>`;
    body.appendChild(tr);
  });

  document.querySelectorAll('.editBtn').forEach(b => b.onclick = () => showForm(b.dataset.id));
  document.querySelectorAll('.delBtn').forEach(b => b.onclick = async () => {
    if (!confirm('¿Eliminar esta propiedad?')) return;
    const res = await fetch(`/api/trackeoPropiedades/${b.dataset.id}`, { method:'DELETE' });
    const msg = document.getElementById('message');
    msg.className = res.ok ? 'text-success' : 'text-danger';
    msg.textContent = res.ok
      ? 'Propiedad eliminada correctamente.'
      : 'Error al eliminar la propiedad.';
    await loadList(); updateNewButton();
  });
}

function showForm(id = null) {
  editingId = id;
  const c = document.getElementById('formContainer');
  c.innerHTML = '';

  if (id) {
    fetch(`/api/trackeoPropiedades/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(doc => buildForm(c, doc))
      .catch(() => alert('Error al cargar.'));
  } else {
    buildForm(c, null);
  }
}

function buildForm(container, doc) {
  container.innerHTML = `
    <div class="card card-body mb-4">
      <h5 class="card-title">${doc ? 'Editar Propiedad' : 'Nueva Propiedad'}</h5>
      <form id="propForm" class="row g-3">
        <div class="col-md-4">
          <label class="form-label">Tipo</label>
          <input id="f_tipo" class="form-control" value="${doc?.tipo||''}" required>
        </div>
        <div class="col-md-4">
          <label class="form-label">Propiedad</label>
          <input id="f_propiedad" class="form-control" value="${doc?.propiedad||''}" required>
        </div>
        <div class="col-md-4">
          <label class="form-label">Contrato</label>
          <select id="f_contrato" class="form-select" required>
            <option value="exclusiva">exclusiva</option>
            <option value="no exclusiva">no exclusiva</option>
          </select>
        </div>
        <div class="col-md-4">
          <label class="form-label">Precio Publicación</label>
          <input id="f_pp" type="number" class="form-control" value="${doc?.precioPublicacion||0}" required>
        </div>
        <div class="col-md-4">
          <label class="form-label">Precio ACM</label>
          <input id="f_pa" type="number" class="form-control" value="${doc?.precioAcm||0}" required>
        </div>
        <div class="col-md-4">
          <label class="form-label">Fecha de Carga</label>
          <input id="f_fc" type="date" class="form-control"
            value="${doc ? new Date(doc.fechaCarga).toISOString().slice(0,10) : ''}" required>
        </div>
        <div class="col-md-4">
          <label class="form-label">Valor</label>
          <select id="f_valor" class="form-select" required>
            <option value="si">si</option>
            <option value="no">no</option>
          </select>
        </div>
        <div class="col-12 d-flex gap-2">
          <button type="submit" class="btn btn-primary">${doc?'Guardar':'Crear'}</button>
          <button type="button" id="cancelBtn" class="btn btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>
  `;

  if (doc) {
    document.getElementById('f_contrato').value = doc.contrato;
    document.getElementById('f_valor').value = doc.valor;
  }

  document.getElementById('cancelBtn').onclick = () => {
    clearForm(); loadList(); updateNewButton();
  };
  document.getElementById('propForm').onsubmit = saveForm;
}

function clearForm() {
  document.getElementById('formContainer').innerHTML = '';
  document.getElementById('message').textContent = '';
}

async function saveForm(e) {
  e.preventDefault();
  const payload = {
    userId: isAdmin && document.getElementById('userSelect').value
      ? document.getElementById('userSelect').value
      : currentUserId,
    tipo:              document.getElementById('f_tipo').value,
    propiedad:         document.getElementById('f_propiedad').value,
    contrato:          document.getElementById('f_contrato').value,
    precioPublicacion: +document.getElementById('f_pp').value,
    precioAcm:         +document.getElementById('f_pa').value,
    fechaCarga:        document.getElementById('f_fc').value,
    valor:             document.getElementById('f_valor').value
  };

  let res;
  if (editingId) {
    res = await fetch(`/api/trackeoPropiedades/${editingId}`, {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
  } else {
    res = await fetch('/api/trackeoPropiedades', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
  }

  const msg = document.getElementById('message');
  if (res.ok) {
    msg.className = 'text-success';
    msg.textContent = editingId
      ? 'Propiedad actualizada con éxito.'
      : 'Propiedad creada con éxito.';
    clearForm(); await loadList(); updateNewButton();
  } else {
    msg.className = 'text-danger';
    msg.textContent = 'Error al guardar la propiedad.';
  }
}

function updateNewButton() {
  const btn = document.getElementById('newBtn');
  if (isAdmin) {
    btn.style.display = 'inline-block';
    return;
  }
  const sel = document.getElementById('userSelect');
  btn.style.display = (!sel || sel.value === '' || sel.value === currentUserId)
    ? 'inline-block' : 'none';
}
