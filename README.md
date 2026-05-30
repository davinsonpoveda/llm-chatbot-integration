# LLM Chatbot Integration Bridge

LLM Chatbot Integration Bridge es una solución de backend modular desarrollada en Node.js que actúa como un **API Gateway e intermediario de comunicación (Proxy/Bridge Pattern)** entre interfaces conversacionales avanzadas (como OpenWebUI) y un ecosistema distribuido de microservicios propietarios de Inteligencia Artificial.

El sistema está diseñado bajo estándares de alta disponibilidad y mantenibilidad, implementando aislamiento conceptual de servicios, persistencia no relacional mediante MongoDB y optimización de almacenamiento mediante GridFS para flujos de datos binarios y mapeo de interacciones.

---

## Arquitectura y Flujo de Datos

El sistema sigue un flujo desacoplado donde la interfaz de usuario de chat nunca se comunica directamente con la lógica de negocio interna ni con los modelos core de lenguaje:

Arquitectura y Flujo de Datos

El sistema sigue un flujo estrictamente desacoplado donde la interfaz de usuario de chat nunca se comunica directamente con la lógica de negocio interna ni con los modelos core de lenguaje. La seguridad perimetral se gestiona mediante un proxy inverso que unifica la entrada al ecosistema.

       [ Cliente / Navegador ]
                  |
                  | HTTP Peticiones Externas (Port 8080)
                  v
       [ Proxy Inverso: NGINX ]
+------------------------------------------+
|  - Enrutamiento unificado de tráfico     |
|  - Ofuscación de puertos internos        |
+--------+------------------------+--------+
         |                        |
         | /v1 o /api             | / (Tráfico Web)
         v                        v
+--------+---------------+ +-------+--------+
| llm-chatbot-integration | |   OpenWebUI    |
|   Gateway (Port 3050)   | | (Port 8080/int)|
+--------+---------------+ +----------------+
         |
         | Peticiones HTTP de Red Interna (Docker network)
         +-----------------------+-----------------------+
                                 |                       |
                                 v                       v
                    +------------+------------+ +--------+---------+
                    |    Core Inference Svc   | | Document Gen Svc |
                    |  (Inferencia Port 5010) | |  (FGS Svc Port 5020)
                    +-------------------------+ +------------------+
Estructura Completa del Proyecto:

El código se organiza en módulos desacoplados para facilitar la escalabilidad horizontal y el mantenimiento del sistema:

llm-chatbot-integration/
├── infra/
│   └── nginx/
│       └── nginx.conf              # Configuración segura y genérica del Proxy Inverso
├── src/
│   ├── config/
│   │   └── environment.js          # Centralización de variables de entorno y prompts genéricos
│   ├── infrastructure/
│   │   └── database/
│   │       └── mongoClient.js      # Conector encapsulado de MongoDB y GridFS (SRP)
│   ├── interfaces/
│   │   └── http/
│   │       ├── controllers/
│   │       │   ├── chatController.js       # Lógica del proxy /v1/chat/completions (Fase 1 y 2)
│   │       │   └── templateController.js   # Gestión de marcado, borrado físico y webhook
│   │       └── routes/
│   │           └── apiRoutes.js            # Enrutador y middleware de Express
│   └── shared/
│       └── utils/
│           └── textNormalizer.js   # Funciones puras de extracción de texto y hashing SHA-256
├── .env.example                    # Plantilla pública para variables de entorno seguro
├── .gitignore                      # Exclusiones estrictas para evitar fugas de credenciales
├── package.json                    # Manifiesto y dependencias de Node.js
└── server.js                       # Inicialización limpia y punto de entrada de la aplicación






