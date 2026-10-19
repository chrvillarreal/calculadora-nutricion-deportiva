# NutriSport Pro — MVP 1.0 local

Aplicación profesional gratuita, sin cuentas. Etapas 1 y 2 sobre NutriSport Lab: React, TypeScript, Vite e IndexedDB mediante Dexie. No requiere variables de entorno, Nhost ni servicios de datos.

## Desarrollo y verificación

Node 24.x y npm. Versiones reproducibles en package-lock.json.

```bash
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run preview
```

Las pruebas E2E sirven el build local en 127.0.0.1:4173. Se admite `CHROMIUM_PATH` para un ejecutable local de Chromium. La prueba de actualización modifica temporalmente `dist/sw.js` y lo restaura en `finally`; ejecutarla solo contra el preview local aislado, no contra un despliegue. `npm run dev` inicia Vite; la PWA se registra solo en builds. Usá preview para probar offline.

## Funciones

- Dashboard adaptable, navegación Inicio, Alumnos, Calculadoras, Evaluaciones, Seguimiento y Configuración.
- CRUD de alumnos, búsqueda, fichas y eliminación de evaluaciones en cascada.
- IMC, Mifflin-St Jeor, gasto total y macros originales, con límites operativos y validación reforzada; impresión nativa conservada.
- Evaluaciones con fecha, inputs, notas, versión de ecuación y cálculo reproducible.
- Seguimiento en tabla cronológica con diferencia de peso entre registros.
- Copias JSON v2 exportables (importación compatible con v1 y v2); importación validada y reemplazo transaccional confirmado por el usuario.
- Ejemplo ficticio opcional e idempotente. No se crean datos al iniciar.

## Privacidad y persistencia

Los datos se guardan en IndexedDB, por navegador, perfil y origen (protocolo/dominio/puerto). No hay cuentas, sincronización, telemetría ni API de alumnos. Se eliminó el SDK Nhost no utilizado. La CSP bloquea conexiones a terceros; permite recursos del mismo origen para la fuente PDF y el service worker; los recursos de la aplicación se sirven desde el mismo origen. El alojamiento puede registrar visitas y datos técnicos de conexión; esta app no envía fichas ni evaluaciones. El enlace bibliográfico externo se abre solo por acción del usuario, sin datos de alumnos ni referrer.

No hay cifrado propio ni bloqueo de acceso: quien accede al perfil del navegador puede leer los datos. Usar alias y recolectar solo lo necesario. El JSON contiene datos legibles: proteger las copias y no compartirlas sin autorización. El modo privado, borrar datos, desinstalar el navegador o la presión de almacenamiento pueden borrar registros. Cambiar de dominio requiere exportar e importar una copia. La solicitud de persistencia depende del navegador y no sustituye backups.

## Respaldo y restauración

Configuración → Exportar copia JSON. Guardar regularmente fuera del navegador en un destino protegido. Para restaurar: seleccionar archivo, revisar cantidades, pulsar reemplazar y confirmar. Reemplaza todos los alumnos y evaluaciones; no fusiona. Antes exportar la versión actual. Se validan formato, versión, campos exactos, IDs, unicidad, fechas, longitudes, inputs, ecuaciones, planes y referencias. La exportación valida la copia compacta antes de descargarla para evitar producir respaldos que no se puedan importar. Límite: 5 MB, 5.000 alumnos, 20.000 evaluaciones por copia. El fallo de validación no escribe; un fallo de escritura revierte la transacción completa.

## Alcance y fundamentos

Ver [métodos y límites](docs/METODOS.md), [auditoría previa](docs/AUDITORIA-LOCAL-MVP.md) e [informe de entrega](docs/ENTREGA-MVP-LOCAL.md). La documentación Nhost anterior se conserva solo como antecedente; no aplica a esta rama. No se integró ni fusionó PR #1.

## Etapa 2 implementada

Harris-Benedict revisada 1984 y Cunningham 1980, comparador con supuestos explícitos, planificación en g/kg o porcentajes, ajuste energético y reparto por comidas. Gráficos con filtros y datos reales. Informe PDF local descargable desde el historial; se conserva la impresión del navegador. PWA con recursos precacheados, uso sin conexión y actualización a pedido sin borrar IndexedDB.

Los registros v1 mantienen fórmula y resultados. Nuevos registros schemaVersion 2 conservan método y plan completo. Backups v2 admiten ambos; se siguen importando backups v1. No bajar a una versión anterior después de crear datos nuevos sin respaldarlos.

Ver [informe de etapa 2](docs/ENTREGA-ETAPA-2.md) y [política de PWA](docs/PWA-LOCAL.md). No hay despliegue ni merge desde esta entrega.
