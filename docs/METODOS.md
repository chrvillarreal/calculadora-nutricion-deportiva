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

Límites operativos de la app: peso 20–400 kg, altura 100–250 cm, edad entera 18–120 años, factor 1–2,5; constantes sexuales reconocidas; resultados positivos y finitos. Los límites previenen entradas imposibles o errores numéricos, **no son un rango de validación científica** de la ecuación. Persistencia de evaluaciones: proteína y grasa 0–5 g/kg y energía suficiente. La calculadora independiente conserva la libertad original de g/kg no negativos, rechazando desbordamiento y exceso energético.

Uso como apoyo con revisión profesional. No se valida una prescripción para menores, embarazo/lactancia, enfermedad, escenarios de peso extremos ni rendimiento deportivo específico. Sin diagnósticos automáticos ni clasificación de riesgo. Estimar con una ecuación no reemplaza medir ni evaluar al individuo.
