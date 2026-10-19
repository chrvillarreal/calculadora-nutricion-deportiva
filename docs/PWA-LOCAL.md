# PWA local y política de actualización

Manifest standalone con start_url/scope/id `/`, iconos PNG 192/512 y maskable 512. Pensado para servir en la raíz del dominio. Requiere HTTPS o localhost. Instalación mediante evento real del navegador si está disponible, o instrucciones para su menú/Safari; no se simula instalación. La integración con el lanzador del sistema no se puede garantizar desde una prueba headless.

La app registra `/sw.js` al montar y prepara recursos estáticos después del primer acceso con red. Configuración muestra su estado. El build genera una lista exacta de HTML, CSS, JavaScript, iconos, manifiesto y fuente local; incluye el módulo diferido de PDF. El nombre de caché contiene un hash de los contenidos del build. No se almacenan fichas, evaluaciones, copias ni PDFs en Cache Storage. Esos registros siguen en IndexedDB; el PDF es una descarga local.

La instalación del worker termina solo si se cachean todos los recursos. No hay caché arbitraria de peticiones. Se atienden navegaciones con el shell guardado y recursos conocidos con caché; el resto se deja al navegador. Solo mismo origen; sin sincronización en segundo plano ni API de datos. CSP `connect-src self` permite cargar la fuente local y recursos del worker, no terceros.

Una nueva versión espera cuando hay un worker previo controlando páginas. Configuración ofrece «Aplicar actualización y recargar»; no se fuerza una recarga durante un formulario. El botón envía el mensaje real de activación y recarga solo cuando el nuevo worker llega al estado activado. Activar limpia solo las cachés `nutrisport-static-*` antiguas, no otras cachés ni IndexedDB. Guardar y exportar antes de actualizar. La versión de base Dexie sigue siendo 1 porque no se cambian índices ni se transforman registros anteriores; la versión 2 discrimina el contenido de evaluaciones y del backup.

No hay soporte para bajar a una aplicación v1 después de guardar evaluaciones nuevas; exportar un backup v2 antes de cualquier cambio. No se implementa resolución de conflictos entre pestañas. Cerrar pestañas antiguas antes de continuar con una nueva versión.

Offline disponible tras completar el precache, incluidas calculadoras, CRUD, importación/exportación JSON, gráficos e informes PDF. El enlace externo a las fuentes bibliográficas necesita conexión. Si se borra caché o IndexedDB, el comportamiento depende de qué se eliminó; la instalación no equivale a un backup. Las restricciones de almacenamiento de iOS/navegación privada siguen aplicando.

Fuente PDF: subconjunto local de DejaVu Sans, renombrado NutriSans.ttf, con cobertura latina, griega, cirílica, puntuación y símbolos matemáticos. Licencia junto a la fuente. No se descarga de un CDN. Escrituras que requieren otros sistemas de caracteres pueden no estar cubiertas y deben revisarse antes de compartir.

La búsqueda de la caché usa URL exacta e `ignoreVary` únicamente sobre esa lista estática y el shell. La prueba offline detectó que el preview de Vite sirve `Vary: Origin` y que el precache y la carga de módulos envían cabeceras Origin distintas. Ignorar esa variación es intencional para estos archivos públicos inmutables; no se aplica a datos de alumnos ni respuestas de APIs.

El registro del worker se deduplica por página (incluido React StrictMode) y se verifica sin caché HTTP de script. La activación vuelve a consultar el worker realmente pendiente, espera su estado activado y mantiene vivo el evento con `waitUntil(skipWaiting())`; evita recargar por un evento de controlador ajeno a esa actualización.
