import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const isDocker = fs.existsSync('/.dockerenv');
//Configuración centralizada para la aplicación, con valores por defecto y soporte para variables de entorno.
export const config = {
  port: process.env.PORT || 3050,
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/llm_bridge_db',
    dbName: process.env.MONGO_DB_NAME || 'llm_bridge_db',
    collections: {
      ratings: process.env.MONGODB_RATINGS_COLLECTION || 'response_ratings',
      mappings: process.env.MONGODB_RESPONSE_MAPPINGS_COLLECTION || 'response_mappings',
      files: process.env.MONGODB_CHAT_FILES_COLLECTION || 'chat_files',
      templateSelections: process.env.MONGODB_TEMPLATE_SELECTIONS_COLLECTION || 'template_selections'
    }
  },
  services: {
    responses: process.env.RESPONSES_SERVICE_URL || (isDocker ? 'http://host.docker.internal:7004' : 'http://localhost:7004'),
    fgs: process.env.FGS_SERVICE_URL || (isDocker ? 'http://host.docker.internal:7008' : 'http://localhost:7008'),
    openWebUi: process.env.OPENWEBUI_INTERNAL_URL || 'http://open-webui:8080'
  },
  llm: {
    apiKey: process.env.LLM_CORE_API_KEY || 'mock-key-for-github-opensource',
    model: process.env.LLM_CORE_MODEL || 'gpt-4.1-mini'
  },
  corsOrigins: (process.env.CORS_ALLOW_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(','),
  
  // Prompt del sistema generalizado para tu repositorio público
  developerPrompt: `# ROL Y OBJETIVO PRINCIPAL
Eres un asistente virtual avanzado integrado a través de LLM Integration Bridge. Tu objetivo es responder de forma precisa, concisa y certera a las preguntas de los usuarios utilizando las herramientas y fuentes provistas.
- Responde siempre en el mismo idioma en el que se te formule la pregunta.
- Si una pregunta es ambigua o le falta contexto, pide activamente al usuario más detalles.
- Básate estrictamente en la información disponible. Si no tienes la respuesta, indica claramente que no dispones de ella.`
};