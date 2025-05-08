// app.js
const path     = require('path');
const express  = require('express');
const session  = require('express-session');
const mongoose = require('mongoose');

// Models
const User          = require('./models/User');
const Objective     = require('./models/Objective');
const MonthlyTrack  = require('./models/MonthlyTrack');
const PropertyTrack = require('./models/PropertyTrack');

const app = express();

// 1) Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/userdb', {
  useNewUrlParser:    true,
  useUnifiedTopology: true
})
.then(() => console.log('✔️ MongoDB connected'))
.catch(err => console.error(err));

// 2) Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret:           'super-secret-key',
  resave:           false,
  saveUninitialized: false
}));

// 3) Create default admin if missing
;(async function(){
  if (!await User.findOne({ username:'admin' })) {
    await User.create({
      nombre:   'Admin',
      apellido: 'User',
      username: 'admin',
      password: 'admin',
      mail:     'admin@example.com',
      role:     'administrador'
    });
    console.log('✅ Admin user created (admin / admin)');
  }
})();

// 4) Auth helpers
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/login.html');
}
function isAdmin(req, res, next) {
  if (req.session.user.role === 'administrador') return next();
  res.status(403).send('Acceso denegado');
}

// 5) Static files
app.use('/css', express.static(path.join(__dirname,'public/css')));
app.use('/js',  express.static(path.join(__dirname,'public/js')));

// 6) HTML routes
app.get('/login.html',               (req,res) => res.sendFile(path.join(__dirname,'public/login.html')));
app.get('/dashboard.html',       isAuthenticated, (req,res) => res.sendFile(path.join(__dirname,'public/dashboard.html')));
app.get('/users.html',           isAuthenticated, (req,res) => res.sendFile(path.join(__dirname,'public/users.html')));
app.get('/createUser.html',      isAuthenticated, isAdmin,       (req,res) => res.sendFile(path.join(__dirname,'public/createUser.html')));
app.get('/editUser.html',        isAuthenticated, (req,res) => res.sendFile(path.join(__dirname,'public/editUser.html')));
app.get('/objectives.html',      isAuthenticated, (req,res) => res.sendFile(path.join(__dirname,'public/objectives.html')));
app.get('/createObjective.html', isAuthenticated, (req,res) => res.sendFile(path.join(__dirname,'public/createObjective.html')));
app.get('/editObjective.html',   isAuthenticated, (req,res) => res.sendFile(path.join(__dirname,'public/editObjective.html')));
app.get('/trackeoMensual.html',  isAuthenticated, (req,res) => res.sendFile(path.join(__dirname,'public/trackeoMensual.html')));
app.get('/trackeoAnual.html',    isAuthenticated, (req,res) => res.sendFile(path.join(__dirname,'public/trackeoAnual.html')));
app.get('/trackeoPropiedades.html', isAuthenticated, (req,res) => res.sendFile(path.join(__dirname,'public/trackeoPropiedades.html')));
app.get('/trackeoFactores.html',    isAuthenticated, (req,res) => res.sendFile(path.join(__dirname,'public/trackeoFactores.html')));

// 7) Authentication
app.post('/login', async (req,res) => {
  const { username, password } = req.body;
  const u = await User.findOne({ username });
  if (u && u.password === password) {
    req.session.user = { 
      id: u._id.toString(), 
      username: u.username, 
      role: u.role 
    };
    return res.redirect('/dashboard.html');
  }
  res.redirect('/login.html?error=1');
});
app.get('/logout', (req,res) => {
  req.session.destroy(() => res.redirect('/login.html'));
});

// 8) API: current user
app.get('/api/current-user', isAuthenticated, (req,res) => {
  res.json(req.session.user);
});

// 9) API: Users
app.get('/api/users', isAuthenticated, async (req,res) => {
  if (req.session.user.role === 'administrador') {
    return res.json(await User.find());
  }
  const u = await User.findById(req.session.user.id);
  res.json([u]);
});
app.get('/api/users/:id', isAuthenticated, async (req,res) => {
  const { id } = req.params;
  if (req.session.user.role !== 'administrador' && req.session.user.id !== id) {
    return res.status(403).json({ error:'denegado' });
  }
  res.json(await User.findById(id));
});
app.post('/api/users', isAuthenticated, isAdmin, async (req,res) => {
  try {
    await User.create(req.body);
    res.status(201).json({ success:true });
  } catch {
    res.status(400).json({ error:'no creado' });
  }
});
app.put('/api/users/:id', isAuthenticated, async (req,res) => {
  const { id } = req.params;
  if (req.session.user.role !== 'administrador' && req.session.user.id !== id) {
    return res.status(403).json({ error:'denegado' });
  }
  const data = { ...req.body };
  if (req.session.user.role !== 'administrador') delete data.role;
  try {
    await User.findByIdAndUpdate(id, data);
    res.json({ success:true });
  } catch {
    res.status(400).json({ error:'no modificado' });
  }
});

