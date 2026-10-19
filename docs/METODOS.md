# Métodos y límites

## Conservación de las fórmulas

Se conservaron las operaciones originales y sus salidas para datos válidos:

- IMC = peso kg / (altura cm / 100)². No es una medición de composición corporal ni se interpreta automáticamente en deportistas.
- Mifflin-St Jeor simplificada: gasto en reposo = 10 × kg + 6,25 × cm − 5 × años + 5 (masculino) o −161 (femenino). El campo sexo selecciona la constante original de la ecuación; no representa identidad de género.
- GET orientativo = gasto en reposo × factor elegido. Factores conservados: 1,2; 1,375; 1,55; 1,725; 1,9. No se infieren del deporte ni se suman calorías de entrenamiento para evitar contarlas dos veces. Son supuestos editables mediante selección, no mediciones.
- Proteína = peso × g/kg; grasa = peso × g/kg; carbohidratos = (GET − 4 × proteína − 9 × grasa) / 4. No se permiten carbohidratos negativos. Valores predeterminados 1,6 y 0,9 g/kg son los de la app original, no una recomendación individual.

Referencia primaria verificada: Mifflin MD et al. *A new predictive equation for resting energy expenditure in healthy individuals*. Am J Clin Nutr. 1990;51(2):241–247. DOI 10.1093/ajcn/51.2.241. https://pubmed.ncbi.nlm.nih.gov/2305711/. La ecuación estima gasto en reposo; se corrigió esa etiqueta en la interfaz sin cambiar la fórmula.

## Reproducibilidad

Ejemplo masculino, 80 kg, 180 cm, 30 años: 800 + 1125 − 150 + 5 = 1780 kcal/día; ×1,55 = 2759 kcal/día. IMC = 24,691358. Con proteína 1,6 g/kg y grasa 0,9 g/kg: 128 g proteína, 72 g grasa y 399,75 g carbohidratos; 512 + 648 + 1599 = 2759 kcal.

Cada evaluación conserva inputs completos, fecha local, proteína y grasa en g/kg, notas, timestamp e identificador `mifflin-st-jeor-v1`. Los resultados se derivan con precisión completa y se redondean solo para presentación. No se importan resultados arbitrarios. Si cambia una ecuación, se debe mantener el método v1 para registros históricos y versionar cualquier alternativa.

## Validación y aplicabilidad

Límites operativos de la app: peso 20–400 kg, altura 100–250 cm, edad entera 18–120 años, factor 1–2,5; constantes sexuales reconocidas; resultados positivos y finitos. Los límites previenen entradas imposibles o errores numéricos, **no son un rango de validación científica** de la ecuación. Persistencia de evaluaciones: proteína y grasa 0–5 g/kg y energía suficiente. La función original de macros conserva entradas no negativas, rechazando desbordamiento y exceso energético. La interfaz de planificación de etapa 2 aplica además el límite operativo de 5 g/kg a proteína y grasa.

Uso como apoyo con revisión profesional. No se valida una prescripción para menores, embarazo/lactancia, enfermedad, escenarios de peso extremos ni rendimiento deportivo específico. Sin diagnósticos automáticos ni clasificación de riesgo. Estimar con una ecuación no reemplaza medir ni evaluar al individuo.

## Etapa 2: métodos adicionales

Todos los métodos se comparan con los mismos kg, cm, años y factor. No se promedian ni se elige automáticamente el valor más alto o bajo. Su diferencia porcentual respecto de Mifflin es `(GET método / GET Mifflin - 1) × 100`; no es un intervalo de confianza ni una estimación del error individual. Protocolos y poblaciones de las ecuaciones difieren.

### Harris-Benedict revisada, Roza y Shizgal (1984), v1

