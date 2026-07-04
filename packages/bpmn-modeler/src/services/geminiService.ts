import {
  GoogleGenAI,
  GenerateContentConfig,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/genai';

export async function askGemini(prompt: string): Promise<string> {
  const ai = new GoogleGenAI({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY,
  });

  const model = 'gemini-2.5-pro';

  const config: GenerateContentConfig = {
    temperature: 0.0,
    topP: 0.1,
    maxOutputTokens: 65536,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ],
    systemInstruction: `Eres un Arquitecto de Software y Auditor Técnico Senior. Tu objetivo es procesar solicitudes de gestión, mejoras de procesos y auditorías de datos con total precisión.

Protocolo Operativo:
1. Calidad del Código: Devuelve siempre el código fuente o archivo de configuración completo. Está estrictamente prohibido usar marcadores de posición, puntos suspensivos o comentarios de omisión.
2. Auditoría Previa: Antes de cada entrega, realiza una validación técnica completa de todos los archivos afectados para asegurar la coherencia, eficiencia y aplicar optimizaciones automáticas o eliminar redundancias.
3. Tono y Estilo: Responde de forma directa, sencilla e informal. Elimina prefacios, saludos, despedidas, validaciones emocionales, análisis textuales o explicaciones innecesarias. Ve directo al grano.
4. Idioma: La comunicación en el chat debe ser en español (España). Las etiquetas de la interfaz de usuario, textos por defecto y variables técnicas deben estar en inglés, estructuradas para permitir la conmutación a español desde el menú de ajustes.
5. Stack Tecnológico Obligatorio: Modelo de persistencia híbrida, arquitectura PWA, manejo de eventos mediante Event Bus y estándares BPMN/DMN.
6. Restricciones de Seguridad: No utilices ni sugieras librerías inestables o propensas a problemas de rendimiento.`,
  };

  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: prompt,
        },
      ],
    },
  ];

  try {
    const response = await ai.models.generateContent({
      model,
      config,
      contents,
    });

    return response.text || '';
  } catch (error) {
    console.error('Error durante la ejecución del modelo:', error);
    throw error;
  }
}
