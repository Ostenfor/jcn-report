# Feature: Automatización asistida del flujo diario de JCN en WhatsApp

## Estado

- Fase: primera feature implementada; automatización de WhatsApp pendiente
- Última actualización: 2026-09-14
- Zona horaria operativa: America/Santo_Domingo
- Proyecto: JCN Report
- Raíz: `C:\Users\glenn\playwright-scraper\JCN`

### Implementado: evidencia para “Did this went?”

- Se integró en el ciclo horario existente de `testa.js`; no se creó otro cron job.
- `screenshots-twos` captura cada fila válida de hoy y ayer para los publishers permitidos.
- El PNG recorta la página original de `Glen Screenshots` desde `Scheduled Time` hasta el borde derecho de `User`, conservando el fondo y la apariencia real del dashboard.
- Los archivos se guardan en `reporte/follow-up-evidence/YYYY-MM-DD/` con nombres deterministas para actualizarlos sin duplicarlos.
- El nombre identifica también `Content Type`, evitando que filas `whatsapp` y `whatsapp-group` del mismo cliente se sobrescriban.
- La evidencia queda asociada a su publicación mediante el delivery matcher.
- El reporte integrado tiene un tab `Did this went?` con las evidencias de hoy y ayer, etiqueta del día, imagen, enlace al registro original y botones `Copy image` y `Copy message`.
- `Copy image` copia un PNG real al portapapeles en la versión HTTPS del reporte; si el navegador lo bloquea, abre la imagen para copiarla manualmente.
- No se agregó envío, programación ni preparación automática de mensajes en WhatsApp.
- Validación completada con `npm test`, incluido el smoke test del tab, la imagen y el mensaje copiable.

Este documento es la fuente de continuidad para la automatización de tareas que Glenn realiza manualmente entre el dashboard de JCN y los grupos de WhatsApp. Debe actualizarse después de cada cambio, prueba o decisión relevante.

## Objetivo

Reducir el trabajo manual diario sin cambiar el flujo visible para los grupos. La automatización debe leer el reporte existente de JCN, preparar las acciones correctas, abrir el grupo correspondiente, conservar menciones reales de WhatsApp y evitar mensajes duplicados o dirigidos a contactos desactualizados.

## Flujo operativo actual

1. Glenn captura manualmente las publicaciones de Status y Groups y las sube a la aplicación.
2. A las 8:00 AM envía a cada grupo la lista de publicaciones del día programadas antes de las 5:00 PM.
3. Si una publicación continúa sin evidencia después de aproximadamente 1.5 a 2 horas, pregunta si llegó a publicarse.
4. Para el seguimiento normalmente adjunta un recorte del post en el dashboard original.
5. A las 5:00 PM envía las publicaciones programadas desde las 5:00 PM en adelante.
6. Después del bloque de las 5:00 PM termina la jornada y continúa al día siguiente con las capturas.

## Alcance propuesto

### Conservado como trabajo manual

- Capturar fotos de Status y Groups.
- Subir las capturas a la aplicación.
- Resolver casos ambiguos o grupos con contactos duplicados.
- Confirmar el envío final de cada mensaje preparado mediante automatización de interfaz.

### Candidato a automatización

- Leer las publicaciones y estados calculados por JCN Report.
- Separar publicaciones anteriores a las 5:00 PM de las publicaciones de 5:00 PM en adelante.
- Preparar la cola de mensajes de las 8:00 AM.
- Preparar la cola de mensajes de las 5:00 PM.
- Detectar publicaciones sin captura después del umbral configurado.
- Cancelar seguimientos cuando la captura aparezca antes del envío.
- Abrir el grupo correcto en WhatsApp.
- Recuperar del mismo grupo la plantilla más reciente con menciones vigentes.
- Preparar el mensaje y el recorte del dashboard original.
- Registrar mensajes preparados, enviados, cancelados y pendientes para evitar duplicados.

## Reglas de horario

