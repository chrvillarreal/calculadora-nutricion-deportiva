# Entrega — NutriSport Pro MVP 1.0, etapa 1

## Alcance

Rama `feat/nutrisport-pro-local-mvp` desde main `57f33b2`. Se conserva el repositorio, no se integra PR #1 ni Nhost. Sin merge ni despliegue solicitado. Segunda etapa documentada como pendiente.

Implementado: seis secciones, dashboard responsive, CRUD de alumnos con búsqueda y fichas, historial de evaluaciones, registros reproducibles, seguimiento tabular real, Dexie/IndexedDB, backups completos JSON v1, importación con validación estricta y transacción atómica, ejemplos ficticios opcionales, avisos de privacidad y persistencia. Las calculadoras originales e impresión siguen disponibles sin almacenamiento. Validación de edad, sexo, magnitudes y desbordamiento reforzada, sin cambiar fórmulas. Componentes separados para ficha, calculadora e historial.

## Evidencia de verificación local

Flujo probado: navegador → formulario → validación → Dexie/IndexedDB → recarga de datos → ficha/historial. Sin API ni backend. Exportación → descarga JSON → borrado local → validación/importación → restauración → recarga y lectura de ficha e historial.

| Verificación | Resultado |
| --- | --- |
| `npm test` (Vitest 5.0.5) | 47 pruebas aprobadas: 20 cálculo y 27 almacenamiento/backups |
| `npm audit --audit-level=moderate` | 0 vulnerabilidades reportadas |
| `npm run build` | TypeScript estricto y Vite correctos |
| Playwright Chromium | 7 escenarios aprobados |
| Responsive | Flujo completo y seis secciones sin desborde de página a 320, 375, 430, 768, 1024 y 1440 px |
| Privacidad durante E2E | Cero solicitudes fuera del origen local y cero excepciones de página en seis recorridos |
| Persistencia | Ficha e historial conservados tras recargar; prueba de cerrar/reabrir conexión |
| Almacenamiento bloqueado | Error visible; calculadoras operativas |
| Backup inválido | Versión, tipos, fechas, duplicados, referencias, tamaño y longitudes rechazados sin modificación |
| Restauración fallida | Error de escritura provocado: rollback conserva fichas y evaluaciones previas |
| Borrado | Alumno y evaluaciones asociados eliminados juntos |
| Diseño | Capturas de 320 y 1440 px inspeccionadas visualmente |

Chromium 153.0.8010.0 se ejecutó localmente desde un binario temporal extraído de `@sparticuz/chromium` mediante `CHROMIUM_PATH`, porque la descarga ZIP estándar de Playwright falló en este entorno. La app y las pruebas no dependen de ese paquete. La instalación normal de Chromium está documentada. No se usaron datos reales.

La suite de cuatro pruebas original pasó y se amplió con casos de regresión. Revisión de React: componentes de formulario/historial/calculadora independientes, efectos sin consultas externas, estado derivado calculado al renderizar, claves estables, etiquetas de inputs y foco visible. Error de escritura presentado sin descartar los datos. CSP sin conexiones de red, sin HTML inyectado.

Se actualizó Vitest a 5.0.5 después de detectar advisories de mocker/tinypool en las dependencias originales. Se conserva lockfile para instalación reproducible. El workflow de PR ejecuta unitarias, build y Playwright; sus resultados remotos se deben revisar cuando termine, no se presuponen por los resultados locales.

## Limitaciones

- Local por origen/perfil del navegador, sin sincronización ni cifrado propio. Backups legibles. Solicitar persistencia no garantiza disponibilidad eterna. Cambiar de origen requiere exportar/importar.
- La importación reemplaza todo, sin fusión ni deduplicación inteligente. Confirmación y cantidades visibles antes de reemplazar. Límite 5 MB, 5.000 alumnos y 20.000 evaluaciones por backup.
- Interfaz cargada en memoria; sin paginación, perfiles múltiples ni resolución de conflictos entre pestañas. Evitar editar la misma ficha en varias pestañas simultáneamente; no hay refresco automático entre pestañas.
- Evaluaciones históricas inmutables: se pueden eliminar y volver a registrar, no editar silenciosamente sus inputs.
- Seguimiento tabular sin gráficos, informes PDF mediante impresión nativa únicamente. Navegación en memoria sin rutas URL ni botón atrás por sección.
- Ecuaciones estimativas para adultos. Límites operativos no equivalen a validación clínica ni recomendaciones individuales. Ver METODOS.md.
- Verificado con Chromium en Linux. No probado en Safari/Firefox, dispositivos físicos ni exportación de impresión de cada navegador. No se realizó auditoría WCAG completa.
- CSP bloquea websocket HMR en desarrollo; usar recarga manual o `npm run preview` para revisión final.

## Pendientes — etapa 2

1. Agregar ecuaciones con fuente, población, unidades, límites y tests de referencia; versionarlas sin cambiar los registros v1.
2. Comparar métodos de gasto energético con supuestos explícitos, sin doble conteo de ejercicio.
3. Mejorar planificación de macros y objetivos; separar estimación de gasto de prescripción.
4. PDF profesional con ficha, fecha, métodos, notas y trazabilidad.
5. Gráficos de evolución y filtros por períodos.
6. PWA instalable y política offline/actualización con pruebas de migración de base.

No hay controles simulados para estas funciones pendientes. Ninguna acción de esta entrega requiere credenciales ni variables de Nhost.
