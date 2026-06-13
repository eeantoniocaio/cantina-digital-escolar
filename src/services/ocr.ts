import Tesseract from 'tesseract.js';

export interface OCRResult {
  pagador: string;
  valor: number;
  data: string;
  id_transacao: string;
  sucesso: boolean;
  mensagem?: string;
}

export class OCRService {
  /**
   * Analisa um comprovante Pix real usando Tesseract.js (OCR local)
   */
  static async analisarComprovante(fileInput: File | string): Promise<OCRResult> {
    try {
      // 1. Processar OCR no arquivo de imagem
      const result = await Tesseract.recognize(
        fileInput,
        'por', // Português
        {
          logger: m => console.log("[OCR Progress]", m.status, Math.round(m.progress * 100) + "%")
        }
      );

      const text = result.data.text;
      console.log("[OCR RAW TEXT]:\n", text);

      // 2. Parser inteligente de texto do comprovante
      return this.parsePixText(text);
    } catch (error: any) {
      console.error("[OCR ERROR]:", error);
      return {
        pagador: "",
        valor: 0,
        data: "",
        id_transacao: "",
        sucesso: false,
        mensagem: "Erro ao ler a imagem. Por favor, preencha as informações manualmente."
      };
    }
  }

  /**
   * Analisa o texto bruto extraído pelo OCR e encontra os campos do PIX
   */
  private static parsePixText(text: string): OCRResult {
    // Normaliza o texto (quebra em linhas, remove espaços extras)
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let valor = 0;
    let pagador = "";
    let id_transacao = "";
    let data = new Date().toISOString();

    // 1. EXTRAÇÃO DO VALOR
    // Procura por "R$ 45,00", "R$45.00", etc.
    const regexValorR$ = /R\$\s*(\d+[\d.,]*)/i;
    let match = text.match(regexValorR$);
    if (match) {
      const cleanVal = match[1].replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(cleanVal);
      if (!isNaN(parsed)) valor = parsed;
    }

    // Se não encontrou valor com R$, procura por qualquer padrão de centavos "45,00"
    if (valor === 0) {
      const regexDecimal = /(\d+,\d{2})/g;
      const matches = text.match(regexDecimal);
      if (matches) {
        // Pega o maior valor encontrado ou o primeiro
        for (const m of matches) {
          const parsed = parseFloat(m.replace(',', '.'));
          if (!isNaN(parsed) && parsed > valor) {
            valor = parsed;
          }
        }
      }
    }

    // 2. EXTRAÇÃO DO ID DE TRANSAÇÃO (E2E ID do PIX)
    // Ex: ID: E0000000020260430011646278829155
    const regexIdTransacao = /\b(E\d{9,}[a-zA-Z0-9]*)\b/i;
    const matchId = text.match(regexIdTransacao);
    if (matchId) {
      id_transacao = matchId[1].trim();
    }

    // 3. EXTRAÇÃO DO PAGADOR (Ignorando Recebedor)
    // Em comprovantes BB/Santander/Itaú:
    // "Pagador"
    // "Andre Luis A Avancini"
    let recebedorName = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();

      // Identifica o recebedor para não confundir com o pagador
      if (line.includes("recebedor") || line.includes("pago a")) {
        // O nome do recebedor geralmente está na linha seguinte ou 2 linhas depois
        for (let j = 1; j <= 2; j++) {
          if (lines[i + j] && !lines[i + j].includes(":") && !lines[i + j].toLowerCase().includes("cpf") && lines[i + j].length > 4) {
            recebedorName = lines[i + j];
            break;
          }
        }
      }

      // Identifica o pagador
      if (line.includes("pagador") || line.includes("pago por") || line.includes("nome do pagador")) {
        // Procura nas próximas 3 linhas um nome válido (que não contenha CPF, CNPJ, Agência, Conta ou pontuações)
        for (let j = 1; j <= 3; j++) {
          const nextLine = lines[i + j];
          if (
            nextLine &&
            !nextLine.includes(":") &&
            !nextLine.toLowerCase().includes("cpf") &&
            !nextLine.toLowerCase().includes("cnpj") &&
            !nextLine.toLowerCase().includes("agencia") &&
            !nextLine.toLowerCase().includes("conta") &&
            !nextLine.toLowerCase().includes("instituição") &&
            nextLine.length > 5
          ) {
            // Verifica se não é o recebedor
            if (recebedorName && nextLine.toLowerCase() === recebedorName.toLowerCase()) {
              continue;
            }
            pagador = nextLine;
            break;
          }
        }
      }
    }

    // Fallback do Pagador: se não achou "Pagador", mas achou duas seções de nomes, tenta inferir
    if (!pagador) {
      // Encontra linhas que parecem nomes de pessoas (letras maiúsculas e sem números ou símbolos)
      const namePattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-zA-Z]*)+$/;
      const potentialNames = lines.filter(l => namePattern.test(l) && !l.toLowerCase().includes("comprovante") && !l.toLowerCase().includes("banco"));
      
      if (potentialNames.length > 0) {
        // Se achou o recebedor e o pagador (geralmente recebedor vem antes)
        if (potentialNames.length >= 2) {
          pagador = potentialNames[1]; // O pagador costuma ser o segundo
        } else {
          pagador = potentialNames[0];
        }
      }
    }

    // 4. EXTRAÇÃO DA DATA
    const regexData = /(\d{2}\/\d{2}\/\d{4})/;// DD/MM/AAAA
    const matchData = text.match(regexData);
    if (matchData) {
      // Tenta criar data válida
      const parts = matchData[1].split('/');
      const parsedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      if (!isNaN(parsedDate.getTime())) {
        data = parsedDate.toISOString();
      }
    }

    const sucesso = valor > 0 || pagador.length > 0 || id_transacao.length > 0;

    return {
      pagador: pagador || "Não identificado",
      valor: valor || 0,
      data,
      id_transacao,
      sucesso,
      mensagem: sucesso ? undefined : "OCR concluído, mas nenhum dado do PIX pôde ser extraído automaticamente."
    };
  }

  /**
   * Função para gerar hash SHA256 fictício do arquivo para controle de duplicidade
   */
  static async calcularHashArquivo(file: File): Promise<string> {
    const rawString = `${file.name}-${file.size}-${file.type}`;
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
      const char = rawString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'sha255-' + Math.abs(hash).toString(16).padStart(8, '0');
  }
}
