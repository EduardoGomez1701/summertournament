/* =====================================================
   SERVIDOR - Torneo Veraneal de Baloncesto
   Sincroniza inscripciones entre dispositivos
   ===================================================== */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'registros.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// Cargar/guardar registros
function getRegistros() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error leyendo registros:', e);
  }
  return [];
}

function saveRegistros(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Error guardando registros:', e);
    return false;
  }
}

/* ===== API ENDPOINTS ===== */

// Obtener todos los registros
app.get('/api/registros', (req, res) => {
  const registros = getRegistros();
  res.json(registros);
});

// Guardar un nuevo registro
app.post('/api/registros', (req, res) => {
  try {
    const newPlayer = req.body;
    if (!newPlayer.id) {
      return res.status(400).json({ error: 'ID requerido' });
    }

    let registros = getRegistros();
    
    // Evitar duplicados
    const exists = registros.some(p => p.id === newPlayer.id);
    if (exists) {
      return res.status(409).json({ error: 'Registro duplicado' });
    }

    registros.push(newPlayer);
    if (saveRegistros(registros)) {
      console.log(`✅ Nuevo registro: ${newPlayer.nombre} ${newPlayer.apellido}`);
      res.json({ success: true, message: 'Registro guardado' });
    } else {
      res.status(500).json({ error: 'Error guardando registro' });
    }
  } catch (e) {
    console.error('Error en POST:', e);
    res.status(500).json({ error: e.message });
  }
});

// Importar lote de registros
app.post('/api/registros/batch', (req, res) => {
  try {
    const imported = req.body;
    if (!Array.isArray(imported)) {
      return res.status(400).json({ error: 'Debe ser un array' });
    }

    let registros = getRegistros();
    let added = 0;

    imported.forEach(p => {
      const exists = registros.some(ep => 
        (ep.documento && ep.documento === p.documento) || 
        (ep.id && ep.id === p.id)
      );
      if (!exists) {
        registros.push(p);
        added++;
      }
    });

    if (added > 0 && saveRegistros(registros)) {
      console.log(`✅ Importado: ${added} registros nuevos de ${imported.length}`);
      res.json({ success: true, added, total: registros.length });
    } else {
      res.json({ success: true, added: 0, message: 'Sin nuevos registros' });
    }
  } catch (e) {
    console.error('Error en batch:', e);
    res.status(500).json({ error: e.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\n🏀 Servidor Torneo Veraneal iniciado`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`\n📱 Celulares: http://<IP_DE_TU_COMPUTADORA>:${PORT}`);
  console.log(`💻 Admin: http://localhost:${PORT}/admin.html\n`);
});
