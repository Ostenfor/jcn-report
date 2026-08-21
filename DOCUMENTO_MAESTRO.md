# Documento maestro de la aplicación JCN

## 1. Estado controlado

| Campo | Valor |
|---|---|
| Aplicación | JCN Report / seguimiento de publicaciones y capturas |
| Rama estable | `main` |
| Versión funcional tomada como base | `7cabdda` (`Add Copy Group to Master Dashboard cards`) |
| Última revisión documental | 2026-08-21 |
| Zona horaria operativa | `America/Santo_Domingo` |
| Publicación | GitHub Pages mediante GitHub Actions |
| Frecuencia automática | Minuto 7 de cada hora |
| Rama de respaldo anterior al rework | `backup-main-before-master-dashboard-2026-08-20` |

Este archivo es la fuente de verdad del comportamiento esperado. Todo cambio funcional debe actualizar la versión base, la fecha de revisión, la sección afectada y la lista de verificaciones.

## 2. Objetivo de la aplicación

La aplicación ayuda a controlar las publicaciones asignadas del día actual y las que quedaron de la noche o del día anterior. Su prioridad es evitar que una publicación quede sin notificación, sin seguimiento o sin captura antes de salir de las historias de WhatsApp, Instagram u otra plataforma.

La aplicación no modifica el dashboard de JCN. Inicia sesión, lee sus bandejas, cruza la información y genera un reporte HTML operativo.

## 3. Fuentes de datos

La aplicación inicia sesión en el dashboard administrativo y consulta cuatro fuentes:

| Fuente | Uso |
|---|---|
| Past Due Posts | Publicaciones programadas y todavía presentes en la cola original. |
| Screenshots | Bandeja general de capturas, sin el filtro de Glenn. |
| Glenn Screenshots (`screenshots-twos`) | Bandeja filtrada creada para los clientes de Glenn. No se considera completa por sí sola. |
| Approved Screenshots | Evidencia de que una captura fue aprobada. |

Para evitar perder clientes que no aparecen en Glenn Screenshots, el sistema cruza tanto Screenshots como Glenn Screenshots.

## 4. Identidad de una publicación

Una publicación se reconoce mediante una llave formada por:

1. Fecha y hora programada.
2. Publisher o website.
3. Tipo de contenido.
4. Cliente o usuario.

Si cualquiera de esos valores cambia en el dashboard original, el sistema puede interpretarlo como una publicación distinta. Esta es una limitación conocida que debe vigilarse en reprogramaciones.

## 5. Estados automáticos

Los estados se resuelven en este orden:

| Estado interno | Significado operativo | Regla principal |
|---|---|---|
| `APPROVED` | Completado y aprobado | Está en Approved Screenshots o ya había sido observado como aprobado. |
| `COMPLETED_PENDING_APPROVAL` | Captura subida | Existe una captura en Screenshots o Glenn Screenshots, pero aún no está aprobada. |
| `PENDING_SCREENSHOT` | Captura pendiente | Existe en una bandeja de Screenshots, pero no tiene evidencia adjunta. |
| `ACTIVE_NO_SCREENSHOT_RECORD` | Activo sin registro de captura | Sigue en Past Due Posts y todavía no aparece en las bandejas de Screenshots. |
| `PREVIOUSLY_SEEN_REMOVED_FROM_DASHBOARD` | Removido o flujo interrumpido | Fue visto anteriormente y ahora está ausente de las cuatro fuentes. |
| `UNKNOWN` | Revisar | La evidencia no permite clasificarlo con seguridad. |

Un aprobado y una captura ya observada se conservan en el historial aunque posteriormente dejen de estar visibles en las páginas actuales.

“Removido” es una inferencia por ausencia en todas las fuentes. El dashboard original no entrega una razón explícita de eliminación.

## 6. Organización por jornada

### Hoy

Publicaciones del día actual programadas entre las 9:00 AM y antes de las 5:00 PM. Aparecen primero en Master Dashboard.

### Amanecidos del día

Incluye:

- Pendientes del día anterior que pertenecían a la cohorte nocturna.
- Nuevas publicaciones del día actual programadas antes de las 9:00 AM.

Se muestran en una tabla separada y con color diferente para evitar mezclarlas con los pendientes de hoy.

### Nocturnos

Publicaciones programadas desde las 5:00 PM en adelante. Durante el turno se identifican con la etiqueta `Nocturno` y el mensaje de que pasarán a Amanecidos. No deben contarse como una acción pendiente durante el horario laboral.

## 7. Tabs y responsabilidad

| Tab | Responsabilidad actual |
|---|---|
| Master Dashboard | Seguimiento automático de pendientes de hoy, amanecidos y nocturnos. Muestra reloj, evidencia, grupo y botón Copy Group. |
| Registro del día | Histórico de hoy y ayer. Conserva completados, removidos, capturas subidas y reprogramaciones. |
| Reporte completo | Flujo original para notificar clientes, copiar mensajes y grupos, y marcar progreso local. |
| 5PM en adelante | Último recordatorio para publicaciones posteriores al horario laboral. |
| Saturday advance | Publicaciones adelantadas para el día siguiente según el flujo existente. |
| Removidos | Diferencia del snapshot de Past Due Posts contra la ejecución anterior del mismo día. No sustituye el Registro del día. |
| Screenshot Today | Evidencia y estado de capturas del día actual. Es una vista automática, sin controles manuales operativos. |
| Screenshot Yesterday | Evidencia y estado de capturas del día anterior. Es una vista automática, sin controles manuales operativos. |
| Client List | Referencia de publishers, aliases, grupos de WhatsApp, notas y requisito de notificación. |