### Ventana de las 8:00 AM

- Incluir publicaciones del día programadas antes de las 5:00 PM.
- Agrupar por publisher y grupo de WhatsApp.
- Usar el formato vigente del grupo.
- No incluir publicaciones nocturnas.

### Seguimiento por retraso

- Candidato inicial: 1 hora y 45 minutos después de la hora programada.
- Solo aplicar si la publicación todavía no tiene evidencia.
- No aplicar a publishers configurados con `requiresFollowUp: false`.
- No aplicar a tipos bloqueados por `blockedDeliveryTypes`.
- Cancelar si aparece una captura antes de preparar o enviar el seguimiento.
- Adjuntar un recorte del registro correspondiente en el dashboard original.

### Ventana de las 5:00 PM

- Incluir únicamente publicaciones programadas desde las 5:00 PM en adelante.
- No generar recordatorios de estas publicaciones antes de las 5:00 PM.
- Este bloque representa la última entrega del día.

## Formatos base

### Mensaje diario

```text
hello @contact for today we have

MM/DD/YYYY, HH:MM AM/PM EDT - Publisher - delivery-type - Client
```

### Seguimiento

```text
hello @contact did this go out?
```

El texto final puede variar por grupo. La plantilla vigente debe obtenerse desde el historial reciente del mismo grupo.

## Estrategia validada para conservar menciones

### Método preferido: reutilizar la línea más reciente del mismo grupo

1. Abrir el grupo correcto.
2. Abrir `Search messages` dentro del chat.
3. Buscar `hello @`.
4. Revisar resultados del más reciente al más antiguo.
5. Elegir el resultado más reciente que contenga `for today we have`.
6. Ignorar resultados de seguimiento como `did this went?`.
7. Saltar desde el resultado al mensaje original.
8. Seleccionar únicamente la primera línea que contiene el saludo y las menciones.
9. Copiar con `Ctrl+C`.
10. Pegar en el cuadro de redacción del mismo chat con `Ctrl+V`.
11. Verificar que cada mención permanezca activa.
12. Agregar debajo las publicaciones actuales.

Motivo: la plantilla más reciente reduce el riesgo de reutilizar contactos que ya no administran ese publisher.

### Método alternativo: crear menciones una por una

1. Escribir `@`.
2. Leer las opciones visibles de WhatsApp.
3. Si aparece una sola coincidencia exacta, seleccionarla.
4. Si aparecen muchas opciones, escribir una letra del nombre a la vez.
5. Revisar nuevamente las opciones después de cada letra.
6. Seleccionar solo cuando el nombre completo coincida exactamente.
7. Detener el proceso si hay nombres duplicados, ninguna coincidencia o incertidumbre.
8. Verificar que WhatsApp representó la mención como un contacto, no como texto normal.

## Experimentos realizados

### Contabilidad Casa: selección directa de una mención

- Escribir `@` abrió el selector de miembros.
- WhatsApp mostró `Jens Tejera (El Amor De Mi Vida)`.
- Seleccionar esa opción creó una mención real.
- Resultado: funcional.

### Contabilidad Casa: pegar un alias y hacer clic dentro

- Se pegó `test @jenstejera test`.
- Hacer clic dentro del alias abrió el popup de Jens.
- La sustitución dejó caracteres sobrantes porque el cursor quedó dentro del alias.
- Resultado: posible, pero no fiable para automatización.

### Contabilidad Casa: pegar el nombre completo después de `@`

- El popup se cerró y el contenido quedó como texto normal.
- Añadir un segundo `@` produjo `@@...`.
- Resultado: descartado.

### MM /JCN FAMILY: búsqueda del mensaje más reciente

- `Search messages` aceptó `hello @`.
- Los resultados aparecieron del más reciente al más antiguo.
- Se pudo elegir el resultado más reciente que contenía `for today we have`.
- WhatsApp saltó correctamente al mensaje original.
- Resultado: funcional y recomendado.

