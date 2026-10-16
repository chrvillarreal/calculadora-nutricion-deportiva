# Auditoría técnica del PR #1 — 16 de octubre de 2026

Repositorio: chrvillarreal/calculadora-nutricion-deportiva. Rama: `feat/nhost-auth-athletes`. Base auditada: `3ed4383`; PR abierto hacia `main`, confirmado mediante GitHub API y `refs/pull/1/head`. La línea base tenía 42 pruebas locales, no 40. No se reconstruyeron las funcionalidades existentes.

**Recomendación: no fusionar todavía como Fase 2 terminada.** Las correcciones locales están verificadas, pero el aislamiento real, el esquema y los permisos de Nhost/Hasura siguen sin evidencia. Mantener las escrituras bloqueadas hasta cerrar esos requisitos. No hubo merge, despliegue ni cambios a la base remota.

## Funcionalidades auditadas

| Área | Estado y evidencia | Limitación |
| --- | --- | --- |
| Login/logout | Corregido el bloqueo de Auth causado por StrictMode; Chromium ejecutó el SDK 3.3.1 real con Auth simulado y completó login, listado y logout | No se probaron credenciales contra Nhost real |
| Registro | SDK `signUp` verificado, validación y confirmación por correo cubiertas localmente; errores genéricos sin tokens | Registro, entrega de email y redirección reales pendientes; no se crearon usuarios remotos |
| Persistencia/restauración | SDK administra el almacenamiento/refresh; restauración con límite de 12 s y reintento; se respeta el booleano de `isAuthenticatedAsync` | Refresh y persistencia entre recargas con Nhost real pendientes |
| Expiración/renovación | Se rechazan sesiones vencidas en la UI y antes de GraphQL; temporizador retira fichas aunque falte `SIGNED_OUT`; `TOKEN_CHANGED` renueva el plazo | La comprobación local de expiración no sustituye validación de JWT/revocación en Hasura |
| Rutas privadas | Sin sesión, con sesión anónima o sin rol `user`, no se consulta el listado; las fichas se retiran al cerrar/expirar sesión | La ruta del navegador no constituye autorización del servidor |
| Secretos/GraphQL | Cliente solo recibe dos variables públicas; no hay secreto admin ni identidad profesional enviada por formularios; en Chromium se inspeccionó Bearer y `x-hasura-role: user`, sin header admin | Nhost SDK incluye APIs administrativas genéricas en su paquete, pero la aplicación no las configura ni usa |
| Deportistas: listado | Paginación, orden estable por nombre/id, carga, vacío, error/reintento y notas como texto cubiertos localmente; listado sintético verificado a 375 px | SELECT/propiedad y nombres/tipos reales de PostgreSQL/GraphQL sin verificar |
| Deportistas: alta/edición | Formularios, validación y documentos GraphQL conservados; lista explícita de `full_name`, `birth_date`, `notes`; `professional_id`/`id` adicionales se descartan | Altas y ediciones reales continúan intencionalmente bloqueadas; no son funcionalidades habilitadas |
| Calculadora | Fórmula masculina/femenina, IMC, GET, factores 4/4/9, precisión interna, balance de macros y límites aritméticos comprobados | Estimaciones matemáticas para adultos; sin validación clínica de objetivos o recomendaciones individualizadas |
| Accesibilidad/responsive | Labels asociados, navegación semántica, foco visible, controles deshabilitados y errores anunciados; Chromium a 320/375/1280 px sin desborde en calculadora/acceso; listado sintético con nombre/notas extensos a 375 px | No es certificación WCAG completa ni prueba exhaustiva con lectores de pantalla/Safari/iOS |
| TypeScript/Vercel | Strict TypeScript y compilación Vite correctos; lockfile actualizado; Node 24.x declarado; README documenta build `dist` y navegación hash sin rewrites | No se accedió a la configuración real de Vercel ni se desplegó |

## Hallazgos y correcciones

No se confirmó ningún P0 de la aplicación ni una filtración real entre profesionales. La falta de credenciales no permite descartar vulnerabilidades en el backend.

| Gravedad | Problema reproducido | Corrección y commit |
| --- | --- | --- |
| P1 | En SDK 3.3.1, los cleanups devueltos por `onAuthStateChanged`/`onTokenChanged` llaman al `stop()` del intérprete XState. React StrictMode ejecutaba cleanup/setup al montar y detenía Auth; el login quedaba pendiente sin emitir HTTP. Los mocks originales ocultaban el fallo | Puente único por cliente mediante WeakMap; cada componente elimina solo su listener local. Regresión con SDK real en StrictMode y navegador con backend interceptado. `4979426` |
| P1 | `isAuthenticatedAsync()` puede no resolverse offline según el SDK; la ruta quedaba en “Restaurando sesión…” indefinidamente. Además se ignoraba su resultado booleano y se tomaba el snapshot aun si devolvía false | Límite de 12 s, error/reintento, descarte de respuestas obsoletas y respeto de `authenticated`. `bd29188`; reintento compatible con puente corregido en `4979426` |
| P1 | Se aceptaba una sesión con `accessTokenExpiresIn <= 0`; las fichas podían permanecer visibles sin evento de salida. El preflight GraphQL tampoco comprobaba vigencia | Validador compartido y temporizador renovado con eventos de token. Se retiran fichas y se rechazan solicitudes con snapshots vencidos. `bd29188` |
| P1 | Entradas finitas extremas podían producir Infinity/NaN; sexo inválido se trataba silenciosamente como femenino; campos vacíos de proteína/grasa se convertían en cero | Validar sexo, resultados positivos/finitos y desbordamientos de macros; mantener vacío como inválido y anunciar error. Se conservan fórmulas y precisión. `a5f89ae` |
| P1 contextual | `npm audit` detectó dos avisos críticos en tinypool y uno moderado en @vitest/mocker, propagados por Vitest 3.2.7. Son dependencias de pruebas: no se demostró explotación en el bundle de producción | Actualizar a Vitest 5.0.5 compatible con Vite 6.4.4, actualizar lockfile y declarar Node 24.x. Audit posterior: cero avisos. `d6b7cf6` |