## 8. Alertas y relojes

- Una publicación activa genera retraso después de una hora desde su hora programada.
- El reloj continúa aumentando: 1h, 2h, 3h y sucesivamente.
- Las alertas superiores están separadas entre hoy y ayer/amanecidos.
- Cada alerta muestra el grupo y ofrece `Copy Group`.
- La `X` cierra una alerta solamente para la hora actual. Si alcanza una nueva hora de retraso puede volver a aparecer.
- `Cerrar todos` descarta temporalmente todas las alertas visibles.
- Los nocturnos no generan alerta durante el turno.
- Las alertas del sistema operativo requieren permiso del navegador; las alertas visuales funcionan sin ese permiso.

## 9. Acciones manuales

El Master Dashboard representa el estado automático y no debe pedir al usuario que mantenga estados manuales normales.

La excepción operativa es `Reschedule`, utilizada después de que el flujo se interrumpe o la publicación desaparece. Los cambios manuales del reporte se guardan en el almacenamiento local del navegador y no se escriben en JCN ni se comparten automáticamente con otros dispositivos.

## 10. Persistencia

### Historial generado por el scraper

- Se guarda como `delivery-history-AAAA-MM-DD.json` dentro de la carpeta de reportes.
- Conserva hasta 90 días en el proceso de generación.
- La interfaz carga los 3 días más recientes cuando están disponibles.
- GitHub Actions conserva la carpeta de reportes mediante caché entre ejecuciones.

### Estado local del navegador

Se conserva en `localStorage` y está ligado al navegador y al sitio desde el que se abre el reporte:

- Notificaciones enviadas y confirmaciones.
- Alertas horarias ya descartadas.
- Cohorte de amanecidos.
- Eventos y overrides manuales, incluyendo reprogramaciones.

Limpiar datos del navegador, usar otro navegador o cambiar de origen puede hacer que estos controles locales no aparezcan.

## 11. Generación y publicación

El flujo automático actual es:

1. GitHub Actions se ejecuta en cada push a `main`, manualmente o al minuto 7 de cada hora.
2. Restaura el historial anterior desde caché.
3. Instala Node.js 20, dependencias y Chromium.
4. Ejecuta `node testa.js` con credenciales guardadas como GitHub Secrets.
5. Conserva los 3 reportes HTML más recientes.
6. Copia el reporte más nuevo a `reporte/index.html`.
7. Publica la carpeta `reporte` en GitHub Pages.
8. Guarda nuevamente el historial en caché.

Los archivos `.env`, `creds.json`, `reporte/`, `testb.js` y `node_modules/` están ignorados por Git. Las credenciales nunca deben copiarse a documentación, logs publicados ni commits.

## 12. Verificación mínima antes de publicar un cambio

1. Confirmar que `git status` no contiene archivos ajenos al cambio.
2. Ejecutar `npm.cmd test` en Windows o `npm test` en Linux.
3. Confirmar que la prueba termina con `Master Dashboard smoke test passed`.
4. Ejecutar `git diff --check`.
5. Revisar que los tabs no solicitados no hayan cambiado.
6. Verificar Hoy, Amanecidos y Nocturnos por separado.
7. Verificar que completar o remover no borre el registro histórico.
8. Verificar que Copy Group copie el grupo correcto.
9. Mantener toda mejora no aprobada fuera de `main`.

## 13. Recuperación

### Volver al estado inmediatamente anterior a un cambio

Crear primero una rama de respaldo desde el `main` vigente y después revertir mediante un commit nuevo. No utilizar `git reset --hard` sobre la rama compartida.

### Volver a la aplicación anterior al Master Dashboard

La rama remota `backup-main-before-master-dashboard-2026-08-20` conserva el commit `2640154`. No debe eliminarse ni moverse.

## 14. Control de cambios

- `main` contiene únicamente comportamiento aceptado y probado.
- Las auditorías y mejoras candidatas deben partir del último `main` y usar una rama separada.
- Una mejora candidata no pasa a `main` sin revisión visual, prueba automatizada y autorización del usuario.
- Cada cambio aceptado debe actualizar este documento cuando modifique estados, fuentes, horarios, tabs, persistencia, alertas o publicación.

## 15. Limitaciones conocidas de la versión base

- El dashboard externo puede cambiar encabezados, selectores, paginación o rutas y romper la extracción.
- La clasificación de removido es inferida; no existe un evento explícito de eliminación.
- La continuidad del historial automático depende del caché de GitHub Actions.
- Los controles manuales del navegador no se sincronizan entre dispositivos.
- La prueba automatizada principal usa datos simulados y no sustituye una revisión periódica contra el dashboard real.
- La llave de identidad incluye fecha y hora; un reschedule puede producir una llave nueva y requiere reconciliación visual.
