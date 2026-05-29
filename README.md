# LLM Chatbot Integration Bridge

LLM Chatbot Integration Bridge es una solución de backend modular desarrollada en Node.js que actúa como un **API Gateway e intermediario de comunicación (Proxy/Bridge Pattern)** entre interfaces conversacionales avanzadas (como OpenWebUI) y un ecosistema distribuido de microservicios propietarios de Inteligencia Artificial.

El sistema está diseñado bajo estándares de alta disponibilidad y mantenibilidad, implementando aislamiento conceptual de servicios, persistencia no relacional mediante MongoDB y optimización de almacenamiento mediante GridFS para flujos de datos binarios y mapeo de interacciones.

---

## Arquitectura y Flujo de Datos

El sistema sigue un flujo desacoplado donde la interfaz de usuario de chat nunca se comunica directamente con la lógica de negocio interna ni con los modelos core de lenguaje:

```text
       [ Interfaz Conversacional ]
            +----------------+
            |   OpenWebUI    | (Client / Frontend)
            +-------+--------+
                    |
                    | 1. HTTP POST /v1/chat/completions (Estándar OpenAI API)
                    v
       [ Capa de Integración / Proxy ]
+------------------------------------------+
|         llm-chatbot-integration          | <---> [ MongoDB / GridFS ]
|  - Middleware de Normalización de Texto  |       (Mapeos de interacción y logs)
|  - Orquestador del Pipeline de Inferencia|
+-------------------+----------------------+
                    |
                    | 2. Peticiones HTTP internas (Seguridad SSL gestionada)
                    +-----------------------+-----------------------+
                                            |                       |
                                            v                       v
                               +------------+------------+ +--------+---------+
                               |    Core Inference Svc   | | Document Gen Svc |
                               |  (Servicio de Modelos)  | | (Procesamiento)  |
                               |       Port 7004         | |    Port 7009     |
                               +-------------------------+ +------------------+

El código se organiza en módulos desacoplados para facilitar la escalabilidad horizontal y el mantenimiento del sistema:

llm-chatbot-integration/
├── src/
│   ├── config/
│   │   └── environment.js          # Centralización de variables de entorno y prompts genéricos
│   ├── infrastructure/
│   │   └── database/
│   │       └── mongoClient.js      # Conector encapsulado de MongoDB y GridFS (SRP)
│   ├── interfaces/
│   │   └── http/
│   │       ├── controllers/
│   │       │   ├── chatController.js       # Lógica del proxy /v1/chat/completions 
│   │       │   └── templateController.js   # Gestión de marcado, borrado físico y webhook a FGS
│   │       └── routes/
│   │           └── apiRoutes.js            # Enrutador y middleware de Express
│   └── shared/
│       └── utils/
│           └── textNormalizer.js   # Funciones puras de extracción de texto y hashing SHA-256
├── .env.example                    # Plantilla pública para variables de entorno seguro
├── .gitignore                      # Exclusiones estrictas para evitar fugas de credenciales
├── package.json                    # Manifiesto y dependencias de Node.js
└── server.js                       # Inicialización limpia y punto de entrada de la aplicación




