# MiAula Slate 2.14.0 · Prepa — Novedades

## 1. Apariencia: elige tus colores
**Más → Apariencia** (nuevo panel):

| Paleta | Cómo es |
|---|---|
| **Alegre** | La de 2.13.0: morado y rosa con acentos de colores. Sigue siendo la de inicio. |
| **Guinda / Vino** (nueva) | Vino `#8E2449` con dorado. En claro: fondo marfil. En oscuro: vino profundo. |
| **Personalizado** (nuevo) | Eliges tu color principal con el selector o con 8 colores rápidos (azul, verde azulado, verde, ámbar, rojo, morado, rosa, gris pizarra). MiAula calcula fondos, botones, íconos y contraste en claro y oscuro. |

- Botones **Claro / Oscuro** en el mismo panel (el sol/luna del encabezado sigue funcionando).
- Se aplica antes de pintar la pantalla: al abrir no parpadea el tema anterior.
- Es una preferencia del dispositivo (localStorage); no toca los datos ni los respaldos.
- La barra del navegador toma el color de fondo de la paleta.

## 2. Una sola lista «Rubro» al crear actividades
- Se quitó la lista **«Tipo»** (Trabajo/Práctica/Exposición): no cambiaba la calificación y se repetía con «Cuenta en».
- Queda **«Rubro»**: *Trabajos* y los rubros marcados **«Con actividades»**.
- En el editor de rubros (Más → Parcial) cada rubro dice cómo se califica:
  - **Con actividades** → aparece en la lista «Rubro» y promedia sus actividades.
  - **Captura 0–10** → escribes la calificación de cada alumno; no aparece en la lista.
- Las actividades antiguas conservan su tipo (se ve como «Trabajos · Práctica», etc.). Las nuevas guardan el tipo «Trabajo» por compatibilidad con respaldos y Excel.

## Técnico
- `theme.js` (nuevo, en `<head>`): paletas, generador del color personalizado y panel de Apariencia.
- `styles.css`: los detalles fijos del tema Alegre ahora son tokens (`--blob-*`, `--line-grad`, `--primary-shadow`, `--eyebrow`, `--btn-text`…); bloque `html[data-palette="guinda"]`.
- La edición Palencia (`--edition palencia`) no muestra paletas y sigue en negro y plata.
- `db.js` sin cambios; sin almacenes nuevos.
