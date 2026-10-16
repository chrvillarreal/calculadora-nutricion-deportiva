# NutriSport Lab

Calculadora de nutrición deportiva con React 19, TypeScript y Vite. La calculadora funciona sin cuenta ni persistencia. La Fase 2 añade registro, acceso/cierre de sesión, restauración de sesión y una ruta privada de deportistas.

**Estado de seguridad:** las altas y ediciones están implementadas pero bloqueadas hasta revisar los permisos de Hasura y aprobar pruebas reales con dos cuentas. No ingresar datos reales. Los mocks y controles del navegador no acreditan seguridad del servidor. Ver [validación pendiente de Fase 2](docs/FASE-2-VALIDACION.md).

## Desarrollo local

Se requiere Node 24.x (declarado en package.json); validado con Node 24.19.0 y npm 11.9.0. El lockfile conserva las versiones probadas.

```bash
npm ci
cp .env.example .env.local
# Completar únicamente las dos variables públicas en .env.local.
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

Sin configuración de Nhost se mantiene la calculadora y se muestra un aviso en el acceso profesional. No se inicializa el SDK ni se consultan fichas. Reiniciar Vite después de cambiar variables.

| Variable pública | Valor |
| --- | --- |
| `VITE_NHOST_SUBDOMAIN` | Subdominio exacto de Nhost Settings, sin URL |
| `VITE_NHOST_REGION` | Región exacta de Nhost Settings; confirmar el identificador de São Paulo |

El documento de Fase 2 identifica el proyecto existente como `nwjypkxthlvrtwlrfntu`; confirmar su configuración pública en Nhost antes de usarla. No se ha comprobado su conectividad ni su autorización en esta entrega. Nunca agregar secretos administrativos, tokens ni claves de servidor a `VITE_*`: Vite las incorpora al JavaScript público.

## Funcionalidades

- `#calculadora`: IMC, metabolismo basal, gasto total y macronutrientes, sin persistencia.
- `#acceso`: registro por correo/contraseña, confirmación por correo y login. El servidor debe habilitar estas opciones. El desafío MFA queda fuera de esta entrega: las cuentas que lo requieran reciben un aviso y no obtienen acceso sin completarlo.
- `#deportistas`: exige sesión no anónima con rol `user`; listado paginado, carga/vacío/error y reintento.
- Formularios de alta/edición: nombre, nacimiento y notas, validación y envío exclusivo de campos permitidos. Botones y servicio bloqueados mediante `ATHLETE_WRITES_VERIFIED = false` hasta aprobación de seguridad.
- Cierre/expiración de sesión retira las fichas de la interfaz. No se guardan fichas localmente.

El registro crea una cuenta en Nhost Auth cuando un usuario lo solicita; no provisiona automáticamente `professional_profiles`. Antes de habilitar altas debe aprobarse el aprovisionamiento del perfil vinculado. No se cambian tablas, permisos, triggers ni datos del proyecto existente desde esta tarea.

## SDK auditado

Se conserva y fija `@nhost/nhost-js` **3.3.1**, versión realmente instalada, con lockfile. Se verificaron declaraciones y código distribuidos: `new NhostClient({ subdomain, region })`, `auth.signUp`, `auth.signIn`, `auth.signOut`, `auth.isAuthenticatedAsync`, `auth.getSession`, `auth.onAuthStateChanged`, `auth.onTokenChanged` y `graphql.request`.

El SDK sincroniza el token de usuario con GraphQL y renueva la sesión. Un puente único de eventos evita que el cleanup defectuoso del SDK 3.3.1 detenga Auth durante React StrictMode; los componentes solo eliminan sus listeners locales. La restauración de sesión tiene un límite de 12 segundos y reintento; las fichas se ocultan al vencer el token. Las solicitudes fuerzan rol `user` y comprueban sesión/token antes de enviarse. No existe cliente administrador ni se envía `professional_id` desde los formularios. Hasura debe aplicar el preset y los filtros de propiedad del servidor.

