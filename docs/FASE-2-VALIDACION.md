# Fase 2: auditoría y bloqueo de seguridad

## Implementado

Cliente con configuración pública validada; registro/login/logout por Nhost SDK 3.3.1; suscripciones de sesión/token con limpieza; restauración de sesión; rechazo de sesiones anónimas/sin rol `user`; calculadora pública; ruta privada; listado paginado; formularios y mutaciones de alta/edición. Las fichas se retiran al cerrar sesión y las respuestas de consultas desmontadas se descartan.

Se fija el SDK verificado y se agrega lockfile. No se asumió la API de la versión 4. El SDK 3.x tiene avisos de deprecación; una migración queda fuera de esta entrega.

## Estado real

No hay configuración pública de Nhost ni credenciales A/B disponibles en la máquina. Se eligió continuar sin credenciales de prueba. No se ejecutaron consultas ni mutaciones contra la base existente y no se certifica su aislamiento. No se editaron permisos, tablas, relaciones, triggers ni datos remotos. Ningún fallo simulado demuestra seguridad del servidor.

Las escrituras quedan detenidas en la UI y en `saveAthlete` con `ATHLETE_WRITES_VERIFIED = false`. No está completa la aceptación funcional de altas/ediciones ni aislamiento A/B hasta validar contra Hasura real. El listado también necesita configuración pública y SELECT correcto: su funcionamiento contra el proyecto real sigue pendiente.

## Permisos por verificar antes de habilitar escrituras

No se obtuvo metadata administrativa: esta matriz es el requisito, **no una afirmación de permisos presentes o ausentes**. El documento original indica SELECT parcial y posibles INSERT/UPDATE pendientes.

| Tabla | Operaciones del rol `user` | Filtro/check/preset requerido | Columnas editables |
| --- | --- | --- | --- |
| `professional_profiles` | SELECT, INSERT, UPDATE; sin DELETE | SELECT/UPDATE: `id = X-Hasura-User-Id`; INSERT: preset `id` desde sesión y check de identidad | `full_name`, `profession`; nunca actualizar `id` |
| `athletes` | SELECT, INSERT, UPDATE; sin DELETE | SELECT/UPDATE y check posterior: `professional_id = X-Hasura-User-Id`; INSERT con mismo check y preset de sesión | `full_name`, `birth_date`, `notes`; nunca reasignar `id` ni `professional_id` |
| `assessments` | SELECT, INSERT, UPDATE; sin DELETE | Propiedad por sesión en filtros/checks; preset de `professional_id` al insertar; `athlete_id` del mismo profesional, también al actualizar | Campos clínicos permitidos; nunca actualizar `id` ni `professional_id` |
| `calculation_results` | SELECT, INSERT; sin UPDATE/DELETE | Propiedad por sesión en filtros/checks; preset de `professional_id`; evaluación del mismo profesional | Campos de resultado permitidos al insertar |

Para `anonymous` y `public`: ninguna operación sobre estas cuatro tablas. En SELECT exponer solo columnas necesarias; revisar computed fields, vistas, funciones y permisos heredados para evitar rutas alternativas. Nunca resolver errores otorgando admin, usando un secreto en el cliente o tomando `professional_id` del formulario.

El administrador debe revisar las FKs compuestas que vinculan evaluaciones/deportistas y resultados/evaluaciones por identificador **y profesional**. Una FK simple al `id` no garantiza aislamiento. Esta tarea no instala ni modifica restricciones en producción.

También queda pendiente aprobar cómo se crea el perfil profesional de un usuario nuevo. La autenticación no garantiza que exista la fila referenciada en `professional_profiles`.

## Evidencia para cerrar la fase

1. Confirmar subdominio/región, Auth, correo confirmado, rol `user`, CORS y URLs de redirección.
2. Preparar una copia aislada aprobada con cuentas A/B y perfiles; revisar permisos, presets y FKs sin exponer secretos.
3. Ejecutar `npm run test:integration` con las variables seguras del README. Crear/leer/editar fichas propias y negar lecturas/ediciones/asociaciones ajenas en ambos sentidos. Conservar resultados, fecha y revisión de metadata, nunca tokens ni contraseñas.
4. Si falta una regla, mantener escrituras bloqueadas y pedir aprobación para el cambio concreto en Nhost. No modificar la base existente desde el frontend.
5. Habilitar escrituras mediante un cambio revisado después de aprobar esa evidencia. No ingresar datos reales antes de la aprobación.

Pruebas locales y compilación se informan por separado en el PR. La suite real omitida no debe contabilizarse como aprobada.