// 10) API: Objectives

// – Latest objective for current user (or filtered by ?user= for admin)
app.get('/api/objectives/latest', isAuthenticated, async (req, res) => {
  let who = req.session.user.username;
  if (req.session.user.role === 'administrador' && req.query.user) {
    who = req.query.user;
  }

  const filter = { createdBy: who };
  if (req.query.type === 'anual' || req.query.type === 'mensual') {
    filter.type = req.query.type;
  }

  const obj = await Objective.findOne(filter).sort({ createdAt: -1 });
  res.json(obj);
});

// – List objectives (own or filtered)
app.get('/api/objectives', isAuthenticated, async (req, res) => {
  let who = req.session.user.username;
  if (req.session.user.role === 'administrador' && req.query.user) {
    who = req.query.user;
  }
  const objs = await Objective.find({ createdBy: who })
                              .sort({ createdAt: -1 });
  res.json(objs);
});

// – Get by ID (only valid 24-hex ObjectId)
app.get('/api/objectives/:id([0-9a-fA-F]{24})', isAuthenticated, async (req, res) => {
  const obj = await Objective.findById(req.params.id);
  if (!obj) return res.status(404).json({ error: 'No encontrado' });
  if (
    obj.createdBy !== req.session.user.username &&
    req.session.user.role !== 'administrador'
  ) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  res.json(obj);
});

// – Create
app.post('/api/objectives', isAuthenticated, async (req, res) => {
  try {
    const d          = req.body;
    const year       = +d.year || 0;
    const cap        = Math.max(0, +d.captacionExclusiva);
    const anual      = Math.max(0, +d.objetivoAnual);
    const premio     = Math.max(0, +d.premioConvencion);
    const com        = Math.max(0, +d.comisionPromedioTransaccion);
    const suma       = Math.max(0, +d.sumaPrelistings);
    const trans      = com > 0 ? Math.ceil(anual / com) : 0;
    const totalAnual   = trans * suma;
    const totalMensual = Math.ceil(totalAnual / 12);

    const obj = new Objective({
      type:                         d.type,
      year,
      month:                        d.type === 'mensual' ? +d.month : undefined,
      captacionExclusiva:           cap,
      objetivoAnual:                anual,
      premioConvencion:             premio,
      comisionPromedioTransaccion:  com,
      sumaPrelistings:              suma,
      transaccionesNecesarias:      trans,
      totalAnualPrelistings:        totalAnual,
      totalMensualPrelistings:      totalMensual,
      createdBy:                    req.session.user.username
    });
    await obj.save();
    res.status(201).json({ success: true });
  } catch {
    res.status(400).json({ error: 'Ya existe un objetivo para este periodo.' });
  }
});

// – Update
app.put('/api/objectives/:id([0-9a-fA-F]{24})', isAuthenticated, async (req, res) => {
  try {
    const obj = await Objective.findById(req.params.id);
    if (!obj) return res.status(404).json({ error: 'No encontrado' });
    if (
      obj.createdBy !== req.session.user.username &&
      req.session.user.role !== 'administrador'
    ) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const d          = req.body;
    const year       = +d.year || 0;
    const cap        = Math.max(0, +d.captacionExclusiva);
    const anual      = Math.max(0, +d.objetivoAnual);
    const premio     = Math.max(0, +d.premioConvencion);
    const com        = Math.max(0, +d.comisionPromedioTransaccion);
    const suma       = Math.max(0, +d.sumaPrelistings);
    const trans      = com > 0 ? Math.ceil(anual / com) : 0;
    const totalAnual   = trans * suma;
    const totalMensual = Math.ceil(totalAnual / 12);

    await Objective.findByIdAndUpdate(
      req.params.id,
      {
        type:                         d.type,
        year,
        month:                        d.type === 'mensual' ? +d.month : undefined,
        captacionExclusiva:           cap,
        objetivoAnual:                anual,
        premioConvencion:             premio,
        comisionPromedioTransaccion:  com,
        sumaPrelistings:              suma,
        transaccionesNecesarias:      trans,
        totalAnualPrelistings:        totalAnual,
        totalMensualPrelistings:      totalMensual
      },
      { runValidators: true }
    );
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Error al actualizar.' });
  }
});

// – Delete
app.delete(
  '/api/objectives/:id([0-9a-fA-F]{24})',
  isAuthenticated,
  async (req, res) => {
    const obj = await Objective.findById(req.params.id);
    if (!obj) return res.status(404).json({ error: 'No encontrado' });
    if (
      obj.createdBy !== req.session.user.username &&
      req.session.user.role !== 'administrador'
    ) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    await obj.remove();
    res.json({ success: true });
  }
);

