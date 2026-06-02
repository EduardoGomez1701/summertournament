# 🏀 Torneo Veraneal de Baloncesto - Guía de Instalación

## Requisitos
- Node.js 14+ instalado
- npm (viene con Node.js)

## Instalación y Ejecución

### 1. Instalar dependencias
```bash
npm install
```

### 2. Iniciar el servidor
```bash
npm start
```

El servidor se iniciará en `http://localhost:3000`

```
🏀 Servidor Torneo Veraneal iniciado
📍 http://localhost:3000
📱 Celulares: http://<IP_DE_TU_COMPUTADORA>:3000
💻 Admin: http://localhost:3000/admin.html
```

### 3. Acceder desde computadora
- **Formulario**: http://localhost:3000
- **Panel Admin**: http://localhost:3000/admin.html

### 4. Acceder desde celulares
Reemplaza `<IP_DE_TU_COMPUTADORA>` con la IP de tu computadora en la red local:

```
http://192.168.1.xxx:3000
```

Para encontrar tu IP local:
- **Windows**: Abre cmd y ejecuta `ipconfig` (busca "IPv4 Address")
- **Mac/Linux**: Abre terminal y ejecuta `ifconfig` (busca "inet addr")

## Contraseña Admin
Por defecto: `123`

Puedes cambiarla editando `app.js` y buscando `ADMIN_PASS`

## Datos
Los registros se guardan en `registros.json` en la misma carpeta del servidor.

### Hacer backup
Descarga el archivo `registros.json` o usa la opción "Descargar JSON" en el admin.

### Restaurar datos
En el admin, usa "Importar JSON" para cargar un archivo anterior.

## Solución de problemas

### Los celulares no se conectan
- Asegúrate de usar la IP local correcta (no localhost)
- Verifica que ambos dispositivos estén en la misma red WiFi
- Desactiva firewall temporalmente para probar

### No ve los registros en el admin
- Espera 2-3 segundos después de enviar la inscripción
- Recarga la página del admin (F5)
- Verifica que el servidor esté corriendo

### Error "Cuota excedida"
Ya no debería ocurrir con el servidor. Si sucede, limpia el navegador y vuelve a intentar.

---

**¿Preguntas?** Revisa la consola del navegador (F12) para mensajes de error.
