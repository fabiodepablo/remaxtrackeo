const userModal = new bootstrap.Modal(document.getElementById('userModal'));
const form       = document.getElementById('userForm');
const submitBtn  = document.getElementById('submitButton');
const modalTitle = document.getElementById('modalTitle');
const togglePwd  = document.getElementById('togglePassword');

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // 1) Verificar sesión
  const resMe = await fetch('/api/current-user');
  if (!resMe.ok) return window.location.href = '/login.html';
  const me = await resMe.json();

  // 2) Logout
  document.getElementById('logoutBtn').addEventListener('click', async e => {
    e.preventDefault();
    await fetch('/logout');
    window.location.href = '/login.html';
  });

  // 3) Nuevo usuario → modal
  document.getElementById('btnNew').addEventListener('click', () => openModal('create'));

  // 4) Toggle contraseña en el modal
  togglePwd.addEventListener('click', () => {
    const pwd = document.getElementById('password');
    const icon = togglePwd.querySelector('i');
    if (pwd.type === 'password') {
      pwd.type = 'text';
      icon.classList.replace('bi-eye-slash-fill','bi-eye-fill');
    } else {
      pwd.type = 'password';
      icon.classList.replace('bi-eye-fill','bi-eye-slash-fill');
    }
  });

  // 5) Envío del formulario
  form.addEventListener('submit', onSubmit);

  // 6) Carga tabla (paso rol de admin)
  await fetchUsers(me.role === 'administrador');
}

async function fetchUsers(isAdmin) {
  const res = await fetch('/api/users');
  const container = document.getElementById('listContainer');
  if (!res.ok) {
    container.innerHTML = '<div class="alert alert-danger">Error al cargar usuarios.</div>';
    return;
  }
  const users = await res.json();
  if (users.length === 0) {
    container.innerHTML = '<p>No hay usuarios para mostrar.</p>';
    return;
  }

  // Construcción de la tabla, incluyendo la columna Contraseña
  let html = `
    <table class="table table-striped table-hover align-middle">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Apellido</th>
          <th>Usuario</th>
          <th>Mail</th>
          <th>Contraseña</th>
          <th>Rol</th>
          <th class="text-center">Editar</th>
          ${isAdmin ? '<th class="text-center">Eliminar</th>' : ''}
        </tr>
      </thead>
      <tbody>
  `;

  users.forEach(u => {
    html += `
      <tr>
        <td>${u.nombre}</td>
        <td>${u.apellido}</td>
        <td>${u.username}</td>
        <td>${u.mail}</td>
        <td class="text-center password-cell">
          <span class="password-mask">••••••••</span>
          <i
            class="bi bi-eye-slash password-toggle"
            data-hash="${u.password}"
            style="cursor:pointer; margin-left:.5rem;"
          ></i>
        </td>
        <td>${u.role}</td>
        <td class="text-center">
          <button
            class="btn btn-sm btn-outline-primary"
            onclick="openModal('edit','${u._id}')"
          >✎</button>
        </td>
        ${isAdmin ? `
        <td class="text-center">
          <button
            data-id="${u._id}"
            class="btn btn-sm btn-outline-danger deleteBtn"
          >🗑️</button>
        </td>` : ''}
      </tr>
    `;
  });

  html += '</tbody></table>';
  container.innerHTML = html;

  // 7) Configurar ojo en cada fila
  container.querySelectorAll('.password-toggle').forEach(icon => {
    icon.addEventListener('click', () => {
      const mask = icon.previousElementSibling;
      if (mask.textContent.startsWith('••')) {
        mask.textContent = icon.dataset.hash;
        icon.classList.replace('bi-eye-slash','bi-eye');
      } else {
        mask.textContent = '••••••••';
        icon.classList.replace('bi-eye','bi-eye-slash');
      }
    });
  });

  // 8) Borrar (solo admin)
  if (isAdmin) {
    container.querySelectorAll('.deleteBtn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este usuario?')) return;
        const r = await fetch(`/api/users/${btn.dataset.id}`, { method:'DELETE' });
        if (r.ok) init();
        else alert((await r.json()).error || 'Error al eliminar.');
      });
    });
  }
}

async function openModal(mode, id = '') {
  form.reset();
  document.getElementById('userId').value = '';
  submitBtn.textContent = mode === 'create' ? 'Crear' : 'Actualizar';
  modalTitle.textContent  = mode === 'create' ? 'Crear Usuario' : 'Editar Usuario';

  if (mode === 'edit') {
    const res = await fetch(`/api/users/${id}`);
    const u   = await res.json();
    document.getElementById('userId').value   = u._id;
    document.getElementById('nombre').value   = u.nombre;
    document.getElementById('apellido').value = u.apellido;
    document.getElementById('username').value = u.username;
    document.getElementById('mail').value     = u.mail;
    document.getElementById('role').value     = u.role;
    // la contraseña queda en blanco para setear nueva
  }
  userModal.show();
}

async function onSubmit(e) {
  e.preventDefault();
  const id     = document.getElementById('userId').value;
  const url    = id ? `/api/users/${id}` : '/api/users';
  const method = id ? 'PUT' : 'POST';
  const payload = {
    nombre:   document.getElementById('nombre').value,
    apellido: document.getElementById('apellido').value,
    username: document.getElementById('username').value,
    mail:     document.getElementById('mail').value,
    role:     document.getElementById('role').value,
    password: document.getElementById('password').value
  };

  await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  userModal.hide();
  init();
}

// Para que funcionen los onclick inline:
window.openModal = openModal;
