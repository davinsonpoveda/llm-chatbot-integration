import { mongoDatabase } from '../../../infrastructure/database/mongoClient.js';
import { config } from '../../../config/environment.js';
import { pickFirstValue } from '../../../shared/utils/textNormalizer.js';
import fetch from 'node-fetch';

/**
 * Sincroniza el estado del mensaje seleccionado para armado de plantillas
 */
export const markMessageForTemplate = async (req, res) => {
  try {
    const { message_id, selected, content } = req.body;
    const cleanId = message_id.trim();
    const pureResponseId = cleanId.replace("chatcmpl-", "");
    const db = mongoDatabase.getDb();

    const updateData = {
      $set: { seleccionado_para_plantilla: selected, updated_at: new Date() }
    };

    let result = await db.collection(config.mongo.collections.mappings).updateOne(
      { $or: [{ chat_completion_id: cleanId }, { response_id: pureResponseId }] },
      updateData
    );

    if (result.matchedCount === 0 && content) {
      result = await db.collection(config.mongo.collections.mappings).updateOne(
        { assistant_content: { $regex: content.trim().substring(0, 50), $options: 'i' } },
        updateData
      );
    }

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "No se localizó el mensaje objetivo para marcar." });
    }

    return res.status(200).json({ ok: true, message: "Mensaje modificado con éxito." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Genera el documento Word invocando recursivamente al microservicio FGS
 */
export const generateDocumentFromSelected = async (req, res) => {
  try {
    const { chat_id, template_name, file_name, section_assignments, edited_contents } = req.body;
    let normalizedName = file_name?.trim() || "documento_generado.docx";
    if (!normalizedName.endsWith(".docx")) normalizedName += ".docx";

    if (!chat_id || !template_name || !section_assignments) {
      return res.status(400).json({ error: "Parámetros insuficientes para procesar FGS." });
    }

    const fileContent = [];
    const db = mongoDatabase.getDb();

    for (const [messageId, sectionName] of Object.entries(section_assignments)) {
      if (!sectionName) continue;

      const dbDoc = await db.collection(config.mongo.collections.templateSelections).findOne({
        chat_id: chat_id.trim(),
        openwebui_message_id: messageId
      });

      const textOriginal = dbDoc?.content ? dbDoc.content.trim() : (edited_contents?.[messageId]?.trim() || "");
      if (!textOriginal) continue;

      fileContent.push({ section_name: sectionName, section_content: textOriginal });

      // Actualizar metadatos de entrenamiento de forma asíncrona
      db.collection(config.mongo.collections.templateSelections).updateOne(
        { chat_id: chat_id.trim(), openwebui_message_id: messageId },
        {
          $set: {
            assigned_marker: sectionName,
            template_used: template_name,
            seleccionado_para_plantilla: true,
            ready_for_training: true,
            updated_at: new Date()
          }
        },
        { upsert: false }
      ).catch(err => console.log("Non-blocking DB writing err:", err));
    }

    if (fileContent.length === 0) {
      return res.status(400).json({ error: "El set enviado no recuperó ningún bloque textual válido." });
    }

    // Delegación HTTP directa a la capa de File Generation Service
    const fgsResponse = await fetch(`${config.services.fgs}/assistant/file-generation/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_name, file_name: normalizedName, file_content: fileContent })
    });

    if (!fgsResponse.ok) {
      const errText = await fgsResponse.text();
      return res.status(fgsResponse.status).end(errText);
    }

    const binaryBuffer = await fgsResponse.arrayBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(normalizedName)}`);
    return res.send(Buffer.from(binaryBuffer));

  } catch (error) {
    return res.status(500).json({ error: `Fallo crítico en subservicio Bridge FGS: ${error.message}` });
  }
};