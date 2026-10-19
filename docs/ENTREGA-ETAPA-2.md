# Entrega — etapa 2 de NutriSport Pro MVP 1.0

Se continúa la rama `feat/nutrisport-pro-local-mvp` y el PR #2 draft, sin integrar PR #1/Nhost, sin modificar main y sin desplegar en producción. Se auditó la etapa 1 y se verificó el éxito de su workflow remoto antes de avanzar.

## Funciones implementadas

- Mifflin-St Jeor conservada; Harris-Benedict revisada (Roza/Shizgal, 1984) y Cunningham 1980 añadidas con referencias, unidades, ecuaciones e inputs explícitos.
- Comparador con mismo factor de actividad y diferencias respecto de Mifflin. Cunningham no calcula sin masa magra; no hay promedio ni método ganador automático.
- Objetivo energético separado de GET, ajuste manual -30 a +30 %, macros en g/kg o % energético, g/día y g/kg equivalentes, reparto aritmético en 1-8 comidas.
- Registros nuevos versionados con método, masa magra, plan e inputs. Registros originales v1 preservados sin reescritura. Backups v2 mezclan registros viejos y nuevos y aceptan importación v1. Exportación verifica que la copia producida sea importable.
- Gráfico de peso, GET u objetivo, filtros de fechas y tabla de todos los registros. Último registro de cada día en el gráfico, escala explícita y aviso si cambió el método.
- Informe PDF descargable desde cada evaluación, generado localmente: ficha, fecha, datos, método, resolución, GET, objetivo, macros, notas, seguimiento disponible, fuente, identificador y paginación. Fuente tipográfica empacada localmente, sin CDN. Impresión nativa conservada.
- PWA con manifiesto, iconos e instalación según soporte real del navegador. Precache exacto de recursos estáticos, incluidos fuente y módulo PDF. Uso sin conexión tras primera carga. Actualización mediante botón, limpieza limitada a cachés de la app y sin tocar IndexedDB.

## Verificación

El recorrido probado es formulario → validación → IndexedDB → lectura histórica → gráficos/PDF/backups. En modo offline no hay servidor de datos ni peticiones de fichas. Se prueba también una nueva versión de service worker en el preview local, aplicando la actualización desde el botón y comprobando que los registros sobreviven.

| Verificación final local | Resultado |
| --- | --- |
| `npm test` | 88 pruebas aprobadas en 4 archivos: cálculo, planificación, almacenamiento y compatibilidad |
| `npm run build` | TypeScript y Vite correctos; módulo PDF cargado a pedido |
| Playwright Chromium | 10 escenarios aprobados: 7 regresiones y 3 de etapa 2 |
| Responsive | Regresión completa de 320 a 1440 px; comparador, planificación y seguimiento nuevos verificados a 320 y 1440 px |
| Offline real | Recarga sin red, lectura histórica, PDF sin carga previa de su módulo, backup v2 mixto, restauración y alta/edición/borrado de fichas sin conexión |
| Actualización real en preview | Worker nuevo esperando, activación mediante botón, recarga tras activación, IndexedDB conservado, caché anterior eliminada y caché ajena preservada |
| Privacidad en recorridos | Sin excepciones de página ni solicitudes a terceros; cachés contienen solo archivos estáticos, no PDFs generados |
| PDF | Informe ficticio de 2 páginas generado desde el flujo offline; renderizado con Poppler e inspeccionado. Extracción verifica resultados, método, acentos y factor sin redondeo indebido; texto dentro de márgenes |
| Dependencias | `npm audit --audit-level=moderate`: 0 vulnerabilidades |

Chromium 153 local mediante `CHROMIUM_PATH` tras fallar el ZIP estándar de Playwright en este entorno. Los tests remotos usan la instalación estándar. Las ejecuciones locales no sustituyen la validación remota posterior del nuevo head del PR.

La prueba offline encontró una variación `Vary: Origin` en los recursos del preview y se corrigió la búsqueda por URL exacta dentro de la lista estática. La prueba de actualización detectó una carrera al recargar por `controllerchange`; ahora se consulta el worker realmente pendiente y se espera su activación antes de recargar. Ambas correcciones tienen cobertura de extremo a extremo. Se revisaron componentes, hooks, etiquetas, foco, carga diferida de PDF y separación de modelos históricos. No se utilizaron alumnos reales.

## Limitaciones

- Los límites de entrada y planificación son barreras operativas, no indicaciones clínicas ni garantía de validez de las ecuaciones. La revisión profesional es necesaria.
- No hay menús, alimentos, recomendación automática de déficit ni predicción de resultados; el reparto por comidas es una división equivalente.
- IndexedDB sigue ligado al perfil/origen. No hay cifrado propio, cuentas, sincronización, resolución de conflictos entre pestañas ni paginación. Backups y PDFs contienen información legible.
- Nuevos registros/backup v2 no son compatibles con la app anterior; no bajar de versión sin respaldo. La app nueva importa v1 y conserva sus resultados.
- PDF incluye hasta 12 evaluaciones disponibles hasta la fecha/timestamp del registro; la ficha del alumno refleja su estado actual. No es firma digital ni registro clínico certificado.
- Fuente PDF cubre escritura latina, griega y cirílica, no todos los sistemas de escritura. Revisar los nombres antes de compartir.
- Instalación y políticas de almacenamiento varían por navegador. Requiere HTTPS/localhost, raíz del dominio y primera carga completa con red. Borrar datos del navegador puede borrar todo. Safari/iOS, Firefox y lanzadores físicos no se han certificado.
- El service worker no cachea enlaces bibliográficos externos ni datos personales. Aplicar actualizaciones después de guardar y respaldar; cerrar otras pestañas antiguas.

## Documentación

- [Auditoría previa](AUDITORIA-ETAPA-2.md)
- [Métodos, referencias, ejemplos y límites](METODOS.md)
- [Política de PWA, privacidad, caché y actualización](PWA-LOCAL.md)
- [Entrega original de etapa 1](ENTREGA-MVP-LOCAL.md) se conserva como registro histórico.
