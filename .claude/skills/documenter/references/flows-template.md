# Flujos — [Nombre del Proyecto]

## Flujo 1: [Nombre del Flujo]

[Descripción en 2-4 oraciones: qué desencadena este flujo, qué actores participan,
qué decisiones se toman y cuál es el resultado esperado.]

```mermaid
sequenceDiagram
    participant U as Usuario
    participant API as Backend
    participant DB as Base de Datos

    U->>API: Solicitud
    API->>DB: Consulta
    DB-->>API: Respuesta
    API-->>U: Resultado
```

---

## Flujo 2: [Nombre del Flujo]

[Descripción]

```mermaid
flowchart TD
    A[Inicio] --> B{¿Condición?}
    B -->|Sí| C[Acción A]
    B -->|No| D[Acción B]
    C --> E[Fin]
    D --> E
```

---

## Máquinas de Estados

### [Nombre de la Entidad]

[Qué representa cada estado y qué transiciones son posibles.]

```mermaid
stateDiagram-v2
    [*] --> EstadoInicial: Evento que lo crea
    EstadoInicial --> EstadoFinal: Condición
    EstadoFinal --> [*]
```

| Estado | Descripción |
|---|---|
| EstadoInicial | [Qué significa] |
| EstadoFinal | [Qué significa] |