### MM /JCN FAMILY: copiar desde el menú del mensaje

- La opción `Copy` de WhatsApp copió el mensaje al portapapeles del sistema.
- El controlador del navegador utiliza un portapapeles virtual separado y no pudo pegar ese contenido.
- Resultado: no fiable desde el menú `Copy` con el controlador actual.

### MM /JCN FAMILY: selección visual de la primera línea

- Se pudo seleccionar visualmente solo la primera línea del mensaje.
- `Ctrl+C` se ejecutó sobre la selección.
- Esta ruta debe seguir validándose para confirmar el pegado y la conservación de menciones.
- Resultado: parcialmente validado.

## Validaciones obligatorias antes de preparar un mensaje

- El nombre del grupo abierto coincide exactamente con el grupo configurado para el publisher.
- La plantilla proviene del mismo grupo.
- El resultado elegido contiene `for today we have`.
- Es el resultado válido más reciente.
- Todas las menciones aparecen como elementos de contacto activos.
- Las publicaciones pertenecen a la ventana horaria correcta.
- No existe un registro previo del mismo mensaje para ese grupo y fecha.
- Los publishers excluidos no reciben seguimiento.
- El recorte corresponde al registro correcto del dashboard original.

## Registro de acciones propuesto

Cada acción debe tener una identidad estable y uno de estos estados:

- `PENDING`: detectada y todavía no preparada.
- `PREPARED`: chat, texto, menciones y adjunto listos.
- `AWAITING_CONFIRMATION`: lista para el envío final.
- `SENT`: envío verificado en WhatsApp.
- `CANCELLED`: dejó de ser necesaria antes del envío.
- `NEEDS_REVIEW`: coincidencia de grupo, mención o evidencia ambigua.
- `FAILED`: la automatización no pudo completar un paso técnico.

Identidad sugerida:

```text
fecha-operativa | ventana | publisher | grupo | tipo | cliente | hora-programada
```

## Dependencias existentes que deben reutilizarse

- `src/config/publishers.js`: grupos, aliases, menciones y excepciones.
- `src/services/deliveryRules.js`: reglas de seguimiento y tipos bloqueados.
- `src/services/deliveryHistoryService.js`: historial diario.
- `src/services/screenshotMatcherService.js`: estado de capturas.
- `testa.js`: extracción, clasificación por horario y generación del reporte.

## Próxima implementación

1. Crear un servicio que genere una cola de acciones a partir del historial diario.
2. Añadir pruebas para las ventanas de 8:00 AM, seguimiento y 5:00 PM.
3. Guardar el estado de la cola sin publicar datos sensibles en GitHub Pages.
4. Añadir al reporte una sección de revisión con el grupo, texto, menciones esperadas y evidencia.
5. Implementar el ejecutor asistido de WhatsApp con búsqueda de plantilla reciente.
6. Validar el pegado de la primera línea seleccionada mediante `Ctrl+C` y `Ctrl+V`.
7. Ejecutar una prueba completa en un grupo controlado sin enviar el mensaje.
8. Activar primero el modo supervisado y observar duplicados o falsos seguimientos.

## Decisiones pendientes

- Confirmar si el umbral definitivo será 90, 105 o 120 minutos.
- Definir si la cola de las 8:00 AM debe prepararse exactamente a las 8:00 o unos minutos antes.
- Definir el texto gramatical definitivo de seguimiento: `did this go out?` o el formato actual de cada grupo.
- Confirmar qué grupos requieren más de una mención.
- Confirmar si existe algún publisher que deba recibir mensaje a una hora distinta.

## Regla de mantenimiento

Al terminar cada sesión, actualizar:

- `Última actualización`.
- Experimentos realizados y su resultado.
- Decisiones tomadas.
- Archivos modificados.
- Pruebas ejecutadas.
- Próximo paso concreto.

## Feature específico: recorte de la fila original para seguimientos

### Propósito

