document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const cur = await fetch('/api/current-user');
    if (!cur.ok) return location.href = '/login.html';
    const me = await cur.json();
    if (me.role !== 'administrador') {
      // ocultar selector rol si no es admin
      document.getElementById('role').parentNode.style.display = 'none';
    }
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) return document.getElementById('error').textContent = 'No encontrado';
    const u = await res.json();
    document.getElementById('nombre').value   = u.nombre;
    document.getElementById('apellido').value = u.apellido;
    document.getElementById('username').value = u.username;
    document.getElementById('password').value = u.password;
    document.getElementById('mail').value     = u.mail;
    document.getElementById('role').value     = u.role;
  
    document.getElementById('editForm').addEventListener('submit', async e => {
      e.preventDefault();
      const data = {
        nombre:   document.getElementById('nombre').value,
        apellido: document.getElementById('apellido').value,
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        mail:     document.getElementById('mail').value,
        role:     document.getElementById('role').value
      };
      const upd = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(data)
      });
      if (upd.ok) location.href = '/users.html';
      else document.getElementById('error').textContent = 'Error al guardar';
    });
  });
  