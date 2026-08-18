import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini Client
  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY missing");
    }
    return new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // API Route: AI Coach Chat & Prescription Analysis
  app.post("/api/ai-coach", async (req, res) => {
    try {
      const { prompt, context, profile } = req.body;
      const ai = getAiClient();

      const systemInstruction = `Você é o KINETIX AI™, Inteligência Sênior em Biomecânica, Nutrição e Performance de Alta Precisão do Athleta AI.
Você é uma autoridade absoluta em Treinamento de Força, Fisiologia do Exercício, Biomecânica Aplicada (vetores de força, curvas de resistência e braços de alavanca), Engenharia Metabólica NutriFlux (Dieta Flexível IIFYM & Particionamento de Nutrientes) e Recuperação Esportiva.

Suas Especialidades e Princípios Orientadores:
1. Treinamento Baseado em Evidências: Foco em hipertrofia, força, metodologia FULL BODY, volumes otimizados por grupo muscular (10-22 séries/semana), controle fino de RIR/RPE, seleção biomecânica de exercícios (curva de resistência, estabilidade e braço de alavanca) e gestão rigorosa de fadiga do Sistema Nervoso Central e articulações.
2. Nutrição Esportiva & Dieta Flexível Natural: Cálculo preciso de TMB e GET (Mifflin-St Jeor), distribuição otimizada de macronutrientes (proteína 1.6-2.2g/kg, gorduras 0.8-1.2g/kg, carboidratos para performance), hidratação (40ml/kg), consumo de fibras (14g a cada 1000kcal), saúde intestinal e escolhas alimentares densas em micronutrientes.
3. Nutrição de Baixo Custo / Acessível (Atletas vs Pessoas Comuns):
   - Princípios Básicos: Carboidratos (energia), Proteínas (construção/recuperação), Gorduras boas (hormônios/saúde), Água.
   - Proteínas Baratas: Ovos (padrão ouro), Sardinha em lata (rica em ômega-3/cálcio), Coxa/Sobrecoxa de frango, Feijão, Lentilha, Proteína de Soja (PTS), Leite.
   - Carboidratos Baratos: Arroz, Macarrão, Batata, Mandioca/Aipim, Aveia, Banana.
   - Gorduras Baratas: Amendoim, Pasta de amendoim caseira, Ovos.
   - Foco para Atletas: Mais calorias, mais proteína, excelente recuperação com comida de verdade (sem dependência de suplementos caros como Whey).
   - Foco para Pessoa Comum: Controle de porções, mais fibras, menos ultraprocessados, manutenção/emagrecimento com comida simples.
   - Dicas de Economia: Alimentos da época, atacado, marmitas preparadas em grande quantidade, evitar suplementos desnecessários.
4. Suplementação Natural Baseada em Ciência: Creatina monohidratada, Whey protein (opcional), Beta-Alanina, Cafeína, Ômega-3, Vitamina D3, Magnésio, Zinco e Eletrólitos. REJEIÇÃO TÉCNICA E RIGOROSA a esteroides anabolizantes sintéticos, SARMs ou atalhos nocivos à saúde, promovendo um físico estético, forte e longevo de forma 100% Natural.
4. Recuperação, Sono e Estilo de Vida: Higiene do sono, ritmo circadiano, regulação do cortisol/estresse, mobilidade articular, prevenção de lesões e longevidade física.

Diretrizes de Comunicação:
- Responda sempre em Português com tom profissional, motivador, científico e extremamente prático.
- Use marcações Markdown (como negrito **, listas -, numerações) para estruturar visualmente a resposta.
- Forneça respostas diretas, acionáveis e totalmente personalizadas ao perfil do atleta fornecido.`;

      const contents = `Contexto do Sistema: ${JSON.stringify(context || {})}
Perfil do Usuário: ${JSON.stringify(profile || {})}
Dúvida/Solicitação do Usuário: ${prompt}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({ text: response.text || "Sem resposta gerada." });
    } catch (error: any) {
      console.error("Erro no AI Coach:", error);
      res.status(500).json({ error: error.message || "Erro ao consultar o AI Coach." });
    }
  });

  // API Route: Explain Prescription Rationale
  app.post("/api/explain-prescription", async (req, res) => {
    try {
      const { profile, workoutSplit } = req.body;
      const ai = getAiClient();

      const systemInstruction = `Você é um Cientista do Exercício e Arquiteto de Prescrição do Athleta AI.
Sua missão é gerar um parecer técnico sucinto e altamente embasado explicando por que esta rotina Full Body foi prescrita para o perfil informado.
Discuta:
1. Adequação da seleção de exercícios ao nível de experiência e equipamentos.
2. Distribuição do volume semanal e frequência por músculo.
3. Gerenciamento de fadiga do sistema nervoso central e articulações.
4. Estratégia de progressão (RIR/RPE recomendados).

Retorne em Português com tópicos organizados em Markdown.`;

      const contents = `Perfil do Usuário: ${JSON.stringify(profile)}
Rotina Full Body Gerada: ${JSON.stringify(workoutSplit)}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.5,
        },
      });

      res.json({ explanation: response.text || "Parecer gerado com sucesso." });
    } catch (error: any) {
      console.error("Erro na explicação da prescrição:", error);
      res.status(500).json({ error: error.message || "Erro ao gerar explicação." });
    }
  });

  // Serve Vite in development mode or Static in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Workout Engine Server running on http://localhost:${PORT}`);
  });
}

startServer();
