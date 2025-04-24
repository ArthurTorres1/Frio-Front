"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Download, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FormData {
  nomeCliente: string
  equipamento: string
  descricaoServico: string
  cep: string
  uf: string
  cidade: string
  bairro: string
  logradouro: string
  data: string
  total: number
}

export function FormularioServico() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Formatar a data e hora atual para o formato datetime-local (YYYY-MM-DDThh:mm)
  const now = new Date()
  const dataHoraAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

  const [formData, setFormData] = useState<FormData>({
    nomeCliente: "",
    equipamento: "",
    descricaoServico: "",
    cep: "",
    uf: "",
    cidade: "",
    bairro: "",
    logradouro: "",
    data: dataHoraAtual,
    total: 0,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "total" ? Number.parseFloat(value) || 0 : value,
    }))
  }

  const buscarCep = async () => {
    if (formData.cep.length !== 9) return

    try {
      setIsLoading(true)
      const cepLimpo = formData.cep.replace("-", "")
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await response.json()

      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP informado",
          variant: "destructive",
        })
        return
      }

      setFormData((prev) => ({
        ...prev,
        logradouro: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        uf: data.uf,
      }))
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Ocorreu um erro ao buscar o CEP",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "")

    if (value.length > 5) {
      value = value.substring(0, 5) + "-" + value.substring(5, 8)
    }

    setFormData((prev) => ({
      ...prev,
      cep: value.substring(0, 9),
    }))
  }

  const handleCepBlur = () => {
    if (formData.cep.length === 9) {
      buscarCep()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!validateForm()) {
      return
    }

    try {
      setIsLoading(true)
      setPdfUrl(null)

      console.log("Iniciando envio do formulário...")

      // Formatar os dados para o formato esperado pela API
      const formattedData = {
        nomeCliente: formData.nomeCliente,
        equipamento: formData.equipamento,
        descricaoServico: formData.descricaoServico,
        cep: formData.cep.replace("-", ""), // Remover hífen do CEP
        uf: formData.uf,
        cidade: formData.cidade,
        bairro: formData.bairro,
        logradouro: formData.logradouro,
        data: new Date(formData.data).toISOString(), // Converte para ISO string
        total: Number(formData.total),
      }

      console.log("Dados formatados:", formattedData)

      // Mostrar toast de carregamento
      toast({
        title: "Gerando recibo",
        description: "Aguarde enquanto o recibo está sendo gerado...",
      })

      const response = await fetch("https://frio-api.onrender.com/api/Recibos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      })

      console.log("Status da resposta:", response.status)

      if (!response.ok) {
        let errorMsg = `Erro ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          errorMsg = errorData.error || errorMsg
        } catch (e) {
          // Se não conseguir parsear como JSON, usa a mensagem padrão
        }
        throw new Error(errorMsg)
      }

      // Verificar se a resposta é um PDF válido
      const contentType = response.headers.get("content-type")
      console.log("Tipo de conteúdo:", contentType)

      if (!contentType || !contentType.includes("application/pdf")) {
        console.error("Resposta não é um PDF:", contentType)
        try {
          const text = await response.text()
          console.error("Conteúdo da resposta:", text)
          throw new Error("A resposta não é um PDF válido")
        } catch (e) {
          throw new Error("A resposta não é um PDF válido")
        }
      }

      const blob = await response.blob()
      console.log("Tamanho do blob:", blob.size)

      if (blob.size === 0) {
        throw new Error("O PDF gerado está vazio")
      }

      const url = URL.createObjectURL(blob)
      setPdfUrl(url)

      toast({
        title: "Recibo gerado com sucesso!",
        description: "Clique no botão para fazer o download",
      })
    } catch (error: any) {
      console.error("Erro ao gerar recibo:", error)
      setErrorMessage(error.message || "Erro ao gerar o recibo")
      toast({
        title: "Erro ao gerar recibo",
        description: error.message || "Ocorreu um erro ao gerar o recibo. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const validateForm = () => {
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
    ]

    for (const field of requiredFields) {
      if (!formData[field as keyof FormData]) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha todos os campos obrigatórios",
          variant: "destructive",
        })
        return false
      }
    }

    if (formData.total <= 0) {
      toast({
        title: "Valor inválido",
        description: "O valor total deve ser maior que zero",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  return (
    <Card className="bg-white shadow-lg border-[#B9DDFF]">
      <CardHeader className="bg-[#B9DDFF] text-[#FF6B1D]">
        <CardTitle className="text-center">Formulário de Serviço</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#FF6B1D]">Informações do Cliente</h3>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="nomeCliente">Nome do Cliente</Label>
                <Input
                  id="nomeCliente"
                  name="nomeCliente"
                  value={formData.nomeCliente}
                  onChange={handleInputChange}
                  placeholder="Nome completo do cliente"
                  className="border-[#B9DDFF] focus:border-[#FF6B1D]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#FF6B1D]">Detalhes do Serviço</h3>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="equipamento">Equipamento</Label>
                <Input
                  id="equipamento"
                  name="equipamento"
                  value={formData.equipamento}
                  onChange={handleInputChange}
                  placeholder="Modelo e capacidade do equipamento"
                  className="border-[#B9DDFF] focus:border-[#FF6B1D]"
                />
              </div>
              <div>
                <Label htmlFor="descricaoServico">Descrição do Serviço</Label>
                <Textarea
                  id="descricaoServico"
                  name="descricaoServico"
                  value={formData.descricaoServico}
                  onChange={handleInputChange}
                  placeholder="Descreva o serviço realizado"
                  className="border-[#B9DDFF] focus:border-[#FF6B1D]"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#FF6B1D]">Endereço</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  name="cep"
                  value={formData.cep}
                  onChange={handleCepChange}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  maxLength={9}
                  className="border-[#B9DDFF] focus:border-[#FF6B1D]"
                />
              </div>
              <div>
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input
                  id="logradouro"
                  name="logradouro"
                  value={formData.logradouro}
                  onChange={handleInputChange}
                  placeholder="Rua, Avenida, etc."
                  className="border-[#B9DDFF] focus:border-[#FF6B1D]"
                />
              </div>
              <div>
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  name="bairro"
                  value={formData.bairro}
                  onChange={handleInputChange}
                  placeholder="Bairro"
                  className="border-[#B9DDFF] focus:border-[#FF6B1D]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleInputChange}
                    placeholder="Cidade"
                    className="border-[#B9DDFF] focus:border-[#FF6B1D]"
                  />
                </div>
                <div>
                  <Label htmlFor="uf">UF</Label>
                  <Input
                    id="uf"
                    name="uf"
                    value={formData.uf}
                    onChange={handleInputChange}
                    placeholder="UF"
                    maxLength={2}
                    className="border-[#B9DDFF] focus:border-[#FF6B1D]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#FF6B1D]">Informações Adicionais</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="data">Data e Hora do Serviço</Label>
                <Input
                  id="data"
                  name="data"
                  type="datetime-local"
                  value={formData.data}
                  onChange={handleInputChange}
                  className="border-[#B9DDFF] focus:border-[#FF6B1D]"
                />
              </div>
              <div>
                <Label htmlFor="total">Valor Total (R$)</Label>
                <Input
                  id="total"
                  name="total"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total || ""}
                  onChange={handleInputChange}
                  placeholder="0,00"
                  className="border-[#B9DDFF] focus:border-[#FF6B1D]"
                />
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start gap-2">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Erro ao gerar recibo:</p>
                <p>{errorMessage}</p>
                <p className="text-sm mt-1">
                  Nota: No ambiente de preview, um PDF de exemplo será gerado para demonstração.
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4 justify-between bg-gray-50 border-t border-[#B9DDFF] p-6">
          {pdfUrl ? (
            <div className="w-full flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="text-green-600 font-medium">Recibo gerado com sucesso!</div>
              <a
                href={pdfUrl}
                download={`recibo-${formData.nomeCliente}.pdf`}
                className="flex items-center gap-2 bg-[#FF6B1D] hover:bg-[#e55e10] text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                <Download size={18} />
                Baixar Recibo
              </a>
            </div>
          ) : (
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto bg-[#FF6B1D] hover:bg-[#e55e10] text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando recibo...
                </>
              ) : (
                "Gerar Recibo"
              )}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
