# Auditoría de la aplicación JCN — 2026-08-21

## Estado de esta auditoría

| Campo | Valor |
|---|---|
| Rama estable auditada | `main` en `bbec635` |
| Rama de mejoras candidatas | `audit/application-reliability-2026-08-21` |
| Interfaz modificada | No |
| Publicación en producción autorizada | No; requiere revisión y aprobación antes de merge |

## Conclusión ejecutiva

El flujo operativo principal funciona: la aplicación inicia sesión, lee las cuatro bandejas, reconoce sus encabezados actuales, conserva evidencia histórica, genera el reporte y presenta los estados esperados. La prueba visual automatizada también cubre las divisiones Hoy, Amanecidos y Nocturnos, el Registro del día, alertas y Copy Group.

La debilidad principal de la versión estable no estaba en la interfaz sino en la protección del proceso de publicación. Un error fatal del scraper podía terminar con código exitoso, y GitHub Actions no ejecutaba las pruebas antes de desplegar. También había dependencias sin uso con vulnerabilidades conocidas y archivos históricos internos incluidos en el artefacto público.

La rama de auditoría corrige esos puntos sin cambiar el comportamiento visual ni los estados de negocio.

## Evidencia recogida

### Prueba automatizada de la versión estable

- Resultado: aprobada.
- Comprobaciones existentes: 51 assertions.
- Generación temporal del HTML: correcta.
- Resultado final: `Master Dashboard smoke test passed`.

### Extracción real de la versión estable

- Login: correcto.
- Past Due Posts: 75 filas leídas; encabezados esenciales reconocidos.
- Screenshots: 75 filas leídas; columnas Screenshot y Screenshot Two reconocidas.
- Glenn Screenshots: 75 filas leídas.
- Approved Screenshots: 75 filas leídas.
- Fecha operativa: 08/21/2026 en `America/Santo_Domingo`.
- Día actual: 0 publicaciones encontradas en ese momento.
- Día anterior: 14 registros históricos; 9 completados y 5 pendientes.
- Dos días atrás: 17 registros; 15 completados y 2 pendientes.
- Reporte HTML: generado correctamente.

Un total de cero para el día actual no se considera por sí solo un error, porque puede ser legítimo. La validación debe comprobar la fuente y sus columnas, no inventar publicaciones ni bloquear días vacíos.

### Extracción real con las mejoras candidatas

- Resultado: aprobada.
- Las cuatro fuentes conservaron los mismos conteos y encabezados.
- Los nuevos controles de estructura no produjeron falsos positivos.
- El reporte HTML volvió a generarse correctamente.

### Dependencias

Antes de la mejora:

- 2 vulnerabilidades altas.
- 1 vulnerabilidad moderada.
- Todas eran transitivas de dependencias declaradas pero no utilizadas por el código activo.

Después de retirar `googleapis` y el paquete npm `fs`:

- 0 vulnerabilidades reportadas por `npm audit`.
- El código continúa utilizando correctamente el módulo `fs` incorporado en Node.js; no necesita el paquete npm del mismo nombre.

## Hallazgos por prioridad

### P0 — Un fallo del scraper podía terminar como éxito

**Evidencia:** una navegación bloqueada produjo `ERROR`, pero el proceso terminó con exit code 0.

**Riesgo:** GitHub Actions podía continuar con la preparación y publicación de un reporte anterior, vacío o incompleto.

**Mejora candidata:** asignar `process.exitCode = 1` en el manejador fatal. El workflow se detiene y conserva la última publicación funcional.

**Estado en rama:** corregido.

### P1 — Producción se desplegaba sin ejecutar pruebas

**Evidencia:** el workflow instalaba Chromium y ejecutaba directamente `node testa.js`.

**Riesgo:** un push a `main` podía publicar una regresión visual o lógica que las pruebas locales sí habrían detectado.

**Mejora candidata:** ejecutar `npm test` antes del scraper y usar `npm ci` para instalar exactamente el lockfile.

**Estado en rama:** corregido.

### P1 — Cambios de columnas podían generar datos vacíos silenciosamente

**Evidencia:** cuando un encabezado no se encontraba, el crawler utilizaba índice `-1` y producía campos vacíos.

**Riesgo:** un cambio del dashboard externo podía parecer un día sin trabajo, aunque la extracción estuviera rota.

**Mejora candidata:** exigir las columnas Scheduled, Publisher, Type y Client en Posts, y además Screenshot en las tres bandejas de capturas.

**Estado en rama:** corregido y validado contra las tablas reales.

### P1 — Historial interno incluido en el sitio público

**Evidencia:** GitHub Pages recibía toda la carpeta `reporte`, incluyendo `delivery-history-*.json` de hasta 90 días.