Referencias de los avisos de dependencias: GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr y GHSA-82fw-gwwq-j7x9. La gravedad contextual P1 no implica que se haya probado una vulnerabilidad crítica explotable de la aplicación en producción.

## P1 pendientes que bloquean aceptación

Estos son requisitos de aceptación sin validar, no vulnerabilidades confirmadas:

- Aislamiento A/B real en las cuatro tablas y ausencia de acceso público. No hay variables Nhost ni dos cuentas de prueba en la máquina; se mantuvo la decisión de continuar sin credenciales.
- Presets y filtros por `X-Hasura-User-Id`, columnas permitidas, checks posteriores y FKs compuestas. El bloqueo del frontend no impide que un cliente externo envíe GraphQL: Hasura debe autorizar cada operación.
- Concordancia con PostgreSQL real: se usa el contrato del documento de Fase 2; no se obtuvieron tipos, nullability, defaults, enums, relaciones ni schema GraphQL reales. Los documentos `uuid`, `_insert_input` y `_set_input` requieren comprobación autorizada.
- Aprovisionamiento de `professional_profiles` para nuevos usuarios: el registro de Auth no crea esa fila. No se añadió escritura automática ni se alteró la base sin aprobación.

## P2 y límites que se conservan

- SDK Nhost 3.x deprecado. Se mitigó el defecto concreto de suscripciones sin una migración amplia; una migración a 4.x requiere otra tarea y validación real.
- MFA no implementado; se informa la falta de sesión. Recuperación de contraseña/cambio de email no forman parte de esta Fase 2.
- Las llamadas de login/registro/GraphQL siguen dependiendo de los plazos y el transporte del SDK; el límite añadido cubre la restauración del estado de la UI, no cancela peticiones del SDK. Evitar afirmar que todos los fallos de red tienen cancelación garantizada.
- La suite de integración emplea tipos de respuesta amplios; generar tipos a partir del esquema autorizado cuando esté disponible. Los errores de formularios podrían asociarse además por campo con `aria-describedby`/`aria-invalid`.
- No se añaden límites fisiológicos arbitrarios ni recomendaciones nutricionales automáticas; requieren criterio profesional independiente de la validación aritmética.

## Resultados de validación

- `npm test`: **65 aprobadas**, 9 archivos. Incluye SDK real con auto-signin deshabilitado, sin acceso a backend, y nuevas regresiones de sesión/expiración/renovación/cálculos.
- `npm run build`: **aprobado**, TypeScript y Vite, bundle generado.
- `npm run test:integration`: TypeScript de la suite aprobado; **7 pruebas omitidas**, ninguna aprobada contra Hasura real.
- `npm audit`: **0 vulnerabilidades conocidas** en la resolución instalada al finalizar (antes: 2 critical, 1 moderate). No equivale a una auditoría completa de dependencias.
- Chromium sin backend: calculadora/acceso a **320, 375 y 1280 px**, valores esperados, validación de vacío y ruta privada; sin errores de ejecución ni desbordes.
- Chromium con **SDK real y respuestas HTTP simuladas**: login, sesión, dos consultas GraphQL con Bearer y rol user, listado sintético a 375 px, altas bloqueadas y logout. No se contactó Nhost ni se usaron datos personales. Esto valida la integración del cliente, no permisos multiusuario reales.
- `git diff --check`: sin errores. Cambios conservados en la misma rama del PR #1.

## Pruebas reales necesarias antes de fusionar

Seguir README y `FASE-2-VALIDACION.md` con una copia aislada aprobada y dos cuentas ficticias confirmadas y con perfiles. Revisar metadata sin editar permisos ni esquema. Ejecutar la suite real y registrar:

1. A y B crean/leen/editan sus propias fichas, con identidad fijada por sesión.
2. A no lee ni modifica datos de B, y viceversa; tampoco por identificador directo, operaciones alternativas o asociaciones cruzadas de evaluaciones/resultados.
3. `anonymous`/`public` no exponen tablas personales y el rol user no puede reasignar identidad ni usar operaciones prohibidas.
4. Auth real: registro, confirmación de correo, recarga de página, refresh, token vencido/revocado, cierre de sesión y redirecciones.
5. Coincidencia de campos/tipos/defaults/relaciones, CORS y orígenes autorizados. Si falta una regla, documentarla y solicitar aprobación para el cambio concreto; mantener escrituras bloqueadas.

Hasta contar con esa evidencia, **no recomiendo fusionar el PR como implementación completa de Fase 2 ni habilitar uso con datos reales**.
