# Control de Accesos – 150 QR de un solo uso

```
control-accesos/
├── index.html
├── style.css
├── app.js
├── config.js        ← pegar URL + clave anon/publishable
├── sql/setup.sql    ← tabla + 150 códigos + funciones
└── README.md
```

## 1. Supabase
1. Crear proyecto en supabase.com.
2. SQL Editor → pegar `sql/setup.sql` → Run.
3. Project Settings → API: copiar **Project URL** y la clave **anon / publishable** a `config.js`.

## 2. Probar local
```
npx serve .
```
Abrir http://localhost:3000 (la cámara funciona en localhost o HTTPS).

## 3. GitHub + Vercel
```
git init
git add .
git commit -m "Control de accesos QR"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/control-accesos.git
git push -u origin main
```
Vercel → Add New → Project → importar repo → Framework: **Other** → Deploy.

## Utilidades SQL
```sql
-- ver estado
select status, count(*) from qr_codes group by status;
-- resetear un QR usado en pruebas
update qr_codes set status='AVAILABLE', used_at=null where code='QR-001';
-- resetear todo antes del evento
update qr_codes set status='AVAILABLE', used_at=null;
```

⚠️ Nunca subas al repo la lista de tokens ni el PDF de QR.