Nhost ha deprecado la rama 3.x. Migrar a 4.x requiere una tarea separada con adaptación de API y pruebas reales. No se asume que las APIs de ambas versiones sean equivalentes.

## Pruebas y compilación

```bash
npm test
npm run build
npm run test:integration
```

`npm test` ejecuta cálculo, configuración, sesión/rutas, formularios y servicio GraphQL con dobles de prueba. Estas pruebas **no acreditan aislamiento real**. `npm run build` comprueba TypeScript y genera `dist/`.

`test:integration` comprueba tipos de la suite y omite Hasura por defecto. Para ejecutarlo se requiere una **copia aislada aprobada**, con el mismo esquema/permisos, dos cuentas confirmadas con rol `user` y perfiles profesionales ya provisionados. Cargar exclusivamente en el proceso de pruebas (fuera del repositorio, sin prefijo `VITE_`):

- `NHOST_TEST_ISOLATED=true`: autorización explícita del operador para crear datos ficticios en esa copia.
- `NHOST_TEST_SUBDOMAIN`, `NHOST_TEST_REGION`: configuración pública de la copia.
- `NHOST_TEST_EMAIL_A`, `NHOST_TEST_PASSWORD_A`, `NHOST_TEST_EMAIL_B`, `NHOST_TEST_PASSWORD_B`: credenciales seguras de dos identidades distintas.

La suite rechaza el identificador del proyecto existente indicado en Fase 2. No usa secretos administrativos, no crea cuentas/perfiles ni modifica el esquema y no ejecuta deletes. Deja fixtures ficticios `CODEX ... AISLADO` para revisión/limpieza por el administrador de la copia; no conceder delete a `user` para limpiar tests. Un fallo de red no cuenta como autorización denegada. Los valores de ejemplo de `goal`/fórmulas deben coincidir con las restricciones reales de la copia antes de ejecutar, sin relajar controles de autorización.

Comprueba exposición pública de las cuatro tablas, inputs sin identidad editable, operaciones prohibidas, perfiles aislados, altas/lecturas/ediciones propias, lecturas/ediciones ajenas y asociaciones cruzadas de evaluaciones/resultados en ambos sentidos. La revisión de filtros y FKs compuestas sigue siendo necesaria: la introspección del rol `user` no revela toda la metadata.

## Configuración pendiente

Ver [la matriz de permisos](docs/FASE-2-VALIDACION.md). Confirmar correo/contraseña, verificación de email, rol `user`, URLs de cliente/redirección y CORS. No dar acceso a datos personales a `anonymous`/`public`.

Para habilitar escrituras: revisar permisos/presets y relaciones en una copia aislada, aprobar la suite real A/B, registrar evidencia y realizar un cambio revisado de `ATHLETE_WRITES_VERIFIED` en `src/athletes/api.ts`. No habilitar con una variable pública ni eliminar el bloqueo para resolver errores de permisos. El bloqueo no reemplaza las reglas del servidor.

## Vercel (instrucciones; no se ejecutó despliegue)

Importar el repositorio con preset Vite, instalación `npm ci`, compilación `npm run build` y salida `dist`. Configurar las dos variables públicas por entorno y agregar el origen autorizado en Nhost/Hasura. La navegación usa hashes y no necesita rewrite SPA. Nunca configurar secretos administrativos en el frontend o en `VITE_*`.

Validar primero un entorno de pruebas y revisar el PR. No activar producción ni fusionar a `main` hasta aprobar aislamiento y configuración. No se ejecutaron despliegues desde esta tarea.

## Auditoría del PR #1

Ver [informe técnico, correcciones y bloqueos de aceptación](docs/AUDITORIA-PR-1.md). La seguridad multiusuario real sigue pendiente; las pruebas locales no autorizan habilitar escrituras.
