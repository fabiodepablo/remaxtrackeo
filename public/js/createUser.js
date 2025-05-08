document.getElementById('createForm').addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      nombre:   document.getElementById('nombre').value,
      apellido: document.getElementById('apellido').value,
      username: document.getElementById('username').value,
      password: document.getElementById('password').value,
      mail:     document.getElementById('mail').value,
      role:     document.getElementById('role').value
    };
    const res = await fetch('/api/users', {
      method: 'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) location.href = '/users.html';
    else document.getElementById('error').textContent = 'Error al crear';
  });
  