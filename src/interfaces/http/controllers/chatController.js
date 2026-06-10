import fetch from 'node-fetch'; // Nota: Si usas Node 18+, puedes usar el global fetch directamente
import { config } from '../../../config/environment.js';
import { mongoDatabase } from '../../../infrastructure/database/mongoClient.js';
import { normalizeMessageContent, getLatestUserMessage, buildTextKey } from '../../../shared/utils/textNormalizer.js';

export const proxyChatCompletion = async (req, res) => {
  try {
    const { messages = [], temperature = 1 } = req.body;
    const userMessage = getLatestUserMessage(messages);

    if (!userMessage || messages.length === 0) {
      return res.status(400).json({ error: 'Mensajes no válidos o vacíos.' });
    }

    // 1. Instanciar conversación en el Responses Service
    const headers = {
      'Authorization': config.llm.apiKey,
      'Content-Type': 'application/json'
    };

    const convRes = await fetch(`${config.services.responses}/assistant/responses/conversations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        items: { contentRoleDeveloper: config.developerPrompt },
        metadata: { user: 'GH-OpenWebUI', platform: 'OpenWebUI' }
      })
    });
    const convData = await convRes.json();

    // 2. Ejecutar inferencia en el motor Core
    const normalizedHistory = messages
      .filter(msg => ['user', 'assistant'].includes(msg.role))
      .map(msg => ({ role: msg.role, content: normalizeMessageContent(msg.content) }));

    const respPayload = {
      model: config.llm.model,
      input: normalizedHistory,
      conversation: convData.id,
      config: {
        temperature,
        tools: [
          { type: "file_search", vector_store_ids: ["vs_generic_store_id"], max_num_results: 10 },
          { type: "web_search", search_context_size: "medium" }
        ],
        context_management: [{ type: "compaction", compact_threshold: 12000 }],
        metadata: { user: 'GH-OpenWebUI', platform: 'OpenWebUI' }
      }
    };

    const coreRes = await fetch(`${config.services.responses}/assistant/responses`, {
      method: 'POST',
      headers,
      body: JSON.stringify(respPayload)
    });
    
    const coreData = await coreRes.json();
    const botResponse = coreData.output?.text;
    const responseId = coreData.id;

    // 3. Persistir mapeo asíncronamente en MongoDB
    const contentKey = buildTextKey(botResponse);
    if (contentKey) {
      const db = mongoDatabase.getDb();
      await db.collection(config.mongo.collections.mappings).insertOne({
        response_id: responseId,
        chat_completion_id: `chatcmpl-${responseId}`,
        assistant_content_key: contentKey,
        assistant_content: botResponse,
        user_message: userMessage,
        model: 'atenai-bridge',
        created_at: new Date()
      });
    }

    // Retornar formato estándar compatible con clientes OpenAI / OpenWebUI
    return res.status(200).json({
      id: `chatcmpl-${responseId}`,
      response_id: responseId,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "atenai-bridge",
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: botResponse,
          response_id: responseId
        },
        finish_reason: "stop"
      }]
    });

  } catch (error) {
    console.error('❌ Error crítico en proxyChatCompletion:', error);
    return res.status(500).json({ error: 'Error de comunicación con los servicios core internos.' });
  }
};