Generar automáticamente una imagen compacta de la fila correspondiente en `Glen Screenshots` (`screenshots-twos`) para adjuntarla al mensaje de seguimiento cuando una publicación todavía no tenga captura.

La imagen permite que el publisher identifique inmediatamente la publicación consultada sin recibir enlaces internos ni información de otras filas.

### Mensaje asociado

Formato base:

```text
hello @contact did this go out?
```

El orden final recomendado en WhatsApp es:

1. Adjuntar el recorte de la fila del dashboard original.
2. Escribir el saludo con las menciones activas.
3. Preguntar `did this go out?`.
4. Verificar el grupo, las menciones y la imagen antes del envío.

### Fuente visual

- Página: `https://dashboard.jewishcontentnetwork.com/admin/resources/screenshots-twos`
- Tabla: `Glen Screenshots`.
- La captura debe provenir de la página original autenticada, no del reporte HTML generado por JCN.
- La fila se identifica con la misma llave de entrega utilizada por el matcher: fecha/hora, publisher, content type y cliente.

### Área que debe aparecer

Incluir solamente la fila objetivo y estas columnas:

- Scheduled Time.
- Website.
- Content Type.
- Media.
- Message.
- User.

Excluir:

- Navegación lateral.
- Encabezado de Laravel Nova.
- Buscador y filtros.
- Filas anteriores o posteriores.
- Columnas `Screenshot` y `Screenshot Two`.
- Botones de acciones de la derecha.
- Información de clientes distintos.

### Comportamiento de captura

1. Abrir `screenshots-twos` con la sesión autenticada existente.
2. Localizar la fila mediante la llave exacta de la entrega.
3. Si la fila no está en la página actual, recorrer la paginación hasta encontrarla o alcanzar fechas anteriores.
4. Confirmar que los textos visibles de Scheduled Time, Website, Content Type y User coinciden con la entrega.
5. Esperar a que la miniatura de imagen o el poster del video esté cargado.
6. Calcular un recorte desde la columna Scheduled Time hasta el final de User.
7. Incluir la altura completa de la fila, aunque Message tenga varias líneas.
8. Guardar la imagen en PNG con un nombre estable y seguro.
9. Asociar la ruta del PNG a la acción de seguimiento correspondiente.
10. No generar o no enviar el seguimiento si la fila no puede validarse con exactitud.

### Nombre de archivo sugerido

```text
follow-up-evidence/YYYY-MM-DD/<hora>-<publisher>-<tipo>-<cliente>.png
```

El nombre real debe limpiar caracteres no válidos de Windows y evitar exponer datos que no sean necesarios.

### Integración con el crawler existente

`screenshotsCrawler.js` ya obtiene:

- `scheduled`.
- `website`.
- `type`.
- `user`.
- `media`.
- `screenshot`.
- `screenshotTwo`.
- `detailUrl`.
- Índices dinámicos de las columnas.

La implementación debe ampliar el crawler para conservar una referencia estable a la fila durante la visita de cada página y capturarla antes de cambiar de página. No debe depender de la posición fija de una columna porque Laravel Nova puede modificar anchos o encabezados.

### Criterios de aceptación

- Para una entrega pendiente, se genera exactamente un PNG.
- El PNG contiene solamente la fila correcta.
- Scheduled Time, Website, Content Type y User son legibles.
- La miniatura o poster de Media aparece cuando existe.
- Message aparece con suficiente información para reconocer el contenido.
- No aparecen datos de otra fila.
- No aparecen las columnas de capturas ni los controles administrativos.
- El archivo queda asociado a la misma acción de seguimiento.
- Una segunda ejecución reutiliza o reemplaza de forma controlada el mismo archivo; no crea duplicados arbitrarios.
- Si la fila cambió, desapareció o resulta ambigua, la acción pasa a `NEEDS_REVIEW`.
- La captura por sí sola nunca dispara el envío del mensaje.

### Casos especiales

