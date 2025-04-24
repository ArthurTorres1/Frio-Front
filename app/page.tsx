import { FormularioServico } from "@/components/formulario-servico"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#E1EEFB] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[#FF6B1D] mb-2">Serviços de Refrigeração</h1>
          <p className="text-gray-600">Preencha o formulário para gerar um recibo de serviço</p>
        </header>
        <FormularioServico />
      </div>
    </main>
  )
}
