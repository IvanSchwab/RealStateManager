-- En Supabase Studio → SQL Editor

-- Ver los usuarios y sus profiles
SELECT p.id, p.email, p.role, p.full_name
FROM profiles p;

-- Promover a admin (reemplazá el email con el tuyo)
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@test.com';

-- Verificar
SELECT * FROM profiles WHERE email = 'admin@test.com';
```

---

## 🧪 **Testing del Login**
```
1. Ir a http://localhost:5173
   → Debería redirigir a /login automáticamente

2. Ingresar credenciales:
   Email: admin@test.com
   Password: password123

3. Click "Sign In"
   → Debería redirigir a Dashboard (/)

4. Verificar TopBar:
   → Debe mostrar email
   → Debe mostrar badge "admin"
   → Dropdown debe tener "Sign out"

5. Ir a /properties
   → Debería funcionar (ver la propiedad de prueba)

6. Click "Sign out"
   → Debería redirigir a /login

7. Intentar ir a /properties sin login
   → Debería redirigir a /login con ?redirect=/properties
```

---

## 📸 **Si Algo No Funciona**

Mostrá:
1. Screenshot de la consola del navegador (F12 → Console)
2. ¿Qué error específico ves?
3. ¿En qué paso falla? (creación de user, login, redirect, etc.)

---

## 💡 **Nota sobre "Auto Confirm User"**

Es **crítico** marcar "Auto Confirm User" cuando creás el usuario en Studio. Si no lo marcás:
- El usuario quedará como "no confirmado"
- Supabase esperará que confirme su email
- No va a poder logearse
- Verás error "Email not confirmed"

**Para desarrollo local, SIEMPRE marcar Auto Confirm User.**

---

## 🎯 **Resumen Rápido**
```
1. Studio → Authentication → Users → Add user
2. Email: admin@test.com
   Password: password123
   ✅ Auto Confirm User: YES

3. SQL Editor:
   UPDATE profiles SET role = 'admin' 
   WHERE email = 'admin@test.com';

4. Refrescar http://localhost:5173
5. Login con las credenciales
6. ✅ Deberías ver el Dashboard