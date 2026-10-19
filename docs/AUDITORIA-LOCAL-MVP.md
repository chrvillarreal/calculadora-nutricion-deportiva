# Auditoría previa — 19/10/2026

Base: main, 57f33b2da6d343fc0d05a4bca8ae62f9729ab7c9. No AGENTS.md presente. PR #1 abierto, sin fusionar; no se utiliza su código ni su integración Nhost.

## Inventario
React 19 + TypeScript + Vite. Una pantalla monolítica en main.tsx; funciones puras separadas: IMC, Mifflin-St Jeor, gasto total basal × actividad, proteínas/grasas g/kg y carbohidratos por diferencia. Impresión nativa. Cuatro pruebas de cálculo. Sin almacenamiento ni rutas, sin lockfile. SDK Nhost declarado pero no utilizado. Documento de backend existente se conserva como antecedente, no es el plan de esta rama.

## Hallazgos y decisiones
- Conservar ecuaciones y salida para entradas válidas, extraer calculadora reutilizable.
- Validar sexo, intervalos operativos adultos y resultados finitos/positivos; evitar infinitos y resultados basales negativos.
- Eliminar dependencia Nhost no utilizada; ninguna conexión de datos personales.
- Agregar repositorio local Dexie con transacciones, borrado en cascada y backup versionado validado antes de escribir.
- Respaldos completos reemplazan el contenido local solo tras confirmación explícita, de forma atómica. No mezclar silenciosamente fichas.
- Datos ficticios opt-in, nunca sembrados al iniciar.
- Sin ecuaciones nuevas en etapa 1: revisión bibliográfica adicional, comparador, informes PDF y PWA pertenecen a etapa 2.
