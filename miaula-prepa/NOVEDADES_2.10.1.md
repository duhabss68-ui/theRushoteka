# MiAula Slate 2.10.1 · Corrección: el Cuaderno no pasaba al parcial nuevo

- **Error:** después de «Cerrar parcial e iniciar siguiente», el Cuaderno seguía mostrando el Parcial 1, porque recordaba el parcial elegido en su selector. Los datos estaban bien; los grupos sí pasaban al Parcial 2.
- **Ahora:** cada vez que un grupo cambia de parcial (o cambias de grupo), el Cuaderno abre el **parcial actual**, limpio y listo para nuevas actividades. Si eliges el Parcial 1 a mano para revisarlo, se queda ahí mientras sigas en ese grupo.
- **Mejora:** un parcial nuevo copia los **porcentajes del parcial anterior** (Trabajos / Proyecto-Examen / Valores / Actitudes). Proyecto o Examen queda por elegir. Si el parcial ya tenía porcentajes, no se tocan.
- Sin cambios en datos. db.js idéntico.