// 11) API: Trackeo Mensual
app.get('/api/trackeoMensual', isAuthenticated, async (req,res) => {
  let userId = req.session.user.id;
  if (req.session.user.role==='administrador' && req.query.userId) {
    userId = req.query.userId;
  }
  const year  = +req.query.year||0;
  const month = +req.query.month||0;
  const doc = await MonthlyTrack.findOne({ userId, year, month });
  if (!doc) return res.status(404).json({ error:'no encontrado' });
  res.json(doc);
});
app.get('/api/trackeoMensual/all', isAuthenticated, isAdmin, async (req,res) => {
  const filter = {};
  if (req.query.userId) filter.userId = req.query.userId;
  res.json(await MonthlyTrack.find(filter).sort({ createdAt:-1 }));
});
app.post('/api/trackeoMensual', isAuthenticated, async (req,res) => {
  const { year, month, valores } = req.body;
  try {
    const doc = new MonthlyTrack({
      userId:  req.session.user.id,
      year:    +year||0,
      month:   +month||0,
      valores: Object.fromEntries(
        Object.entries(valores||{}).map(([k,v]) => [k, Math.ceil(+v||0)])
      )
    });
    await doc.save();
    res.status(201).json({ success:true });
  } catch {
    res.status(400).json({ error:'ya existe o datos inválidos' });
  }
});
app.put('/api/trackeoMensual/:id', isAuthenticated, async (req,res) => {
  const doc = await MonthlyTrack.findById(req.params.id);
  if (!doc) return res.status(404).end();
  if (doc.userId.toString()!==req.session.user.id && req.session.user.role!=='administrador') {
    return res.status(403).end();
  }
  doc.valores   = Object.fromEntries(
    Object.entries(req.body.valores||{}).map(([k,v]) => [k, Math.ceil(+v||0)])
  );
  doc.updatedAt = Date.now();
  await doc.save();
  res.json({ success:true });
});
app.delete('/api/trackeoMensual/:id', isAuthenticated, async (req,res) => {
  const doc = await MonthlyTrack.findById(req.params.id);
  if (!doc) return res.status(404).end();
  if (doc.userId.toString()!==req.session.user.id && req.session.user.role!=='administrador') {
    return res.status(403).end();
  }
  await doc.remove();
  res.json({ success:true });
});

// 12) API: Trackeo Propiedades
app.get('/api/trackeoPropiedades', isAuthenticated, async (req,res) => {
  let userId = req.session.user.id;
  if (req.session.user.role==='administrador' && req.query.userId) {
    userId = req.query.userId;
  }
  res.json(await PropertyTrack.find({ userId }).sort({ createdAt:-1 }));
});
app.post('/api/trackeoPropiedades', isAuthenticated, async (req,res) => {
  try {
    await PropertyTrack.create({
      userId:            req.session.user.id,
      tipo:              req.body.tipo,
      propiedad:         req.body.propiedad,
      contrato:          req.body.contrato,
      precioPublicacion: Math.ceil(+req.body.precioPublicacion||0),
      precioAcm:         Math.ceil(+req.body.precioAcm||0),
      fechaCarga:        new Date(req.body.fechaCarga),
      valor:             req.body.valor
    });
    res.status(201).json({ success:true });
  } catch {
    res.status(400).json({ error:'datos inválidos' });
  }
});
app.put('/api/trackeoPropiedades/:id', isAuthenticated, async (req,res) => {
  const doc = await PropertyTrack.findById(req.params.id);
  if (!doc) return res.status(404).end();
  if (doc.userId.toString()!==req.session.user.id && req.session.user.role!=='administrador') {
    return res.status(403).end();
  }
  Object.assign(doc, {
    tipo:              req.body.tipo,
    propiedad:         req.body.propiedad,
    contrato:          req.body.contrato,
    precioPublicacion: Math.ceil(+req.body.precioPublicacion||0),
    precioAcm:         Math.ceil(+req.body.precioAcm||0),
    fechaCarga:        new Date(req.body.fechaCarga),
    valor:             req.body.valor,
    updatedAt:         Date.now()
  });
  await doc.save();
  res.json({ success:true });
});
app.delete('/api/trackeoPropiedades/:id', isAuthenticated, async (req,res) => {
  const doc = await PropertyTrack.findById(req.params.id);
  if (!doc) return res.status(404).end();
  if (doc.userId.toString()!==req.session.user.id && req.session.user.role!=='administrador') {
    return res.status(403).end();
  }
  await doc.remove();
  res.json({ success:true });
});

// DELETE /api/users/:id — Solo admin
app.delete('/api/users/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // Opcionalmente, evitamos que un admin se borre a sí mismo:
    if (req.session.user.id === req.params.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta.' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar usuario.' });
  }
});


// 13) Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}/login.html`));