**Riesgo:** exposición innecesaria de historial antiguo, nombres de clientes y URLs de evidencia, más allá de los reportes recientes mostrados por la interfaz.

**Mejora candidata:** guardar primero el historial completo en el caché del workflow y eliminar esos JSON únicamente del artefacto público.

**Estado en rama:** corregido. Debe verificarse en una ejecución de GitHub Actions antes del merge.

### P2 — Dependencias no utilizadas y vulnerables

**Evidencia:** no hay imports activos de `googleapis`; `fs` es un módulo nativo de Node.js. Ambas dependencias estaban en `package.json`.

**Riesgo:** superficie innecesaria, instalación más lenta y 3 vulnerabilidades transitivas.

**Mejora candidata:** retirarlas y regenerar el lockfile.

**Estado en rama:** corregido; `npm audit` reporta 0 vulnerabilidades.

### P2 — Cobertura lógica concentrada en una prueba grande

**Evidencia:** existía un solo script de smoke test con datos simulados.

**Riesgo:** una regresión en la resolución de estados o el guardado histórico podía ser más difícil de aislar.

**Mejora candidata:** añadir pruebas directas para Approved, captura pendiente de aprobación, captura pendiente, activo sin registro, removido por ausencia, preservación de evidencia, identidad y validación de columnas.

**Estado en rama:** corregido con `tests/coreLogic.test.js`.

### P2 — Estado manual limitado al navegador

**Evidencia:** reprogramaciones, confirmaciones, cohortes y alertas descartadas usan `localStorage`.

**Riesgo:** no se sincronizan entre navegadores, dispositivos o perfiles y pueden perderse al limpiar datos del sitio.

**Recomendación futura:** evaluar un almacén autenticado y privado. No se implementó porque cambia arquitectura, permisos y modelo de privacidad.

### P2 — Identidad sensible a reprogramaciones

**Evidencia:** la llave incluye fecha/hora, publisher, tipo y cliente.

**Riesgo:** al cambiar la hora, el anuncio puede aparecer como una identidad nueva y la anterior como removida.

**Recomendación futura:** extraer un identificador estable del registro del dashboard cuando exista. No se implementó porque requiere confirmar que esa ID está disponible y es consistente en las cuatro fuentes.

### P3 — Diagnóstico con pausas fijas

**Evidencia:** login y algunos fallos usan esperas de varios segundos.

**Riesgo:** ejecuciones más lentas y diagnóstico tardío.

**Recomendación futura:** sustituir esperas por condiciones observables donde sea seguro. No es prioritario mientras la extracción real siga estable.

### P3 — Logs con datos operativos detallados

**Evidencia:** el scraper imprime filas completas y nombres de clientes.

**Riesgo:** los logs del workflow contienen más información de la necesaria para operación normal.

**Recomendación futura:** modo resumido por defecto en CI y modo detallado solo para diagnóstico autorizado. No se implementó para no reducir capacidad de investigación sin acordar primero qué información necesita el usuario.

## Cambios incluidos en la rama candidata

1. Fallo real del proceso cuando el scraper encuentra una excepción fatal.
2. Validación de credenciales antes de navegar y confirmación de salida del login.
3. Validación de columnas esenciales en las cuatro fuentes.
4. Pruebas de lógica central además del smoke test visual.
5. Pruebas obligatorias antes del scrape y deploy en GitHub Actions.
6. Instalación reproducible con `npm ci`.
7. Eliminación de dependencias no utilizadas.
8. Exclusión del historial JSON interno del artefacto público, conservándolo en caché.
9. Advertencia amarilla después de 2 horas sin actualización, equivalente a dos ejecuciones horarias fallidas.

## Criterios antes de promover a `main`

No hacer merge hasta completar todos estos puntos:

1. `npm ci` termina correctamente desde un entorno limpio.
2. `npm test` pasa completo.
3. `npm audit` reporta 0 vulnerabilidades.
4. Una extracción real reconoce las cuatro fuentes y genera el HTML.
5. Una ejecución manual de GitHub Actions en contexto controlado confirma que las pruebas se ejecutan antes del scraper.
6. El artefacto de Pages no contiene archivos `delivery-history-*.json`.
7. La interfaz publicada se compara visualmente con `main` y no presenta diferencias funcionales.
8. El usuario autoriza explícitamente el merge.

## Mejoras futuras no implementadas

- Sincronización privada de estados manuales entre dispositivos.
- Identificador estable independiente de la hora programada.
- Alertas externas cuando el workflow horario falla.
- Modo de logs resumidos para proteger datos operativos.
- Prueba autenticada periódica en un ambiente que no publique resultados.

Estas mejoras requieren decisiones de producto, privacidad o infraestructura. Permanecen como propuestas y no deben inferirse como autorizadas.
