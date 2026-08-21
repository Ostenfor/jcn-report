# Revisión objetiva de mejoras — 2026-08-21

## Alcance

| Campo | Valor |
|---|---|
| Base estable | `main` en `45c34a2` |
| Rama de trabajo | `improvement/operational-audit-2026-08-21` |
| Cambios de negocio | Ninguno |
| Cambios de UI | Footer de capturas simplificado |
| Cambios técnicos | Login sin esperas fijas y un reintento de navegación |

Esta rama no debe mezclarse hasta revisar sus resultados y autorizar el merge.

## Cambios implementados

### 1. Una sola barra Completed

El footer de seguimiento de capturas mostraba `Completed` y `Pending`. Ambos utilizaban el mismo total y sus porcentajes eran inversos, por lo que duplicaban información.

La rama conserva únicamente:

- Conteo `completados/total`.
- Etiqueta `Completed`.
- Una barra de avance que ocupa todo el ancho disponible.

No se modificaron las dos métricas del footer de Reporte completo (`Confirmados` y `Sended`).

### 2. Login basado en una condición real

El login imponía un mínimo de 8 segundos mediante esperas fijas, aunque el dashboard ya hubiera respondido.

Ahora espera directamente a que la URL salga de `/admin/login`. Si no sale dentro de 60 segundos, falla de forma explícita.

Resultado observado en una extracción real comparable:

| Versión | Duración local completa |
|---|---:|
| Antes | 21.5 s |
| Rama actual | 13.8–17.1 s |
| Reducción observada | 4.4–7.7 s (aprox. 20–36 %) |

Dos mediciones no garantizan el mismo ahorro en cada ejecución, pero eliminan 8 segundos mínimos artificiales y mantienen una condición más confiable.

### 3. Reintento de navegación transitoria

Cada navegación crítica dispone ahora de un segundo intento después de 1 segundo. El reintento aplica a fallos reales de navegación; las interrupciones normales producidas por redirects de Nova continúan sin considerarse errores.

Objetivo: recuperarse de un corte breve de red sin esperar a la siguiente ejecución horaria.

### 4. Fallos más rápidos

Se eliminó una pausa de 10 segundos después de una excepción fatal. El proceso conserva el log, cierra el navegador y notifica el fallo a GitHub Actions inmediatamente.

## Medición del workflow de producción

Ejecución analizada: GitHub Actions `32482500680`, completada correctamente.

| Paso | Duración |
|---|---:|
| Instalar Chromium | 27 s |
| Ejecutar scraper | 24 s |
| Desplegar Pages | 6 s |
| Configurar Node | 5 s |
| Pruebas | 4 s |
| Otros pasos individuales | 0–1 s |
| Workflow completo | 81 s |

Las diez ejecuciones exitosas revisadas tardaron entre 69 y 83 segundos. Para un proceso horario, esta duración es saludable.

## Decisiones de rendimiento

### No cachear Chromium por ahora

Chromium es el paso individual más largo, pero cachear cientos de megabytes puede tardar tanto como instalarlo, añade invalidación por versión y puede dejar dependencias del sistema desalineadas. No se recomienda asumir ese riesgo para ahorrar parte de un workflow que ya termina en cerca de un minuto.

### No paralelizar los cuatro crawlers por ahora

Abrir varias páginas simultáneas podría reducir segundos, pero aumenta carga sobre el dashboard, complejidad de sesión y riesgo de límites o resultados inconsistentes. El ahorro no compensa el riesgo operativo actual.

### Mejora futura segura: logs resumidos

El scraper imprime muchas filas en GitHub Actions. Un modo resumido en CI reduciría volumen de logs y exposición de datos operativos, manteniendo un modo detallado para diagnóstico. Requiere acordar qué información debe conservarse antes de implementarlo.

## Evaluación objetiva de la UI

### Aspectos correctos

- Hoy aparece antes que Amanecidos.
- Nocturnos están separados del trabajo activo.
- Las alertas distinguen hoy y ayer.
- Los colores agrupan tabs relacionados.
- Copy Group está disponible en alertas y tarjetas del Master.
- Las capturas permanecen visibles y compactas.
- Registro del día conserva el resultado aunque el anuncio desaparezca.
- El footer simplificado evita mostrar dos porcentajes inversos.

La estructura se validó con el smoke test del navegador. La inspección visual directa del archivo `file://` fue bloqueada por la política del navegador de revisión, por lo que no se afirma una aprobación visual pixel por pixel.

### Potenciales mejoras que necesitan decisión del usuario

#### P1. Definición consistente de Completed

En Screenshot Today/Yesterday, el total completado incluye `APPROVED` y `COMPLETED_PENDING_APPROVAL`. En Master, una captura pendiente de aprobación continúa abierta para seguimiento.

Esto puede ser correcto si “completado” significa algo diferente por contexto, pero debería elegirse una sola definición visible o cambiar la etiqueta para evitar ambigüedad.

Opciones futuras:

- Completed solo cuando está Approved.
- Trabajo de captura completado cuando la evidencia fue subida, aunque falte aprobación.
- Mostrar `Captura subida` como categoría intermedia sin llamarla Completed.

#### P2. Tamaños de texto secundarios

Algunas etiquetas, timestamps y pasos compactos usan 9–10 px. No son acciones principales, pero pueden resultar difíciles de leer. Se recomienda revisar en el dispositivo real antes de elevarlos a un mínimo de 11 px, porque aumentar todo puede volver a producir la sensación de una interfaz demasiado grande.

#### P2. Mezcla de idiomas

Existen términos como Master Dashboard, Screenshot Today, Copy Group y Completed junto a textos en español. No afecta el funcionamiento y el usuario ya reconoce esos nombres. Una traducción completa debe hacerse únicamente si mejora su velocidad de lectura.

#### P3. Estado 0/0

Cuando una vista no tiene publicaciones, el footer puede mostrar `0/0 Completed`. Una alternativa futura sería mostrar `Sin publicaciones` y ocultar la barra. Es una mejora cosmética de bajo riesgo.

## Mejoras futuras para evitar errores

### Notificación inmediata por fallo del workflow

La app protege el último reporte válido y muestra advertencia después de dos horas, pero no recibe una señal inmediata del workflow fallido. Una integración privada por email, Slack o servicio equivalente permitiría avisar desde el primer fallo.

### Identificador estable del anuncio

La llave actual incluye la hora. Un reschedule puede crear una identidad nueva. Si el dashboard expone una ID estable compartida por las cuatro fuentes, utilizarla reduciría falsos removidos. Debe investigarse antes de modificar el matcher.

### Prueba de publicación

Después de desplegar, el workflow podría verificar que Pages responde, que el reporte corresponde al día operativo y que contiene los tabs esenciales. Esta comprobación detectaría fallos posteriores a la generación, aunque debe diseñarse sin provocar despliegues en bucle.

## Validaciones realizadas

- Suite completa de lógica, login, navegación y UI.
- Extracción real de las cuatro fuentes.
- Comparación de conteos e historial con la versión estable.
- Verificación de que Pending ya no existe en el footer ni en su JavaScript.
- Validación de una sola barra Completed en el DOM generado.
- `git diff --check`.

## Recomendación

Los cambios implementados son pequeños, medibles y no alteran estados de negocio. Son candidatos razonables para merge después de una ejecución real final y la aprobación del usuario. Las mejoras de definición de Completed, tipografía, idioma, alertas externas e identidad estable deben permanecer como propuestas hasta tomar una decisión explícita.
