// public/js/dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
  // 1) Usuario actual
  const resMe = await fetch('/api/current-user');
  if (!resMe.ok) return window.location.href = '/login.html';
  const me = await resMe.json();

  // 2) Saludo
  document.getElementById('welcome').textContent =
    `Hola, ${me.username} (${me.role})`;

  // 3) Ocultar admin-only
  if (me.role !== 'administrador') {
    document.querySelectorAll('.admin-only')
            .forEach(el => el.style.display = 'none');
  }

  // 4) Logout
  document.getElementById('logoutBtn').addEventListener('click', async e => {
    e.preventDefault();
    await fetch('/logout');
    window.location.href = '/login.html';
  });

  // 5) Referencias
  const sel        = document.getElementById('objType');
  const toggleBtn  = document.getElementById('toggleObjBtn');
  const cont       = document.getElementById('latestObjContainer');
  let   isVisible  = false;

  // 6) Renderizar la tabla
  function renderObj(o) {
    if (!o) {
      cont.innerHTML = `<div class="alert alert-info">No hay objetivo cargado.</div>`;
      return;
    }
    const rows = [
      ['Tipo', o.type === 'anual' ? 'Anual' : 'Mensual'],
      ['Año', o.year],
      ...(o.type === 'mensual' ? [['Mes', o.month]] : []),
      ['Captación Exclusiva', o.captacionExclusiva],
      ['Objetivo Anual ($)', Number(o.objetivoAnual).toLocaleString()],
      ['Premio Convención ($)', Number(o.premioConvencion).toLocaleString()],
      ['Comisión Prom. Tx', o.comisionPromedioTransaccion],
      ['Transacciones Necesarias', o.transaccionesNecesarias],
      ['Total Anual Prelistings', o.totalAnualPrelistings],
      ['Total Mensual Prelistings', o.totalMensualPrelistings],
    ];

    let html = `<div class="table-card"><table>
      <thead><tr><th>Campo</th><th>Valor</th></tr></thead><tbody>`;
    for (const [label, val] of rows) {
      html += `<tr><td>${label}</td><td>${val}</td></tr>`;
    }
    html += `</tbody></table></div>`;
    cont.innerHTML = html;
  }

  // 7) Carga el objetivo
  async function loadObjective() {
    cont.style.display = 'block';
    toggleBtn.textContent = 'Ocultar Objetivo';
    toggleBtn.classList.remove('view');
    toggleBtn.classList.add('hide');
    isVisible = true;

    toggleBtn.disabled = true;
    try {
      const res = await fetch(`/api/objectives/latest?type=${sel.value}`);
      if (!res.ok) throw new Error(res.statusText);
      const o = await res.json();
      renderObj(o);
    } catch (err) {
      cont.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
    toggleBtn.disabled = false;
  }

  // 8) Oculta el objetivo
  function hideObjective() {
    cont.style.display = 'none';
    toggleBtn.textContent = 'Ver Objetivo';
    toggleBtn.classList.remove('hide');
    toggleBtn.classList.add('view');
    isVisible = false;
  }

  // 9) Alterna mostrar/ocultar
  toggleBtn.addEventListener('click', () => {
    if (!isVisible) {
      loadObjective();
    } else {
      hideObjective();
    }
  });

  // 10) **Auto-refresh** al cambiar tipo
  sel.addEventListener('change', () => {
    if (isVisible) {
      loadObjective();
    }
  });
});
