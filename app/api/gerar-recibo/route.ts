import { type NextRequest, NextResponse } from "next/server"

// Função para verificar se estamos em ambiente de desenvolvimento
const isDevelopment = () => {
  return process.env.NODE_ENV === "development"
}

export async function POST(request: NextRequest) {
  try {
    console.log("API route: Recebendo requisição")
    const data = await request.json()
    console.log("Dados recebidos:", data)

    // Validar os dados recebidos
    const requiredFields = [
      "nomeCliente",
      "equipamento",
      "descricaoServico",
      "cep",
      "uf",
      "cidade",
      "bairro",
      "logradouro",
      "data",
      "total",
    ]

    for (const field of requiredFields) {
      if (!data[field]) {
        console.error(`Campo obrigatório ausente: ${field}`)
        return NextResponse.json({ error: `Campo obrigatório: ${field}` }, { status: 400 })
      }
    }

    // Em ambiente de desenvolvimento, tenta chamar a API local
    if (isDevelopment()) {
      try {
        console.log("Ambiente de desenvolvimento: Chamando API local")
        console.log("Chamando API externa: http://localhost:5207/api/Recibos")

        const apiResponse = await fetch("http://localhost:5207/api/Recibos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })

        console.log("Status da resposta da API externa:", apiResponse.status)

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text()
          console.error("Erro da API externa:", errorText)
          throw new Error(`API retornou status ${apiResponse.status}: ${errorText}`)
        }

        // Verificar o tipo de conteúdo da resposta
        const contentType = apiResponse.headers.get("content-type")
        console.log("Tipo de conteúdo da resposta:", contentType)

        // Supondo que sua API retorne um PDF como array de bytes
        const pdfBytes = await apiResponse.arrayBuffer()
        console.log("Tamanho do PDF recebido:", pdfBytes.byteLength)

        if (pdfBytes.byteLength === 0) {
          console.error("API retornou um PDF vazio")
          throw new Error("API retornou um PDF vazio")
        }

        console.log("Retornando PDF da API local para o cliente")
        // Retornar o PDF como um arquivo para download
        return new NextResponse(pdfBytes, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="recibo-${data.nomeCliente}.pdf"`,
          },
        })
      } catch (error: any) {
        console.warn("Erro ao chamar API local:", error.message)
        console.log("Usando PDF de teste como fallback")
        // Continua para usar o PDF mock como fallback
      }
    } else {
      console.log("Ambiente de produção/preview: Usando PDF mock")
    }

    // Em ambiente de produção/preview ou se a API local falhar, usa o PDF mock
    console.log("Gerando PDF mock para demonstração")

    // Usando um PDF de exemplo público para testes
    const mockPdfResponse = await fetch("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf")

    if (!mockPdfResponse.ok) {
      throw new Error(`Erro ao buscar PDF mock: ${mockPdfResponse.status}`)
    }

    const mockPdfBytes = await mockPdfResponse.arrayBuffer()

    console.log("Tamanho do PDF mock:", mockPdfBytes.byteLength)

    return new NextResponse(mockPdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="recibo-${data.nomeCliente}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error("Erro ao processar a requisição:", error)
    return NextResponse.json({ error: `Erro ao gerar o recibo: ${error.message}` }, { status: 500 })
  }
}