- Filas con video: esperar el poster; no es necesario reproducir el video.
- Mensajes largos: conservar la altura completa de la fila dentro de un límite razonable y asegurar que el inicio del mensaje sea visible.
- Paginación: capturar mientras la fila está visible antes de avanzar.
- Reprogramación: usar la nueva fecha/hora como una entrega nueva y evitar asociar la evidencia anterior.
- Publishers o tipos excluidos: no generar evidencia de seguimiento cuando `requiresFollowUp` sea falso o el tipo esté bloqueado.
- Captura recibida durante el proceso: cancelar la acción antes de preparar WhatsApp.

### Validación inicial propuesta

Usar como caso de prueba la fila:

```text
09/10/2026, 09:00 AM EDT | Meaningful Minute | whatsapp | TOURO COLLEGE AND UNIVERSITY SYSTEM
```

El resultado esperado debe parecerse al recorte de referencia entregado por Glenn: una sola fila, desde Scheduled Time hasta User, con el video, el mensaje y el cliente visibles.

## Integración acordada con la ejecución horaria y el reporte

### Punto de ejecución

Este feature debe ejecutarse dentro del flujo actual de `testa.js`, invocado por `.github/workflows/jcn-report.yml` al minuto 7 de cada hora.

No requiere crear un segundo cronjob. Cada ejecución horaria debe:

1. Extraer las fuentes actuales.
2. Calcular qué entregas continúan pendientes y ya superaron el umbral.
3. Capturar la fila original de cada entrega que requiera seguimiento.
4. Guardar los PNG en el artefacto del reporte.
5. Construir o actualizar el tab de seguimiento.
6. Evitar duplicados mediante el historial de acciones.

La generación horaria prepara el trabajo; no debe enviar mensajes automáticamente.

### Nuevo tab del reporte

Nombre de trabajo: `WhatsApp Follow-ups`.

El contador del tab debe mostrar la cantidad de seguimientos listos. Cada tarjeta debe incluir:

- Hora programada.
- Tiempo transcurrido.
- Publisher.
- Grupo de WhatsApp.
- Cliente.
- Tipo de entrega.
- Captura de la fila del dashboard original.
- Texto propuesto: `hello @contact did this go out?`.
- Menciones esperadas.
- Estado de la acción.
- Botón `Copy message`.
- Botón `Open evidence` o `Download evidence`.
- Botón para marcar como enviado después de verificarlo.
- Indicador visible si la evidencia cambió o necesita revisión.

Solo deben aparecer acciones cuyo seguimiento ya corresponda. Las publicaciones posteriores a las 5:00 PM no deben mostrarse antes de esa hora.

### Formato recomendado en WhatsApp

El resultado final recomendado es una sola burbuja de WhatsApp:

1. Adjuntar el PNG de la fila original.
2. Escribir como caption `hello @contact did this go out?`.
3. Convertir cada contacto en una mención real.
4. Verificar el preview completo.
5. Confirmar el envío.

Esto mantiene la evidencia y la pregunta juntas, facilita responder al mensaje y evita dos mensajes separados.

### Limitación de copiar todo desde el reporte

Una copia combinada desde el reporte HTML puede transportar imagen y texto, pero no puede crear menciones reales de WhatsApp. Las menciones pertenecen al chat y deben obtenerse desde la plantilla más reciente del mismo grupo o seleccionarse dentro del popup de miembros.

Por esta razón, el tab debe optimizar la preparación y la evidencia, mientras el ejecutor de WhatsApp conserva o crea las menciones activas antes del envío.

### Recursos publicados

Los PNG requeridos por el tab deben publicarse junto con el reporte en una carpeta estable, por ejemplo:

```text
reporte/follow-up-evidence/YYYY-MM-DD/
```

El historial JSON interno debe guardar la relación entre la entrega, el PNG y el estado de seguimiento. El artefacto público no debe incluir credenciales, URLs internas innecesarias ni datos de otras filas.
