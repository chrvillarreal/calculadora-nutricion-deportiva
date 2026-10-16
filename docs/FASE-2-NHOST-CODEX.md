# Fase 2 — Integración Nhost y seguridad multiusuario

## Contexto
Proyecto NutriSport Lab. Frontend React/TypeScript/Vite; Nhost PostgreSQL + Hasura GraphQL + Auth. Nhost project id: `nwjypkxthlvrtwlrfntu` (región São Paulo). No usar secretos de administración en el navegador.

Tablas ya creadas directamente en Nhost:
- `public.professional_profiles`: `id` FK `auth.users.id`, `full_name`, `profession`, `created_at`
- `public.athletes`: `id`, `professional_id`, `full_name`, `birth_date`, `notes`, `created_at`
- `public.assessments`: `id`, `athlete_id`, `professional_id`, `assessment_date`, `weight_kg`, `height_cm`, `body_fat_pct`, `activity_factor`, `goal`, `created_at`
- `public.calculation_results`: `id`, `assessment_id`, `professional_id`, `formula_key`, `formula_version`, `inputs`, `result_value`, `result_unit`, `created_at`

## Trabajo para Codex
1. Inspeccionar código y versión real del SDK Nhost instalado. Confirmar API de inicialización y autenticación; no asumir métodos.
2. Crear un cliente Nhost usando exclusivamente variables públicas `VITE_NHOST_SUBDOMAIN` y `VITE_NHOST_REGION` (o la configuración pública que requiera el SDK); validar que estén presentes, documentar configuración. No registrar tokens en consola.
3. Implementar registro/login/logout, estado de sesión y rutas privadas. No crear acceso público a fichas. Mantener calculadora accesible sin persistencia si no hay sesión.
4. Añadir pantalla autenticada de listado/alta/edición de deportistas. Todas las consultas y mutaciones se ejecutan con token de usuario y rol `user`, jamás admin. El servidor determina `professional_id`; nunca confiar en un identificador enviado por el cliente.
5. Si faltan permisos en Hasura, DETENER las mutaciones y documentar exactamente qué permisos faltan; no modificar la base de producción sin autorización.
6. Tests: estados no autenticados, errores, carga, validación de formularios, y seguridad con dos cuentas de prueba distintas. Confirmar que A no puede leer/modificar datos de B. Las pruebas de autorización deben realizarse contra Hasura real con credenciales de prueba o entorno aislado; no declarar éxito con mocks.
7. Añadir README con instrucciones de configuración local, tests y despliegue a Vercel.
8. Entregar PR de una rama nueva para revisión; no desplegar producción ni hacer merge automático.

## Permisos esperados de Hasura (rol user)
- `professional_profiles`: select/update propios con `id = X-Hasura-User-Id`; insert propio, `id` por preset de sesión. Sin delete.
- `athletes`: select/insert/update solo `professional_id = X-Hasura-User-Id`; preset de `professional_id` desde sesión en insert; editables `full_name`, `birth_date`, `notes`. Sin delete.
- `assessments`: select/insert/update solo `professional_id = X-Hasura-User-Id`; preset de `professional_id` en insert; nunca permitir reasignar `professional_id` ni `id`; FKs compuestas garantizan mismo profesional. Sin delete inicialmente.
- `calculation_results`: select/insert solo `professional_id = X-Hasura-User-Id`, preset de sesión; evitar update/delete inicial. Verificar que `assessment_id` pertenece al mismo profesional.
- `anonymous` y `public`: ninguna operación sobre tablas con datos personales.

## Estado conocido, no verificado
Se configuraron permisos parciales en `professional_profiles`, SELECT en `athletes`. INSERT/UPDATE en `athletes` y permisos de `assessments`/`calculation_results` siguen pendientes de confirmación. La presencia de íconos de permisos no acredita que las reglas sean correctas.

## Criterios de aceptación
- `npm test` y `npm run build` pasan.
- Usuario no autenticado no puede consultar datos personales.
- Usuario A crea un deportista y lo consulta; B no puede leerlo, editarlo ni asociar evaluaciones o cálculos.
- El frontend no incluye secretos de Hasura/Nhost.
- No se almacenan datos reales hasta aprobar prueba de aislamiento.