- Masculino: 88,362 + 13,397 × kg + 4,799 × cm - 5,677 × años.
- Femenino: 447,593 + 9,247 × kg + 3,098 × cm - 4,330 × años.
- Referencia primaria: Roza AM, Shizgal HM. *The Harris Benedict equation reevaluated: resting energy requirements and the body cell mass*. Am J Clin Nutr. 1984;40:168-182. DOI 10.1093/ajcn/40.1.168. https://pubmed.ncbi.nlm.nih.gov/6741850/
- Constantes y unidades cotejadas con la calculadora institucional de Maastricht UMC+: https://nutritionalassessment.mumc.nl/en/calculators-0 (la página general tiene una leyenda de altura inconsistente; se utiliza la página de calculadoras que explicita cm).
- Es una revisión de las ecuaciones de Harris-Benedict, no la versión original de 1919. Estima reposo; no se considera automáticamente válida para un deportista concreto, enfermedad o extremos de peso.
- Ejemplo 80 kg, 180 cm, 30 años, masculino: reposo 1853,632 kcal/día; factor 1,55 → GET 2873,1296. Femenino con los mismos datos: reposo 1615,093.

### Cunningham (1980), v1

- 500 + 22 × masa magra (kg). No es la revisión de 1991.
- Referencia primaria: Cunningham JJ. *A reanalysis of the factors influencing basal metabolic rate in normal adults*. Am J Clin Nutr. 1980;33:2372-2374. DOI 10.1093/ajcn/33.11.2372. https://pubmed.ncbi.nlm.nih.gov/7435418/
- Reanálisis de 223 sujetos de estudios clásicos, no una ecuación derivada exclusivamente en atletas. No se presenta como preferida universalmente para deportistas.
- Requiere masa magra ingresada explícitamente, mayor que cero y no superior al peso. No se inventa ni se deriva automáticamente de un porcentaje de grasa desconocido. Registrar en notas el método de evaluación; su incertidumbre afecta la estimación.
- Ejemplo: 64 kg de masa magra → reposo 1908 kcal/día; factor 1,55 → GET 2957,4.

### Planificación energética y de macros

No cambia el GET. `Objetivo = GET × (1 + ajuste/100)`; el ajuste (-30 a +30 %) es manual, con cero por defecto. El intervalo es una barrera operativa, no una recomendación clínica de déficit/superávit. No se prescribe una pérdida de peso ni se promete un resultado.

- Modo g/kg: proteína y grasa según el peso registrado, cada una entre 0 y 5 g/kg; carbohidratos completan la energía restante.
- Modo porcentaje: proteína g = objetivo × % proteína / 400; grasa g = objetivo × % grasa / 900; carbohidratos g = objetivo × (100 - % proteína - % grasa) / 400. No se admiten sumas superiores a 100 %.
- Se muestran g/día, g/kg y % de energía. Sumas y cálculos usan números completos; el redondeo es solo visual.
- Reparto en 1-8 comidas: divide los totales por el número elegido. No construye un menú, no asigna alimentos y no implica recomendaciones de timing.
- Ejemplo GET 2759 y ajuste -10 %: objetivo 2483,1 kcal. Modo 25 % proteína, 30 % grasa: 155,19375 g proteína, 82,77 g grasa, 279,34875 g carbohidratos.

### Versionado y seguimiento

Registros anteriores mantienen `mifflin-st-jeor-v1` y su forma original, sin recalcular con otro método ni agregar un objetivo distinto. Nuevos registros tienen `schemaVersion: 2`, método exacto, inputs, masa magra opcional y plan completo. Exportación JSON v2 contiene ambos; se siguen aceptando backups v1.

Gráficos: última evaluación de cada fecha; posiciones horizontales respetan la distancia entre días y no inventan mediciones intermedias. La escala vertical se ajusta al rango y no necesariamente parte de cero. La tabla conserva todas las evaluaciones, ordenadas por fecha, timestamp y ID para desempatar. Cambiar método puede cambiar el GET por razones matemáticas; se muestra un aviso cuando hay métodos distintos en el período.
